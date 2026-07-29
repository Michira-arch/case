CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    title text not null,
    content text not null,
    link text,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS notifications_profile_id_idx ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications(is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (
    profile_id IN (
        SELECT id FROM public.profiles WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
    profile_id IN (
        SELECT id FROM public.profiles WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    profile_id IN (
        SELECT id FROM public.profiles WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "Users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
    profile_id IN (
        SELECT id FROM public.profiles WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (
    profile_id IN (
        SELECT id FROM public.profiles WHERE owner_id = auth.uid()
    )
);
