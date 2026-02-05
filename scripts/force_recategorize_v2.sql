-- Force update categories V2 (Split Chumashim)
-- Updates cached_playlists based on the NEW category names

-- Bereshit
UPDATE cached_playlists SET category = 'Bereshit' WHERE title LIKE '%Bereshit%';

-- Shemot
UPDATE cached_playlists SET category = 'Shemot' WHERE title LIKE '%Shemot%';

-- Vayikra
UPDATE cached_playlists SET category = 'Vayikra' WHERE title LIKE '%Vayikra%';

-- Bamidbar
UPDATE cached_playlists SET category = 'Bamidbar' WHERE title LIKE '%Bamidbar%';

-- Devarim
UPDATE cached_playlists SET category = 'Devarim' WHERE title LIKE '%Devarim%';

-- Jewish Holidays
UPDATE cached_playlists SET category = 'Jewish Holidays' WHERE title LIKE '%Rosh Hashanah%' OR title LIKE '%Yom Kippur%' OR title LIKE '%Sukkot%' OR title LIKE '%Chanukah%' OR title LIKE '%Purim%' OR title LIKE '%Pesach%' OR title LIKE '%Passover%' OR title LIKE '%Shavuot%' OR title LIKE '%Tisha B''Av%' OR title LIKE '%Three Weeks%';

-- Nach (Preserved)
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Joshua%' OR title LIKE '%Shoftim%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Samuel%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Kings%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Isaiah%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Jeremiah%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Ezekiel%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Trei Asar%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Psalms%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Proverbs%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Job%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Song of Songs%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Ruth%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Lamentations%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Ecclesiastes%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Esther%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Daniel%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Ezra%' OR title LIKE '%Nehemiah%';
UPDATE cached_playlists SET category = 'Nach' WHERE title LIKE '%Chronicles%';

-- Tanya (Preserved)
UPDATE cached_playlists SET category = 'Tanya' WHERE title LIKE '%Tanya%';

-- Tefillah (Preserved)
UPDATE cached_playlists SET category = 'Tefillah' WHERE title LIKE '%Davening%' OR title LIKE '%Prayer%' OR title LIKE '%Siddur%';

-- Clean up any old 'Chumash' category leftovers (set to Misc as fallback if they don't match above)
UPDATE cached_playlists SET category = 'Misc' WHERE category = 'Chumash';
UPDATE cached_playlists SET category = 'Misc' WHERE category = 'Holidays'; -- renamed to Jewish Holidays
