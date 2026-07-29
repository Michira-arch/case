-- Fix RLS policy for agency_join_requests
-- The previous policy tried to match auth.uid() directly to profile_id, 
-- but profile_id is a UUID referencing profiles.id, while auth.uid() references profiles.owner_id.

DROP POLICY IF EXISTS "Anyone can create a join request" ON agency_join_requests;

CREATE POLICY "Anyone can create a join request"
    ON agency_join_requests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = agency_join_requests.profile_id 
            AND profiles.owner_id = auth.uid()
        )
    );
