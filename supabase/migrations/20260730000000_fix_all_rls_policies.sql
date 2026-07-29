-- Fix all RLS policies that incorrectly compared auth.uid() directly to a profile_id
-- auth.uid() is the auth user id, but profiles.id is a generated UUID for the profile
-- Therefore, we must join through profiles where owner_id = auth.uid()

-- 1. Fix nanny_ai_chat_history
DROP POLICY IF EXISTS "Users can view their orgs chat history" ON public.nanny_ai_chat_history;
DROP POLICY IF EXISTS "Users can insert their orgs chat history" ON public.nanny_ai_chat_history;

CREATE POLICY "Users can view their orgs chat history" ON public.nanny_ai_chat_history FOR SELECT USING (
    org_id IN (
        SELECT id FROM public.nanny_orgs 
        WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
    )
);

CREATE POLICY "Users can insert their orgs chat history" ON public.nanny_ai_chat_history FOR INSERT WITH CHECK (
    org_id IN (
        SELECT id FROM public.nanny_orgs 
        WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
    )
);

-- 2. Fix agency_join_requests
DROP POLICY IF EXISTS "Users can view their own join requests" ON agency_join_requests;
DROP POLICY IF EXISTS "Org members can view join requests for their org" ON agency_join_requests;
DROP POLICY IF EXISTS "Org members can update join requests for their org" ON agency_join_requests;

CREATE POLICY "Users can view their own join requests" ON agency_join_requests FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
);

CREATE POLICY "Org members can view join requests for their org" ON agency_join_requests FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM nanny_orgs 
        WHERE id = org_id AND owner_profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
    )
);

CREATE POLICY "Org members can update join requests for their org" ON agency_join_requests FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM nanny_orgs 
        WHERE id = org_id AND owner_profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
    )
);

-- 3. Fix nanny_action_inbox
DROP POLICY IF EXISTS "Users can manage action inbox for their orgs" ON public.nanny_action_inbox;
CREATE POLICY "Users can manage action inbox for their orgs" ON public.nanny_action_inbox FOR ALL USING (
    org_id IN (
        SELECT id FROM public.nanny_orgs 
        WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
    )
);

-- 4. Fix nanny_ai_cron_jobs
DROP POLICY IF EXISTS "Users can manage AI cron jobs for their orgs" ON public.nanny_ai_cron_jobs;
CREATE POLICY "Users can manage AI cron jobs for their orgs" ON public.nanny_ai_cron_jobs FOR ALL USING (
    org_id IN (
        SELECT id FROM public.nanny_orgs 
        WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
    )
);

-- 5. Fix nanny_ai_memories
DROP POLICY IF EXISTS "Users can manage AI memories for their orgs" ON public.nanny_ai_memories;
CREATE POLICY "Users can manage AI memories for their orgs" ON public.nanny_ai_memories FOR ALL USING (
    org_id IN (
        SELECT id FROM public.nanny_orgs 
        WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
    )
);

-- 6. Fix nanny_push_subscriptions
DROP POLICY IF EXISTS "Users can manage push subscriptions for their orgs" ON public.nanny_push_subscriptions;
CREATE POLICY "Users can manage push subscriptions for their orgs" ON public.nanny_push_subscriptions FOR ALL USING (
    org_id IN (
        SELECT id FROM public.nanny_orgs 
        WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE owner_id = auth.uid())
    )
);
