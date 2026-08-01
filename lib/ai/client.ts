import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase/server';

export async function getAiClient(orgId: string) {
  // Service client so this also works in background contexts (cron, webhooks)
  // where there is no cookie session — previously billing_status silently
  // defaulted to 'trial' and paid orgs got the trial model there.
  const supabase = createServiceClient();
  const { data: org, error } = await supabase
    .from('nanny_orgs')
    .select('billing_status')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Error fetching org billing_status:', error);
    throw new Error('Failed to fetch org details');
  }

  const billingStatus = org?.billing_status || 'trial';

  if (billingStatus === 'active') {
    return {
      client: new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY,
      }),
      model: 'deepseek-v4-flash',
    };
  } else {
    // Default to trial
    return {
      client: new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      }),
      model: 'llama-3.3-70b-versatile',
    };
  }
}
