-- Force update categories V3 (Ashkenazi Names & Full Mapping)
-- Updates cached_playlists based on the NEW category names and ALL Parshas

-- 1. Bereishis
UPDATE cached_playlists SET category = 'Bereishis' WHERE 
   title LIKE '%Bereishis%' OR title LIKE '%Bereshit%' OR title LIKE '%Genesis%' OR
   title LIKE '%Noach%' OR
   title LIKE '%Lech Lecha%' OR
   title LIKE '%Vayeira%' OR
   title LIKE '%Chayei Sarah%' OR
   title LIKE '%Toldos%' OR
   title LIKE '%Vayetzei%' OR
   title LIKE '%Vayishlach%' OR
   title LIKE '%Vayeshev%' OR
   title LIKE '%Miketz%' OR
   title LIKE '%Vayigash%' OR
   title LIKE '%Vayechi%';

-- 2. Shemos
UPDATE cached_playlists SET category = 'Shemos' WHERE 
   title LIKE '%Shemos%' OR title LIKE '%Shemot%' OR title LIKE '%Exodus%' OR
   title LIKE '%Vaera%' OR title LIKE '%Va''era%' OR
   title LIKE '%Bo%' OR
   title LIKE '%Beshalach%' OR
   title LIKE '%Yisro%' OR
   title LIKE '%Mishpatim%' OR
   title LIKE '%Terumah%' OR
   title LIKE '%Tetzaveh%' OR
   title LIKE '%Ki Tisa%' OR
   title LIKE '%Vayakhel%' OR
   title LIKE '%Pekudei%';

-- 3. Vayikra
UPDATE cached_playlists SET category = 'Vayikra' WHERE 
   title LIKE '%Vayikra%' OR title LIKE '%Leviticus%' OR
   title LIKE '%Tzav%' OR
   title LIKE '%Shemini%' OR
   title LIKE '%Tazria%' OR
   title LIKE '%Metzora%' OR
   title LIKE '%Acharei Mot%' OR title LIKE '%Acharei%' OR
   title LIKE '%Kedoshim%' OR
   title LIKE '%Emor%' OR
   title LIKE '%Behar%' OR
   title LIKE '%Bechukotai%';

-- 4. Bamidbar
UPDATE cached_playlists SET category = 'Bamidbar' WHERE 
   title LIKE '%Bamidbar%' OR title LIKE '%Numbers%' OR
   title LIKE '%Nasso%' OR
   title LIKE '%Beha''alotcha%' OR
   title LIKE '%Shlach%' OR
   title LIKE '%Korach%' OR
   title LIKE '%Chukas%' OR title LIKE '%Chukat%' OR
   title LIKE '%Balak%' OR
   title LIKE '%Pinchas%' OR
   title LIKE '%Matos%' OR title LIKE '%Matot%' OR
   title LIKE '%Massei%';

-- 5. Devorim
UPDATE cached_playlists SET category = 'Devorim' WHERE 
   title LIKE '%Devorim%' OR title LIKE '%Devarim%' OR title LIKE '%Deuteronomy%' OR
   title LIKE '%Va''etchanan%' OR
   title LIKE '%Eikev%' OR
   title LIKE '%Re''eh%' OR
   title LIKE '%Shoftim%' OR
   title LIKE '%Ki Teitzei%' OR
   title LIKE '%Ki Tavo%' OR
   title LIKE '%Nitzavim%' OR
   title LIKE '%Vayeilech%' OR
   title LIKE '%Ha''azinu%' OR
   title LIKE '%V''Zot HaBerachah%' OR title LIKE '%Vezot Haberacha%';

-- 6. Jewish Holidays
UPDATE cached_playlists SET category = 'Jewish Holidays' WHERE 
   title LIKE '%Rosh Hashanah%' OR 
   title LIKE '%Yom Kippur%' OR 
   title LIKE '%Sukkot%' OR 
   title LIKE '%Chanukah%' OR 
   title LIKE '%Purim%' OR 
   title LIKE '%Pesach%' OR title LIKE '%Passover%' OR 
   title LIKE '%Sefira%' OR title LIKE '%Lag Baomer%' OR
   title LIKE '%Shavuot%' OR 
   title LIKE '%Tisha B''Av%' OR title LIKE '%Three Weeks%' OR title LIKE '%Fast%';

-- 7. Nach
UPDATE cached_playlists SET category = 'Nach' WHERE 
   title LIKE '%Joshua%' OR title LIKE '%Shoftim%' OR
   title LIKE '%Samuel%' OR
   title LIKE '%Kings%' OR
   title LIKE '%Isaiah%' OR
   title LIKE '%Jeremiah%' OR
   title LIKE '%Ezekiel%' OR
   title LIKE '%Trei Asar%' OR
   title LIKE '%Psalms%' OR
   title LIKE '%Proverbs%' OR title LIKE '%Mishlei%' OR
   title LIKE '%Job%' OR
   title LIKE '%Song of Songs%' OR
   title LIKE '%Ruth%' OR
   title LIKE '%Lamentations%' OR
   title LIKE '%Ecclesiastes%' OR title LIKE '%Kohelet%' OR
   title LIKE '%Esther%' OR
   title LIKE '%Daniel%' OR
   title LIKE '%Ezra%' OR title LIKE '%Nehemiah%' OR
   title LIKE '%Chronicles%';

-- 8. Tanya
UPDATE cached_playlists SET category = 'Tanya' WHERE title LIKE '%Tanya%';

-- 9. Tefillah
UPDATE cached_playlists SET category = 'Tefillah' WHERE title LIKE '%Davening%' OR title LIKE '%Prayer%' OR title LIKE '%Siddur%';

-- Clean up old categories if they exist (map to Misc if they don't match rules above)
UPDATE cached_playlists SET category = 'Misc' WHERE category IN ('Chumash', 'Holidays', 'Bereshit', 'Shemot', 'Devarim');
