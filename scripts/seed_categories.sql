-- Seed System Categories
INSERT INTO system_categories (id, name, "order", is_hidden, created_at, updated_at) VALUES 
('cat_chumash', 'Chumash', 1, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_nach', 'Nach', 2, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_tanya', 'Tanya', 3, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_tefillah', 'Tefillah', 4, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_holidays', 'Holidays', 5, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('cat_general', 'General', 6, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Seed System Category Rules
-- Chumash Rules
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_bereshit', 'cat_chumash', 'Bereshit', '["Bereshit"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_shemot', 'cat_chumash', 'Shemot', '["Shemot"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_vayikra', 'cat_chumash', 'Vayikra', '["Vayikra"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_bamidbar', 'cat_chumash', 'Bamidbar', '["Bamidbar"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_devarim', 'cat_chumash', 'Devarim', '["Devarim"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Nach Rules
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

-- Tanya Rules
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_tanya', 'cat_tanya', 'Tanya', '["Tanya"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Tefillah Rules
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_davening', 'cat_tefillah', 'Davening', '["Davening", "Prayer", "Siddur"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Holidays Rules
INSERT INTO system_category_rules (id, category_id, name, keywords, "order", created_at, updated_at) VALUES
('rule_rosh_hashanah', 'cat_holidays', 'Rosh Hashanah', '["Rosh Hashanah"]', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_yom_kippur', 'cat_holidays', 'Yom Kippur', '["Yom Kippur"]', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_sukkot', 'cat_holidays', 'Sukkot', '["Sukkot"]', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_chanukah', 'cat_holidays', 'Chanukah', '["Chanukah"]', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_purim', 'cat_holidays', 'Purim', '["Purim"]', 5, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_pesach', 'cat_holidays', 'Pesach', '["Pesach", "Passover"]', 6, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_shavuot', 'cat_holidays', 'Shavuot', '["Shavuot"]', 7, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('rule_tisha_bav', 'cat_holidays', 'Tisha B''Av', '["Tisha B''Av", "Three Weeks"]', 8, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);
