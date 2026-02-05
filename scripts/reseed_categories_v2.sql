-- Reseed System Categories V2 (Split Chumashim)

-- Clear existing data (to avoid Order conflicts)
DELETE FROM system_category_rules;
DELETE FROM system_categories;

-- Insert New Categories (Bereshit...Devarim, Holidays, Nach, Tanya, Tefillah)
INSERT INTO system_categories (id, name, "order", is_hidden, created_at, updated_at) VALUES 
('cat_bereshit', 'Bereshit', 1, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_shemot', 'Shemot', 2, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_vayikra', 'Vayikra', 3, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_bamidbar', 'Bamidbar', 4, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_devarim', 'Devarim', 5, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_holidays', 'Jewish Holidays', 6, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_nach', 'Nach', 7, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_tanya', 'Tanya', 8, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_tefillah', 'Tefillah', 9, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_general', 'General', 10, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Insert Rules
-- 1. Bereshit
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_bereshit', 'cat_bereshit', 'Bereshit', '["Bereshit"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 2. Shemot
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_shemot', 'cat_shemot', 'Shemot', '["Shemot"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 3. Vayikra
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_vayikra', 'cat_vayikra', 'Vayikra', '["Vayikra"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 4. Bamidbar
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_bamidbar', 'cat_bamidbar', 'Bamidbar', '["Bamidbar"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 5. Devarim
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_devarim', 'cat_devarim', 'Devarim', '["Devarim"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 6. Jewish Holidays (Renamed rule to match category intent better)
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_rosh_hashanah', 'cat_holidays', 'Rosh Hashanah', '["Rosh Hashanah"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_yom_kippur', 'cat_holidays', 'Yom Kippur', '["Yom Kippur"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_sukkot', 'cat_holidays', 'Sukkot', '["Sukkot"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_chanukah', 'cat_holidays', 'Chanukah', '["Chanukah"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_purim', 'cat_holidays', 'Purim', '["Purim"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_pesach', 'cat_holidays', 'Pesach', '["Pesach", "Passover"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_shavuot', 'cat_holidays', 'Shavuot', '["Shavuot"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_tisha_bav', 'cat_holidays', 'Tisha B''Av', '["Tisha B''Av", "Three Weeks"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 7. Nach (Preserved)
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_joshua', 'cat_nach', 'Joshua / Shoftim', '["Joshua", "Shoftim"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_samuel', 'cat_nach', 'Samuel', '["Samuel"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_kings', 'cat_nach', 'Kings', '["Kings"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_isaiah', 'cat_nach', 'Isaiah', '["Isaiah"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_jeremiah', 'cat_nach', 'Jeremiah', '["Jeremiah"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_ezekiel', 'cat_nach', 'Ezekiel', '["Ezekiel"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_trei_asar', 'cat_nach', 'Trei Asar', '["Trei Asar"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_psalms', 'cat_nach', 'Psalms', '["Psalms"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_proverbs', 'cat_nach', 'Proverbs', '["Proverbs"]', 9, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_job', 'cat_nach', 'Job', '["Job"]', 10, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_song_of_songs', 'cat_nach', 'Song of Songs', '["Song of Songs"]', 11, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_ruth', 'cat_nach', 'Ruth', '["Ruth"]', 12, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_lamentations', 'cat_nach', 'Lamentations', '["Lamentations"]', 13, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_ecclesiastes', 'cat_nach', 'Ecclesiastes', '["Ecclesiastes"]', 14, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_esther', 'cat_nach', 'Esther', '["Esther"]', 15, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_daniel', 'cat_nach', 'Daniel', '["Daniel"]', 16, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_ezra', 'cat_nach', 'Ezra / Nehemiah', '["Ezra", "Nehemiah"]', 17, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_chronicles', 'cat_nach', 'Chronicles', '["Chronicles"]', 18, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 8. Tanya (Preserved)
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_tanya', 'cat_tanya', 'Tanya', '["Tanya"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 9. Tefillah (Preserved)
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_davening', 'cat_tefillah', 'Davening', '["Davening", "Prayer", "Siddur"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);
