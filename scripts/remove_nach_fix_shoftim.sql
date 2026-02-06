-- Remove Nach and Fix Shoftim (V4)
-- User confirmed NO Nach playlists exist. "Shoftim" is ONLY Parsha Shoftim.

-- 1. Delete Nach Category and Rules
DELETE FROM system_category_rules WHERE category_id = 'cat_nach';
DELETE FROM system_categories WHERE id = 'cat_nach';

-- 2. Ensure Shoftim is strictly mapped to Devorim
-- (It should already be in Devorim rules from V3, but we verify by forcing the playlist update)
UPDATE cached_playlists 
SET category = 'Devorim' 
WHERE title LIKE '%Shoftim%';

-- 3. Move any other 'Nach' leftovers to Misc (just in case)
UPDATE cached_playlists 
SET category = 'Misc' 
WHERE category = 'Nach';

-- 4. Re-assert strict sorting order for categories (removing Nach from order if needed)
-- (The order integers might have a gap now, which is fine, but let's ensure consistency)
UPDATE system_categories SET "order" = 1 WHERE name = 'Bereishis';
UPDATE system_categories SET "order" = 2 WHERE name = 'Shemos';
UPDATE system_categories SET "order" = 3 WHERE name = 'Vayikra';
UPDATE system_categories SET "order" = 4 WHERE name = 'Bamidbar';
UPDATE system_categories SET "order" = 5 WHERE name = 'Devorim';
UPDATE system_categories SET "order" = 6 WHERE name = 'Jewish Holidays';
UPDATE system_categories SET "order" = 7 WHERE name = 'Tanya';
UPDATE system_categories SET "order" = 8 WHERE name = 'Tefillah';
UPDATE system_categories SET "order" = 9 WHERE name = 'General';
