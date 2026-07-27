CREATE TABLE IF NOT EXISTS public.nanny_ai_chat_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.nanny_orgs(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.nanny_ai_chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their orgs chat history" ON public.nanny_ai_chat_history FOR SELECT USING (
  org_id IN (SELECT id FROM public.nanny_orgs WHERE owner_profile_id = auth.uid())
);
CREATE POLICY "Users can insert their orgs chat history" ON public.nanny_ai_chat_history FOR INSERT WITH CHECK (
  org_id IN (SELECT id FROM public.nanny_orgs WHERE owner_profile_id = auth.uid())
);
