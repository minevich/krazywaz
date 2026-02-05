-- Force update categories for cached playlists based on titles
-- This is a manual "apply rules" script to fix the display immediately

-- Chumash
UPDATE cached_playlists SET category = 'Chumash' WHERE title LIKE '%Bereshit%';
UPDATE cached_playlists SET category = 'Chumash' WHERE title LIKE '%Shemot%';
UPDATE cached_playlists SET category = 'Chumash' WHERE title LIKE '%Vayikra%';
UPDATE cached_playlists SET category = 'Chumash' WHERE title LIKE '%Bamidbar%';
UPDATE cached_playlists SET category = 'Chumash' WHERE title LIKE '%Devarim%';

-- Nach
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

-- Tanya
UPDATE cached_playlists SET category = 'Tanya' WHERE title LIKE '%Tanya%';

-- Tefillah
UPDATE cached_playlists SET category = 'Tefillah' WHERE title LIKE '%Davening%' OR title LIKE '%Prayer%' OR title LIKE '%Siddur%';

-- Holidays
UPDATE cached_playlists SET category = 'Holidays' WHERE title LIKE '%Rosh Hashanah%';
UPDATE cached_playlists SET category = 'Holidays' WHERE title LIKE '%Yom Kippur%';
UPDATE cached_playlists SET category = 'Holidays' WHERE title LIKE '%Sukkot%';
UPDATE cached_playlists SET category = 'Holidays' WHERE title LIKE '%Chanukah%';
UPDATE cached_playlists SET category = 'Holidays' WHERE title LIKE '%Purim%';
UPDATE cached_playlists SET category = 'Holidays' WHERE title LIKE '%Pesach%' OR title LIKE '%Passover%';
UPDATE cached_playlists SET category = 'Holidays' WHERE title LIKE '%Shavuot%';
UPDATE cached_playlists SET category = 'Holidays' WHERE title LIKE '%Tisha B''Av%' OR title LIKE '%Three Weeks%';
