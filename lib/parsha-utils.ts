/**
 * Parsha name utilities for matching shiurim to Torah portions
 */

// Comprehensive parsha variants mapping - covers different transliterations
export const PARSHA_VARIANTS: Record<string, string[]> = {
    // Bereishis
    'Bereishis': ['Bereishis', 'Bereshit', 'Genesis'],
    'Noach': ['Noach', 'Noah'],
    'Lech Lecha': ['Lech Lecha', 'Lech-Lecha'],
    'Vayera': ['Vayera', 'Vayeira'],
    'Chayei Sarah': ['Chayei Sarah', 'Chayei-Sarah', 'Chaye Sarah'],
    'Toldos': ['Toldos', 'Toldot', 'Toledot'],
    'Vayetzei': ['Vayetzei', 'Vayetze'],
    'Vayishlach': ['Vayishlach', 'Vayishlah'],
    'Vayeshev': ['Vayeshev', 'Vayeishev'],
    'Miketz': ['Miketz', 'Mikeitz'],
    'Vayigash': ['Vayigash'],
    'Vayechi': ['Vayechi', 'Vaychi'],
    // Shemos
    'Shemos': ['Shemos', 'Shemot', 'Exodus'],
    'Vaera': ['Vaera', "Va'era"],
    'Bo': ['Bo'],
    'Beshalach': ['Beshalach', 'Beshallach'],
    'Yisro': ['Yisro', 'Yitro', 'Jethro'],
    'Mishpatim': ['Mishpatim'],
    'Terumah': ['Terumah', 'Trumah'],
    'Tetzaveh': ['Tetzaveh', 'Tetzave'],
    'Ki Tisa': ['Ki Tisa', 'Ki Tissa', 'Ki-Tisa'],
    'Vayakhel': ['Vayakhel', 'Vayakeil'],
    'Pekudei': ['Pekudei', 'Pekude'],
    // Vayikra
    'Vayikra': ['Vayikra', 'Leviticus'],
    'Tzav': ['Tzav', 'Tsav'],
    'Shemini': ['Shemini', 'Shmini'],
    'Tazria': ['Tazria', "Tazri'a"],
    'Metzora': ['Metzora', 'Metzorah'],
    'Acharei Mot': ['Acharei Mot', 'Acharei', 'Achrei Mot'],
    'Kedoshim': ['Kedoshim', 'Kdoshim'],
    'Emor': ['Emor'],
    'Behar': ['Behar', "B'har"],
    'Bechukotai': ['Bechukotai', 'Bechukosai', 'Behukotai'],
    // Bamidbar
    'Bamidbar': ['Bamidbar', 'Bemidbar', 'Numbers'],
    'Nasso': ['Nasso', 'Naso'],
    'Behaalotecha': ['Behaalotecha', "Beha'alotcha", 'Behaalosecha'],
    'Shelach': ['Shelach', 'Shlach', "Sh'lach"],
    'Korach': ['Korach', 'Korah'],
    'Chukat': ['Chukat', 'Chukkat', 'Hukat'],
    'Balak': ['Balak'],
    'Pinchas': ['Pinchas', 'Pinhas', 'Phineas'],
    'Matot': ['Matot', 'Matos'],
    'Masei': ['Masei', 'Masse', 'Masey'],
    // Devarim
    'Devarim': ['Devarim', 'Deuteronomy', "D'varim"],
    'Vaetchanan': ['Vaetchanan', "Va'etchanan", 'Vaeschanan'],
    'Eikev': ['Eikev', 'Ekev'],
    'Reeh': ['Reeh', "Re'eh", "R'eih"],
    'Shoftim': ['Shoftim', 'Shofetim'],
    'Ki Teitzei': ['Ki Teitzei', 'Ki Tetzei', 'Ki Tetze', 'Ki-Teitzei'],
    'Ki Tavo': ['Ki Tavo', 'Ki Savo', 'Ki-Tavo'],
    'Nitzavim': ['Nitzavim', 'Nitsavim'],
    'Vayeilech': ['Vayeilech', 'Vayelech'],
    'Haazinu': ['Haazinu', "Ha'azinu"],
    'Vezot Haberakhah': ['Vezot Haberakhah', "V'zot Habracha", 'Zos Habracha'],
}

