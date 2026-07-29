ALTER TABLE profiles
ADD COLUMN draft_html TEXT,
ADD COLUMN custom_html TEXT,
ADD COLUMN is_custom_page BOOLEAN DEFAULT false;
