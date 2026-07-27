import OpenAI from 'openai';
import webpush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}


export const aiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_agency_stats',
      description: "Fetch the agency's workers, bookings, or revenue stats.",
      parameters: {
        type: 'object',
        properties: {
          stat_type: {
            type: 'string',
            enum: ['workers', 'bookings', 'revenue'],
            description: 'The type of statistic to retrieve.'
          }
        },
        required: ['stat_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: 'Save a memory for the AI copilot to remember later.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The memory content to save.'
          }
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'retrieve_memories',
      description: 'Retrieve saved memories for the AI copilot.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Optional query to filter memories. If empty, retrieves recent memories.'
          }
        }
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_action',
      description: 'Propose an action by inserting it into the action inbox.',
      parameters: {
        type: 'object',
        properties: {
          action_type: {
            type: 'string',
            enum: ['SEND_EMAIL', 'INVOICE_CLIENT'],
            description: 'The type of action to propose.'
          },
          payload: {
            type: 'object',
            description: 'The payload for the action. For SEND_EMAIL, needs to, subject, body. For INVOICE_CLIENT, needs client_id, amount, description.',
            additionalProperties: true
          }
        },
        required: ['action_type', 'payload'],
      },
    },
  }
];

export async function executeAiTool(name: string, args: any, orgId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = createClient();

  switch (name) {
    case 'get_agency_stats': {
      if (args.stat_type === 'workers') {
        const { count } = await supabase.from('nanny_workers').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
        return { workers_count: count };
      } else if (args.stat_type === 'bookings') {
        const { count } = await supabase.from('nanny_bookings').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
        return { bookings_count: count };
      } else if (args.stat_type === 'revenue') {
        // Mock revenue
        return { revenue_mtd: 5000 };
      }
      return { error: 'Unknown stat_type' };
    }
    case 'save_memory': {
      const { error } = await supabase.from('nanny_ai_memories').insert({
        org_id: orgId,
        content: args.content,
        created_at: new Date().toISOString()
      });
      if (error) throw new Error(error.message);
      return { success: true };
    }
    case 'retrieve_memories': {
      const { data, error } = await supabase
        .from('nanny_ai_memories')
        .select('content, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return { memories: data };
    }
    case 'propose_action': {
      const { error } = await supabase.from('nanny_action_inbox').insert({
        org_id: orgId,
        action_type: args.action_type,
        payload: args.payload,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      if (error) throw new Error(error.message);
      
      const { data: subs } = await supabase
        .from('nanny_push_subscriptions')
        .select('subscription_json')
        .eq('org_id', orgId);

      if (subs && subs.length > 0) {
        const payload = JSON.stringify({
          title: 'New Action Proposed',
          body: `An action of type ${args.action_type} was proposed by the Copilot.`,
        });

        for (const sub of subs) {
          try {
            await webpush.sendNotification(sub.subscription_json, payload);
          } catch (pushErr) {
            console.error('Push notification failed for sub', pushErr);
          }
        }
      }

      return { success: true, action_type: args.action_type };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

