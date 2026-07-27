-- Agency Join Requests
CREATE TABLE agency_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES nanny_orgs(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for Join Requests
ALTER TABLE agency_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a join request"
    ON agency_join_requests FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can view their own join requests"
    ON agency_join_requests FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Org members can view join requests for their org"
    ON agency_join_requests FOR SELECT
    USING (EXISTS (SELECT 1 FROM nanny_orgs WHERE id = org_id AND owner_profile_id = auth.uid()));

CREATE POLICY "Org members can update join requests for their org"
    ON agency_join_requests FOR UPDATE
    USING (EXISTS (SELECT 1 FROM nanny_orgs WHERE id = org_id AND owner_profile_id = auth.uid()));
