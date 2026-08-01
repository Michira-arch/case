import { NextResponse } from 'next/server';
import { getAiClient } from '@/lib/ai/client';
import { createClient } from '@/lib/supabase/server';

const SYSTEM_PROMPT = `
You are an expert web designer. 
Generate a new JSON configuration for a nanny agency landing page based on the user's request.
The JSON must conform exactly to this structure:
{
  "hero_headline": "string | null",
  "hero_subtitle": "string | null",
  "pitch_title": "string",
  "pitch_body": "string | null",
  "pitch_bullets": ["string"],
  "show_services": boolean,
  "show_workers": boolean,
  "show_testimonials": boolean,
  "cta_text": "string",
  "cta_subtext": "string",
  "accent_color": "string (hex code) | null",
  "hero_pattern": "dots" | "grid" | "waves" | "none",
  "stats": [{ "label": "string", "value": "string" }]
}
Return ONLY valid JSON.
`;

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, orgId, org_id } = await req.json();
    let finalOrgId = orgId || org_id;
    if (finalOrgId === 'undefined') finalOrgId = undefined;

    if (!finalOrgId || !prompt) {
      return NextResponse.json({ error: 'Missing orgId or prompt' }, { status: 400 });
    }

    // Ownership check: the caller must own the org whose page they're editing
    const { data: callerProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
    const callerProfileIds = (callerProfiles || []).map((p: any) => p.id)
    if (callerProfileIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data: ownedOrg } = await supabase
      .from('nanny_orgs')
      .select('id')
      .eq('id', finalOrgId)
      .in('owner_profile_id', callerProfileIds)
      .maybeSingle()
    if (!ownedOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { client, model } = await getAiClient(finalOrgId);

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from AI');
    }

    const newConfig = JSON.parse(content);

    const { error } = await supabase
      .from('nanny_orgs')
      .update({ page_config: newConfig, updated_at: new Date().toISOString() })
      .eq('id', finalOrgId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, config: newConfig });
  } catch (error: any) {
    console.error('Customize Page API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
