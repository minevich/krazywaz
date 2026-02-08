-- Force update categories V7 (The "No More Misc" Update)
-- Explicitly moving everything that has been identified as a mismatch.

-- 1. Bereishis
UPDATE cached_playlists SET category = 'Bereishis' WHERE 
    title LIKE '%Bereishis%' OR
    title LIKE '%Noach%' OR
    title LIKE '%Lech Lecha%' OR
    title LIKE '%Vayeira%' OR
    title LIKE '%Chayei Sarah%' OR
    title LIKE '%Toldos%' OR
    title LIKE '%Vayetzei%' OR
    title LIKE '%Vayeitzei%' OR
    title LIKE '%Vayishlach%' OR
    title LIKE '%Vayeshev%' OR
    title LIKE '%Miketz%' OR
    title LIKE '%Mikeitz%' OR
    title LIKE '%Vayigash%' OR
    title LIKE '%Vayechi%';

-- 2. Shemos
UPDATE cached_playlists SET category = 'Shemos' WHERE 
    title LIKE '%Shemos%' OR
    title LIKE '%Shemot%' OR
    title LIKE '%Vaera%' OR
    title LIKE '%Va''eira%' OR
    title LIKE '%Va''era%' OR
    title LIKE '%Bo%' OR
    title LIKE '%Beshalach%' OR
    title LIKE '%Yisro%' OR
    title LIKE '%Mishpatim%' OR
    title LIKE '%Terumah%' OR
    title LIKE '%Tetzaveh%' OR
    title LIKE '%Ki Tisa%' OR
    title LIKE '%Ki Sisa%' OR
    title LIKE '%Vayakhel%' OR
    title LIKE '%Pekudei%';

-- 3. Vayikra
UPDATE cached_playlists SET category = 'Vayikra' WHERE 
    title LIKE '%Vayikra%' OR
    title LIKE '%Tzav%' OR
    title LIKE '%Shemini%' OR
    title LIKE '%Shmini%' OR
    title LIKE '%Tazria%' OR
    title LIKE '%Metzora%' OR
    title LIKE '%Acharei%' OR
    title LIKE '%Kedoshim%' OR
    title LIKE '%Emor%' OR
    title LIKE '%Behar%' OR
    title LIKE '%Bechukotai%';

-- 4. Bamidbar
UPDATE cached_playlists SET category = 'Bamidbar' WHERE 
    title LIKE '%Bamidbar%' OR
    title LIKE '%Nasso%' OR
    title LIKE '%Naso%' OR
    title LIKE '%Behaalotcha%' OR
    title LIKE '%Behaalosecha%' OR
    title LIKE '%Shlach%' OR
    title LIKE '%Shelach%' OR
    title LIKE '%Korach%' OR
    title LIKE '%Chukas%' OR
    title LIKE '%Chukat%' OR
    title LIKE '%Balak%' OR
    title LIKE '%Pinchas%' OR
    title LIKE '%Matos%' OR
    title LIKE '%Matot%' OR
    title LIKE '%Massei%';

-- 5. Devorim
UPDATE cached_playlists SET category = 'Devorim' WHERE 
    title LIKE '%Devorim%' OR
    title LIKE '%Devarim%' OR
    title LIKE '%Dvorim%' OR
    title LIKE '%Vaetchanan%' OR
    title LIKE '%Va''eschanan%' OR
    title LIKE '%Eikev%' OR
    title LIKE '%Re''eh%' OR
    title LIKE '%Shoftim%' OR
    title LIKE '%Ki Teitzei%' OR
    title LIKE '%Ki Seitzei%' OR
    title LIKE '%Ki Tavo%' OR
    title LIKE '%Ki Savo%' OR
    title LIKE '%Nitzavim%' OR
    title LIKE '%Vayeilech%' OR
    title LIKE '%Haazinu%' OR
    title LIKE '%V''Zot HaBerachah%' OR
    title LIKE '%V''zos Habracha%';

-- 6. Jewish Holidays
UPDATE cached_playlists SET category = 'Jewish Holidays' WHERE 
    title LIKE '%Rosh Hashanah%' OR
    title LIKE '%Rosh Hashana%' OR
    title LIKE '%Yom Kippur%' OR
    title LIKE '%Sukkot%' OR
    title LIKE '%Sukkos%' OR
    title LIKE '%Chanukah%' OR
    title LIKE '%Purim%' OR
    title LIKE '%Pesach%' OR
    title LIKE '%Passover%' OR
    title LIKE '%Sefira%' OR
    title LIKE '%Lag Baomer%' OR
    title LIKE '%Shavuot%' OR
    title LIKE '%Shavuos%' OR
    title LIKE '%Tisha B''Av%' OR
    title LIKE '%Three Weeks%';

-- 7. Tanya
UPDATE cached_playlists SET category = 'Tanya' WHERE 
    title LIKE '%Tanya%';

-- 8. Tefillah
UPDATE cached_playlists SET category = 'Tefillah' WHERE 
    title LIKE '%Davening%' OR
    title LIKE '%Prayer%' OR
    title LIKE '%Siddur%';

-- Cleanup: Explicitly move anything still in old categories to Misc if they didn't match
UPDATE cached_playlists SET category = 'Misc' WHERE 
    category NOT IN ('Bereishis', 'Shemos', 'Vayikra', 'Bamidbar', 'Devorim', 'Jewish Holidays', 'Tanya', 'Tefillah', 'General');
