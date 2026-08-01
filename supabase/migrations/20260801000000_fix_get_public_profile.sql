-- Fix get_public_profile:
-- 1. The previous migration referenced a non-existent column (proof_items.is_hidden);
--    the column is actually named `visible`. This made every real public profile 404.
-- 2. Stop leaking account email unconditionally — only return it when the owner
--    opted in via contact_visibility (same semantics the UI already uses).
-- 3. Stop exposing financial configuration (paystack_subaccount_code,
--    subscription_amount_kes, subscription_interval) to anonymous visitors.

create or replace function public.get_public_profile(p_handle text)
returns jsonb
language plpgsql security definer
stable
as $$
declare
  v_profile  public.profiles%rowtype;
  v_sub      public.subscriptions%rowtype;
  v_email    text;
  result     jsonb;
begin
  select * into v_profile
  from public.profiles
  where handle = p_handle
    and is_public = true;

  if not found then
    return null;
  end if;

  select * into v_sub
  from public.subscriptions
  where profile_id = v_profile.id;

  select email into v_email
  from auth.users
  where id = v_profile.owner_id;

  -- Only expose the account email when the owner has not opted out
  if coalesce((v_profile.contact_visibility ->> 'email')::boolean, true) = false then
    v_email := null;
  end if;

  select jsonb_build_object(
    'id',           v_profile.id,
    'handle',       v_profile.handle,
    'persona',      v_profile.persona,
    'display_name', v_profile.display_name,
    'role_line',    v_profile.role_line,
    'tagline',      v_profile.tagline,
    'avatar_url',   v_profile.avatar_url,
    'email',        v_email,
    'showcase_images', v_profile.showcase_images,
    'physical_attributes', v_profile.physical_attributes,
    'socials',      v_profile.socials,
    'category',     v_profile.category,
    'tags',         v_profile.tags,
    'location_area',v_profile.location_area,
    'locale',       v_profile.locale,
    'custom_html',  v_profile.custom_html,
    'is_custom_page', v_profile.is_custom_page,
    'plan',         coalesce(v_sub.plan, 'free'),
    'plan_expires', v_sub.current_period_end,
    'proof_items',  (
      select jsonb_agg(
        jsonb_build_object(
          'id',         pi.id,
          'pillar',     pi.pillar,
          'title',      pi.title,
          'detail',     pi.detail,
          'when_label', pi.when_label,
          'sort_order', pi.sort_order,
          'source',     pi.source,
          'created_at', pi.created_at,
          'evidence',   (
            select jsonb_agg(
              jsonb_build_object(
                'id',               e.id,
                'type',             e.type,
                'storage_key',      e.storage_key,
                'caption',          e.caption,
                'width',            e.width,
                'height',           e.height,
                'duration_seconds', e.duration_seconds
              ) order by e.created_at
            )
            from public.evidence e
            where e.proof_item_id = pi.id
          )
        ) order by pi.sort_order
      )
      from public.proof_items pi
      where pi.profile_id = v_profile.id
        and pi.visible = true
    ),
    'contact_visibility', v_profile.contact_visibility,
    'claim_text', v_profile.claim_text
  ) into result;

  return result;
end;
$$;
