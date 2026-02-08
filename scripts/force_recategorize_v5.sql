-- Force update categories V5 (Ashkenazi Spelling Fixes)

-- Bereishis fixes
UPDATE cached_playlists SET category = 'Bereishis' WHERE 
    title LIKE '%Vayeitzei%';

-- Shemos fixes
UPDATE cached_playlists SET category = 'Shemos' WHERE 
    title LIKE '%Va''eira%' OR 
    title LIKE '%Ki Sisa%';

-- Bamidbar fixes
UPDATE cached_playlists SET category = 'Bamidbar' WHERE 
    title LIKE '%Naso%' OR 
    title LIKE '%Behaalosecha%' OR 
    title LIKE '%Shelach%';

-- Devorim fixes
UPDATE cached_playlists SET category = 'Devorim' WHERE 
    title LIKE '%Ki Savo%' OR 
    title LIKE '%Va''eschanan%' OR 
    title LIKE '%Ki Seitzei%';

-- Catch-all for "Parshas" if explicit matches failed but likely belong to a Chumash
-- (This is risky but user said "starts with Parshas MUST go in right chumash")
-- We can try to guess based on common Ashkenazi endings if we really wanted, but explicit is better.

-- Additional standard checks just in case case-sensitivity was an issue (SQLite default is usually insensitive for ASCII but good to be safe)
UPDATE cached_playlists SET category = 'Bamidbar' WHERE title LIKE '%Beha%cotcha%'; -- Wildcard match for spelling variations
