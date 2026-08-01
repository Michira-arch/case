import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAiClient } from '@/lib/ai/client';
import { aiTools, executeAiTool } from '@/lib/ai/tools';
import { createServiceClient } from '@/lib/supabase/server';
import webpush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    // Fetch active cron jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('nanny_ai_cron_jobs')
      .select('*')
      .eq('is_active', true);

    if (jobsError) {
      throw new Error(jobsError.message);
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, message: 'No active jobs' });
    }

    const results = [];

    for (const job of jobs) {
      try {
        const { client, model } = await getAiClient(job.org_id);

        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'You are an AI assistant running as a cron job. Evaluate the prompt and propose actions if necessary.' },
            { role: 'user', content: job.prompt }
          ],
          tools: aiTools,
          tool_choice: 'auto',
        });

        const responseMessage = response.choices[0].message;

        let actionsProposed = 0;

        if (responseMessage.tool_calls) {
          for (const toolCall of responseMessage.tool_calls) {
            if (toolCall.type !== 'function') continue;
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            await executeAiTool(functionName, functionArgs, job.org_id);
            if (functionName === 'propose_action') {
              actionsProposed++;
            }
          }
        }

        // Notify that cron job finished
        const { data: subs } = await supabase
          .from('nanny_push_subscriptions')
          .select('endpoint, keys')
          .eq('org_id', job.org_id);

        if (subs && subs.length > 0) {
          const payload = JSON.stringify({
            title: 'Cron Job Finished',
            body: `Scheduled task completed. Actions proposed: ${actionsProposed}.`,
          });

          for (const sub of subs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload
              );
            } catch (pushErr) {
              console.error('Push notification failed for sub', pushErr);
            }
          }
        }

        results.push({ jobId: job.id, status: 'success', actionsProposed });

      } catch (jobError: any) {
        console.error(`Error running job ${job.id}:`, jobError);
        results.push({ jobId: job.id, status: 'error', error: jobError.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Cron API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
