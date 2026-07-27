-- Nanny AI Copilot Schema
-- Adds tables for action inbox, cron jobs, and AI memories

-- 1. Action Inbox
CREATE TABLE public.nanny_action_inbox (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES public.nanny_orgs(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    action_type text NOT NULL,
    action_payload jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nanny_action_inbox_status_check CHECK (status = ANY (ARRAY['pending', 'approved', 'rejected', 'executed', 'failed']))
);

CREATE INDEX idx_nanny_action_inbox_org_id ON public.nanny_action_inbox(org_id);
CREATE INDEX idx_nanny_action_inbox_status ON public.nanny_action_inbox(status);

ALTER TABLE public.nanny_action_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage action inbox for their orgs" ON public.nanny_action_inbox
    FOR ALL USING (
        org_id IN (
            SELECT id FROM public.nanny_orgs WHERE owner_profile_id = auth.uid()
        )
    );


-- 2. AI Cron Jobs
CREATE TABLE public.nanny_ai_cron_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES public.nanny_orgs(id) ON DELETE CASCADE,
    prompt text NOT NULL,
    cron_expression text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_nanny_ai_cron_jobs_org_id ON public.nanny_ai_cron_jobs(org_id);

ALTER TABLE public.nanny_ai_cron_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage AI cron jobs for their orgs" ON public.nanny_ai_cron_jobs
    FOR ALL USING (
        org_id IN (
            SELECT id FROM public.nanny_orgs WHERE owner_profile_id = auth.uid()
        )
    );

-- Enforce limit of 3 cron jobs per org via trigger
CREATE OR REPLACE FUNCTION enforce_ai_cron_limit()
RETURNS trigger AS $$
DECLARE
    job_count int;
BEGIN
    SELECT count(*) INTO job_count
    FROM public.nanny_ai_cron_jobs
    WHERE org_id = NEW.org_id;
    
    IF job_count >= 3 THEN
        RAISE EXCEPTION 'Maximum of 3 AI cron jobs allowed per organization';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_ai_cron_limit
    BEFORE INSERT ON public.nanny_ai_cron_jobs
    FOR EACH ROW
    EXECUTE FUNCTION enforce_ai_cron_limit();


-- 3. AI Memories
CREATE TABLE public.nanny_ai_memories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES public.nanny_orgs(id) ON DELETE CASCADE,
    memory_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_nanny_ai_memories_org_id ON public.nanny_ai_memories(org_id);

ALTER TABLE public.nanny_ai_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage AI memories for their orgs" ON public.nanny_ai_memories
    FOR ALL USING (
        org_id IN (
            SELECT id FROM public.nanny_orgs WHERE owner_profile_id = auth.uid()
        )
    );

-- 4. Push Subscriptions
CREATE TABLE public.nanny_push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES public.nanny_orgs(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    keys jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(endpoint)
);

CREATE INDEX idx_nanny_push_subs_org_id ON public.nanny_push_subscriptions(org_id);

ALTER TABLE public.nanny_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage push subscriptions for their orgs" ON public.nanny_push_subscriptions
    FOR ALL USING (
        org_id IN (
            SELECT id FROM public.nanny_orgs WHERE owner_profile_id = auth.uid()
        )
    );

-- Add AI Usage to nanny_orgs
ALTER TABLE public.nanny_orgs ADD COLUMN ai_tokens_used integer DEFAULT 0 NOT NULL;
