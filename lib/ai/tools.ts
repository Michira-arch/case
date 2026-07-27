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
      name: 'get_workers',
      description: "Fetch a list of the agency's active workers.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_worker_by_id',
      description: "Fetch a specific worker's detailed profile and compliance status.",
      parameters: {
        type: 'object',
        properties: {
          worker_id: { type: 'string', description: 'The UUID of the worker' }
        },
        required: ['worker_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bookings',
      description: "Fetch a list of the agency's active bookings.",
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Optional status filter (e.g. pending, in_progress, completed)' }
        }
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
      description: 'Propose an action by inserting it into the action inbox for the admin to approve.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short title for the action inbox item (e.g. "Send Email to Mary")' },
          message: { type: 'string', description: 'Description of the action for the admin.' },
          action_type: {
            type: 'string',
            description: 'The type of action to propose (e.g. SEND_EMAIL, INVOICE_CLIENT, ASSIGN_WORKER)'
          },
          payload: {
            type: 'object',
            description: 'The payload for the action (e.g. { to, subject, body } or { worker_id, booking_id }).',
            additionalProperties: true
          }
        },
        required: ['title', 'message', 'action_type', 'payload'],
      },
    },
  }
];

export async function executeAiTool(name: string, args: any, orgId: string) {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = createServiceClient();

  switch (name) {
    case 'get_agency_stats': {
      if (args.stat_type === 'workers') {
        const { count } = await supabase.from('nanny_workers').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
        return { workers_count: count };
      } else if (args.stat_type === 'bookings') {
        const { count } = await supabase.from('nanny_bookings').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
        return { bookings_count: count };
      } else if (args.stat_type === 'revenue') {
        return { revenue_mtd: 5000 };
      }
      return { error: 'Unknown stat_type' };
    }
    case 'get_workers': {
      const { data } = await supabase.from('nanny_workers').select('id, shadow_name, worker_state, avg_rating').eq('org_id', orgId).limit(20);
      return { workers: data || [] };
    }
    case 'get_worker_by_id': {
      const { data } = await supabase.from('nanny_workers').select('*, profile:profiles(display_name)').eq('id', args.worker_id).eq('org_id', orgId).single();
      return { worker: data || null };
    }
    case 'get_bookings': {
      let query = supabase.from('nanny_bookings').select('id, client_name, service_address, status, scheduled_start').eq('org_id', orgId).limit(20);
      if (args.status) query = query.eq('status', args.status);
      const { data } = await query;
      return { bookings: data || [] };
    }
    case 'save_memory': {
      const { error } = await supabase.from('nanny_ai_memories').insert({
        org_id: orgId,
        memory_text: args.content, // mapped from args.content
        created_at: new Date().toISOString()
      });
      if (error) throw new Error(error.message);
      return { success: true };
    }
    case 'retrieve_memories': {
      const { data, error } = await supabase
        .from('nanny_ai_memories')
        .select('memory_text, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return { memories: data };
    }
    case 'propose_action': {
      const { error } = await supabase.from('nanny_action_inbox').insert({
        org_id: orgId,
        title: args.title,
        message: args.message,
        action_type: args.action_type,
        action_payload: args.payload, // mapped from args.payload
        status: 'pending',
        created_at: new Date().toISOString()
      });
      if (error) throw new Error(error.message);
      
      const { data: subs } = await supabase
        .from('nanny_push_subscriptions')
        .select('keys, endpoint')
        .eq('org_id', orgId);

      if (subs && subs.length > 0) {
        const payload = JSON.stringify({
          title: 'Action Required',
          body: args.title,
          url: '/dashboard/agency/nanny/copilot'
        });

        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys as any }, 
              payload
            );
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
