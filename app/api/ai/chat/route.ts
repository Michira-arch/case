export const dynamic = 'force-dynamic';
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
      .select('*')
      .eq('id', orgId)
      .single();

    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    // Fetch shared memories
    const { data: memories } = await supabase
      .from('nanny_ai_memories')
      .select('memory_text')
      .eq('org_id', orgId);

    const memoryBullets = memories && memories.length > 0 
      ? '\n\nShared Memories / Core Preferences:\n' + memories.map((m: any) => '- ' + m.memory_text).join('\n')
      : '';

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
- Matching Mode: ${org.policy?.matching_mode}
- Payout Cadence: ${org.policy?.payout_cadence}

Strict Restrictions:
- Do NOT invent or hallucinate information about workers, clients, or bookings. Use your tools to fetch data.
- If you don't know something or cannot find it via tools, explicitly say "I don't know".
- Be concise and professional, but slightly conversational (vibe coding).
- Format output clearly.${memoryBullets}`;

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

    let finalMessage = response.choices[0].message;
    let iteration = 0;
    const MAX_ITERATIONS = 7;

    while (finalMessage.tool_calls && iteration < MAX_ITERATIONS) {
      iteration++;
      fullMessages.push(finalMessage); // Add assistant message with tool calls

      for (const toolCall of finalMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const functionName = toolCall.function.name;
        
        let functionArgs = {};
        try {
          functionArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        } catch (e) {
          console.warn('Failed to parse tool arguments', toolCall.function.arguments);
        }

        try {
          const functionResult = await executeAiTool(functionName, functionArgs, orgId);
          fullMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: typeof functionResult === 'string' ? functionResult : JSON.stringify(functionResult),
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

      // Next call to get final response or another tool call
      const nextResponse = await client.chat.completions.create({
        model,
        messages: fullMessages,
        tools: aiTools,
        tool_choice: 'auto',
      });
      finalMessage = nextResponse.choices[0].message;
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
