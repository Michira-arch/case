import { NextResponse } from 'next/server';
import { getAiClient } from '@/lib/ai/client';
import { aiTools, executeAiTool } from '@/lib/ai/tools';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { messages, orgId } = await req.json();
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const { client, model } = await getAiClient(orgId);

    const response = await client.chat.completions.create({
      model,
      messages,
      tools: aiTools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      messages.push(responseMessage); // Add assistant message with tool calls

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        try {
          const functionResult = await executeAiTool(functionName, functionArgs, orgId);
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(functionResult),
          });
        } catch (error: any) {
          messages.push({
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
        messages,
      });

      return NextResponse.json({ message: secondResponse.choices[0].message });
    }

    return NextResponse.json({ message: responseMessage });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
