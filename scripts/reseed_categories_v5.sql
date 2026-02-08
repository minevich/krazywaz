-- Reseed System Categories V5 (Ashkenazi Names & Full Parsha Mapping - Comprehensive)

-- Clear existing data
DELETE FROM system_category_rules;
DELETE FROM system_categories;

-- Insert New Categories
INSERT INTO system_categories (id, name, "order", is_hidden, created_at, updated_at) VALUES 
('cat_bereishis', 'Bereishis', 1, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_shemos', 'Shemos', 2, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_vayikra', 'Vayikra', 3, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_bamidbar', 'Bamidbar', 4, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_devorim', 'Devorim', 5, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_holidays', 'Jewish Holidays', 6, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_tanya', 'Tanya', 7, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_tefillah', 'Tefillah', 8, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_general', 'General', 9, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Insert Rules (Comprehensive Parsha Mapping including Ashkenazi variants)

-- 1. Bereishis
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_bereishis', 'cat_bereishis', 'Bereishis', '["Bereishis", "Bereshit", "Genesis"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_noach', 'cat_bereishis', 'Noach', '["Noach"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_lech_lecha', 'cat_bereishis', 'Lech Lecha', '["Lech Lecha"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayeira', 'cat_bereishis', 'Vayeira', '["Vayeira"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_chayei_sarah', 'cat_bereishis', 'Chayei Sarah', '["Chayei Sarah"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_toldos', 'cat_bereishis', 'Toldos', '["Toldos"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayetzei', 'cat_bereishis', 'Vayetzei', '["Vayetzei", "Vayeitzei"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayishlach', 'cat_bereishis', 'Vayishlach', '["Vayishlach"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayeshev', 'cat_bereishis', 'Vayeshev', '["Vayeshev"]', 9, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_miketz', 'cat_bereishis', 'Miketz', '["Miketz"]', 10, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayigash', 'cat_bereishis', 'Vayigash', '["Vayigash"]', 11, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayechi', 'cat_bereishis', 'Vayechi', '["Vayechi"]', 12, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 2. Shemos
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_shemos', 'cat_shemos', 'Shemos', '["Shemos", "Shemot", "Exodus"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vaera', 'cat_shemos', 'Vaera', '["Vaera", "Va''era", "Va''eira"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_bo', 'cat_shemos', 'Bo', '["Bo"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_beshalach', 'cat_shemos', 'Beshalach', '["Beshalach"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_yisro', 'cat_shemos', 'Yisro', '["Yisro"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_mishpatim', 'cat_shemos', 'Mishpatim', '["Mishpatim"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_terumah', 'cat_shemos', 'Terumah', '["Terumah"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_tetzaveh', 'cat_shemos', 'Tetzaveh', '["Tetzaveh"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_ki_tisa', 'cat_shemos', 'Ki Tisa', '["Ki Tisa", "Ki Sisa"]', 9, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayakhel', 'cat_shemos', 'Vayakhel', '["Vayakhel"]', 10, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_pekudei', 'cat_shemos', 'Pekudei', '["Pekudei"]', 11, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 3. Vayikra
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_vayikra', 'cat_vayikra', 'Vayikra', '["Vayikra", "Leviticus"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_tzav', 'cat_vayikra', 'Tzav', '["Tzav"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_shemini', 'cat_vayikra', 'Shemini', '["Shemini"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_tazria', 'cat_vayikra', 'Tazria', '["Tazria"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_metzora', 'cat_vayikra', 'Metzora', '["Metzora"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_acharei_mot', 'cat_vayikra', 'Acharei Mot', '["Acharei Mot", "Acharei"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_kedoshim', 'cat_vayikra', 'Kedoshim', '["Kedoshim"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_emor', 'cat_vayikra', 'Emor', '["Emor"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_behar', 'cat_vayikra', 'Behar', '["Behar"]', 9, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_bechukotai', 'cat_vayikra', 'Bechukotai', '["Bechukotai"]', 10, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 4. Bamidbar
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_bamidbar', 'cat_bamidbar', 'Bamidbar', '["Bamidbar", "Numbers"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_nasso', 'cat_bamidbar', 'Nasso', '["Nasso", "Naso"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_behaalotcha', 'cat_bamidbar', 'Beha''alotcha', '["Beha''alotcha", "Behaalosecha"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_shlach', 'cat_bamidbar', 'Shlach', '["Shlach", "Shelach"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_korach', 'cat_bamidbar', 'Korach', '["Korach"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_chukas', 'cat_bamidbar', 'Chukas', '["Chukas", "Chukat"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_balak', 'cat_bamidbar', 'Balak', '["Balak"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_pinchas', 'cat_bamidbar', 'Pinchas', '["Pinchas"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_matos', 'cat_bamidbar', 'Matos', '["Matos", "Matot"]', 9, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_massei', 'cat_bamidbar', 'Massei', '["Massei"]', 10, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 5. Devorim
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_devorim', 'cat_devorim', 'Devorim', '["Devorim", "Devarim", "Deuteronomy"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vaetchanan', 'cat_devorim', 'Va''etchanan', '["Va''etchanan", "Va''eschanan"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_eikev', 'cat_devorim', 'Eikev', '["Eikev"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_reeh', 'cat_devorim', 'Re''eh', '["Re''eh"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_shoftim', 'cat_devorim', 'Shoftim', '["Shoftim"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_ki_teitzei', 'cat_devorim', 'Ki Teitzei', '["Ki Teitzei", "Ki Seitzei"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_ki_tavo', 'cat_devorim', 'Ki Tavo', '["Ki Tavo", "Ki Savo"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_nitzavim', 'cat_devorim', 'Nitzavim', '["Nitzavim"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayeilech', 'cat_devorim', 'Vayeilech', '["Vayeilech"]', 9, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_haazinu', 'cat_devorim', 'Ha''azinu', '["Ha''azinu"]', 10, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vzot_haberachah', 'cat_devorim', 'V''Zot HaBerachah', '["V''Zot HaBerachah", "Vezot Haberacha"]', 11, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Holidays
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_rosh_hashanah', 'cat_holidays', 'Rosh Hashanah', '["Rosh Hashanah"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_yom_kippur', 'cat_holidays', 'Yom Kippur', '["Yom Kippur"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_sukkot', 'cat_holidays', 'Sukkot', '["Sukkot"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_chanukah', 'cat_holidays', 'Chanukah', '["Chanukah"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_purim', 'cat_holidays', 'Purim', '["Purim"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_pesach', 'cat_holidays', 'Pesach', '["Pesach", "Passover"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_sefirah', 'cat_holidays', 'Sefira / Lag Baomer', '["Sefira", "Lag Baomer"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_shavuot', 'cat_holidays', 'Shavuot', '["Shavuot"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_tisha_bav', 'cat_holidays', 'Tisha B''Av', '["Tisha B''Av", "Three Weeks"]', 9, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Tanya
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_tanya', 'cat_tanya', 'Tanya', '["Tanya"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Tefillah
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_davening', 'cat_tefillah', 'Davening', '["Davening", "Prayer", "Siddur"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);
