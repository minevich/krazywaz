-- Force update categories V6 (Remaining Parshas & Holidays)

-- Bereishis fixes
UPDATE cached_playlists SET category = 'Bereishis' WHERE 
    title LIKE '%Mikeitz%';

-- Vayikra fixes
UPDATE cached_playlists SET category = 'Vayikra' WHERE 
    title LIKE '%Shmini%';

-- Devorim fixes
UPDATE cached_playlists SET category = 'Devorim' WHERE 
    title LIKE '%Dvorim%' OR 
    title LIKE '%V''zos Habracha%';

-- Holiday fixes (Ashkenazi spelling & Variants)
UPDATE cached_playlists SET category = 'Jewish Holidays' WHERE 
    title LIKE '%Sukkos%' OR 
    title LIKE '%Shavuos%' OR
    title LIKE '%Rosh Hashana%';