// Mapping from Hebcal parsha names to our canonical names
const HEBCAL_TO_CANONICAL: Record<string, string> = {
    'Bereshit': 'Bereishis',
    'Noach': 'Noach',
    'Lech-Lecha': 'Lech Lecha',
    'Vayera': 'Vayera',
    'Chayei Sara': 'Chayei Sarah',
    'Toldot': 'Toldos',
    'Vayetzei': 'Vayetzei',
    'Vayishlach': 'Vayishlach',
    'Vayeshev': 'Vayeshev',
    'Miketz': 'Miketz',
    'Vayigash': 'Vayigash',
    'Vayechi': 'Vayechi',
    'Shemot': 'Shemos',
    "Va'era": 'Vaera',
    'Bo': 'Bo',
    'Beshalach': 'Beshalach',
    'Yitro': 'Yisro',
    'Mishpatim': 'Mishpatim',
    'Terumah': 'Terumah',
    'Tetzaveh': 'Tetzaveh',
    'Ki Tisa': 'Ki Tisa',
    'Vayakhel': 'Vayakhel',
    'Pekudei': 'Pekudei',
    'Vayikra': 'Vayikra',
    'Tzav': 'Tzav',
    'Shmini': 'Shemini',
    "Tazria": 'Tazria',
    "Metzora": 'Metzora',
    'Achrei Mot': 'Acharei Mot',
    'Kedoshim': 'Kedoshim',
    'Emor': 'Emor',
    'Behar': 'Behar',
    'Bechukotai': 'Bechukotai',
    'Bamidbar': 'Bamidbar',
    'Nasso': 'Nasso',
    "Beha'alotcha": 'Behaalotecha',
    "Sh'lach": 'Shelach',
    'Korach': 'Korach',
    'Chukat': 'Chukat',
    'Balak': 'Balak',
    'Pinchas': 'Pinchas',
    'Matot': 'Matot',
    "Mas'ei": 'Masei',
    'Devarim': 'Devarim',
    "Va'etchanan": 'Vaetchanan',
    'Eikev': 'Eikev',
    "Re'eh": 'Reeh',
    'Shoftim': 'Shoftim',
    'Ki Teitzei': 'Ki Teitzei',
    'Ki Tavo': 'Ki Tavo',
    'Nitzavim': 'Nitzavim',
    'Vayeilech': 'Vayeilech',
    "Ha'azinu": 'Haazinu',
    "V'Zot HaBerachah": 'Vezot Haberakhah',
}

/**
 * Normalize Hebcal parsha name to our canonical format
 */
export function normalizeParsha(hebcalParsha: string): string {
    // Handle double parshas (e.g., "Vayakhel-Pekudei")
    if (hebcalParsha.includes('-')) {
        const parts = hebcalParsha.split('-')
        return parts.map(p => HEBCAL_TO_CANONICAL[p.trim()] || p.trim()).join('-')
    }
    return HEBCAL_TO_CANONICAL[hebcalParsha] || hebcalParsha
}

/**
 * Check if a shiur title matches a parsha name
 */
export function matchShiurToParsha(title: string, parshaName: string): boolean {
    const lowerTitle = title.toLowerCase()

    // Handle double parshas
    const parshas = parshaName.includes('-') ? parshaName.split('-') : [parshaName]

    for (const parsha of parshas) {
        const variants = PARSHA_VARIANTS[parsha] || [parsha]
        for (const variant of variants) {
            if (lowerTitle.includes(variant.toLowerCase())) {
                return true
            }
        }
    }

    return false
}

/**
 * Get all variant spellings for a parsha
 */
export function getParshaVariants(parshaName: string): string[] {
    // Handle double parshas
    if (parshaName.includes('-')) {
        const parts = parshaName.split('-')
        return parts.flatMap(p => PARSHA_VARIANTS[p] || [p])
    }
    return PARSHA_VARIANTS[parshaName] || [parshaName]
}
