-- Add client persona
ALTER TABLE public.profiles DROP CONSTRAINT persona_values;
ALTER TABLE public.profiles ADD CONSTRAINT persona_values CHECK (persona in ('service','professional','jobseeker','client'));
