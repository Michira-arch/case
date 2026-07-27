import { NextResponse } from 'next/server';
import { getAiClient } from '@/lib/ai/client';
import { aiTools, executeAiTool } from '@/lib/ai/tools';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });

    const supabase = createClient();
    const { data: history, error } = await supabase
      .from('nanny_ai_chat_history')
      .select('role, content')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })
      .limit(50); // Get last 50 messages to keep context window reasonable

    if (error) throw error;

    return NextResponse.json({ messages: history || [] });
  } catch (error: any) {
    console.error('Chat API GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { messages, orgId } = await req.json();
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const supabase = createClient();
    
    // Fetch org details for the system prompt
    const { data: org } = await supabase
      .from('nanny_orgs')
      .select('*, policy:nanny_org_policies(*)')
      .eq('id', orgId)
      .single();

    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const { client, model } = await getAiClient(orgId);

    // Save the user's latest message to DB
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      await supabase.from('nanny_ai_chat_history').insert({
        org_id: orgId,
        role: 'user',
        content: lastMessage.content
      });
    }

    // Prepare system prompt with dynamic context
    const systemPrompt = `You are the AI cofounder and copilot for "${org.name}", a caregiving agency located in ${org.location_area || 'Kenya'}. 
Your goal is to assist the admin with coordination, scaling, and managing the agency effortlessly. 
Context:
- Currency: KES (Kenyan Shilling)
- Platform Commission: ${org.policy?.[0]?.platform_commission_pct ?? 0}%
- Matching Mode: ${org.policy?.[0]?.matching_mode}
- Payout Cadence: ${org.policy?.[0]?.payout_cadence}

Strict Restrictions:
- Do NOT invent or hallucinate information about workers, clients, or bookings. Use your tools to fetch data.
- If you don't know something or cannot find it via tools, explicitly say "I don't know".
- Be concise and professional, but slightly conversational (vibe coding).
- Format output clearly.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await client.chat.completions.create({
      model,
      messages: fullMessages,
      tools: aiTools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;
    let finalMessage = responseMessage;

    if (responseMessage.tool_calls) {
      fullMessages.push(responseMessage); // Add assistant message with tool calls

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        try {
          const functionResult = await executeAiTool(functionName, functionArgs, orgId);
          fullMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(functionResult),
          });
        } catch (error: any) {
          fullMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: error.message }),
          });
        }
      }

      // Second call to get final response
      const secondResponse = await client.chat.completions.create({
        model,
        messages: fullMessages,
      });
      finalMessage = secondResponse.choices[0].message;
    }

    // Save AI response to DB
    if (finalMessage.content) {
      await supabase.from('nanny_ai_chat_history').insert({
        org_id: orgId,
        role: 'assistant',
        content: finalMessage.content
      });
    }

    return NextResponse.json({ message: finalMessage });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
