import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { systemCategories, systemCategoryRules } from '@/lib/schema'

export const dynamic = 'force-dynamic'

const DEFAULT_STRUCTURE = {
    'Bereishis': [
        'Bereishis', 'Noach', 'Lech Lecha', 'Vayera', 'Chayei Sarah', 'Toldos',
        'Vayetzei', 'Vayishlach', 'Vayeshev', 'Miketz', 'Vayigash', 'Vayechi'
    ],
    'Shemos': [
        'Shemos', 'Vaera', 'Bo', 'Beshalach', 'Yisro', 'Mishpatim',
        'Terumah', 'Tetzaveh', 'Ki Sisa', 'Vayakhel', 'Pekudei'
    ],
    'Vayikra': [
        'Vayikra', 'Tzav', 'Shemini', 'Tazria', 'Metzora', 'Acharei Mot',
        'Kedoshim', 'Emor', 'Behar', 'Bechukotai'
    ],
    'Bamidbar': [
        'Bamidbar', 'Nasso', 'Behaalotecha', 'Shelach', 'Korach', 'Chukas',
        'Balak', 'Pinchas', 'Matot', 'Masei'
    ],
    'Devarim': [
        'Devarim', 'Vaetchanan', 'Eikev', 'Reeh', 'Shoftim', 'Ki Seitzei',
        'Ki Tavo', 'Nitzavim', 'Vayeilech', 'Haazinu', 'Vezot Haberakhah'
    ],
    'Holidays': [
        'Rosh Hashanah', 'Yom Kippur', 'Sukkos', 'Chanukah', 'Purim', 'Pesach',
        'Shavuos', 'Tisha B\'Av', 'Rosh Chodesh', 'Lag BaOmer'
    ]
}

const DEFAULT_KEYWORDS: Record<string, string[]> = {
    'Bereishis': ['Bereishis', 'Bereshit', 'Genesis'],
    'Noach': ['Noach', 'Noah'],
    'Lech Lecha': ['Lech Lecha', 'Lech-Lecha'],
    'Vayera': ['Vayera', 'Vayeira'],
    'Chayei Sarah': ['Chayei Sarah', 'Chayei-Sarah', 'Chaye Sarah'],
    'Toldos': ['Toldos', 'Toldot', 'Toledot'],
    'Vayetzei': ['Vayetzei', 'Vayetze', 'Vayeitzei'],
    'Vayishlach': ['Vayishlach', 'Vayishlah'],
    'Vayeshev': ['Vayeshev', 'Vayeishev'],
    'Miketz': ['Miketz', 'Mikeitz'],
    'Vayigash': ['Vayigash'],
    'Vayechi': ['Vayechi', 'Vaychi'],
    'Shemos': ['Shemos', 'Shemot', 'Exodus'],
    'Vaera': ['Vaera', 'Va\'era', 'Va\'eira', 'Vaeira'],
    'Bo': ['Bo'],
    'Beshalach': ['Beshalach', 'Beshallach'],
    'Yisro': ['Yisro', 'Yitro', 'Jethro'],
    'Mishpatim': ['Mishpatim'],
    'Terumah': ['Terumah', 'Trumah'],
    'Tetzaveh': ['Tetzaveh', 'Tetzave'],
    'Ki Sisa': ['Ki Tisa', 'Ki Tissa', 'Ki-Tisa', 'Ki Sisa'],
    'Vayakhel': ['Vayakhel', 'Vayakeil'],
    'Pekudei': ['Pekudei', 'Pekude'],
    'Vayikra': ['Vayikra', 'Leviticus'],
    'Tzav': ['Tzav', 'Tsav'],
    'Shemini': ['Shemini', 'Shmini'],
    'Tazria': ['Tazria', 'Tazri\'a'],
    'Metzora': ['Metzora', 'Metzorah'],
    'Acharei Mot': ['Acharei Mot', 'Acharei', 'Achrei Mot'],
    'Kedoshim': ['Kedoshim', 'Kdoshim'],
    'Emor': ['Emor'],
    'Behar': ['Behar', 'B\'har'],
    'Bechukotai': ['Bechukotai', 'Bechukosai', 'Behukotai'],
    'Bamidbar': ['Bamidbar', 'Bemidbar', 'Numbers'],
    'Nasso': ['Nasso', 'Naso'],
    'Behaalotecha': ['Behaalotecha', 'Beha\'alotcha', 'Behaalosecha'],
    'Shelach': ['Shelach', 'Shlach', 'Sh\'lach'],
    'Korach': ['Korach', 'Korah'],
    'Chukas': ['Chukat', 'Chukkat', 'Hukat', 'Chukas'],
    'Balak': ['Balak'],
    'Pinchas': ['Pinchas', 'Pinhas', 'Phineas'],
    'Matot': ['Matot', 'Matos'],
    'Masei': ['Masei', 'Masse', 'Masey'],
    'Devarim': ['Devarim', 'Deuteronomy', 'D\'varim', 'Dvorim'],
    'Vaetchanan': ['Vaetchanan', 'Va\'etchanan', 'Vaeschanan', 'Va\'eschanan', 'V\'eschanan'],
    'Eikev': ['Eikev', 'Ekev'],
    'Reeh': ['Reeh', 'Re\'eh', 'R\'eih'],
    'Shoftim': ['Shoftim', 'Shofetim'],
    'Ki Seitzei': ['Ki Teitzei', 'Ki Tetzei', 'Ki Tetze', 'Ki-Teitzei', 'Ki Seitzei', 'Ki-Seitzei'],
    'Ki Tavo': ['Ki Tavo', 'Ki Savo', 'Ki-Tavo'],
    'Nitzavim': ['Nitzavim', 'Nitsavim'],
    'Vayeilech': ['Vayeilech', 'Vayelech'],
    'Haazinu': ['Haazinu', 'Ha\'azinu'],
    'Vezot Haberakhah': ['Vezot Haberakhah', 'V\'zot Habracha', 'Zos Habracha'],
    'Rosh Hashanah': ['Rosh Hashanah', 'Rosh Hashana'],
    'Yom Kippur': ['Yom Kippur'],
    'Sukkos': ['Sukkos', 'Sukkot'],
    'Chanukah': ['Chanukah', 'Hanukkah'],
    'Purim': ['Purim'],
    'Pesach': ['Pesach', 'Passover'],
    'Shavuos': ['Shavuos', 'Shavuot'],
    'Tisha B\'Av': ['Tisha B\'Av', 'Tisha Bav', 'Three Weeks'],
    'Rosh Chodesh': ['Rosh Chodesh'],
    'Lag BaOmer': ['Lag BaOmer']
}

export async function POST() {
    try {
        const d1 = await getD1Database()
        if (!d1) return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        const db = getDb(d1)

        // Clear existing? Maybe not, safety first.
        // Assuming empty DB for seed.

        let categoryIndex = 0
        for (const [bookName, parshas] of Object.entries(DEFAULT_STRUCTURE)) {
            // Create Category
            const category = await db.insert(systemCategories)
                .values({
                    name: bookName,
                    order: categoryIndex++
                })
                .returning()
                .get()

            // Create Rules
            let ruleIndex = 0
            for (const parshaName of parshas) {
                const keywords = DEFAULT_KEYWORDS[parshaName] || [parshaName]
                await db.insert(systemCategoryRules)
                    .values({
                        categoryId: category.id,
                        name: parshaName,
                        keywords: JSON.stringify(keywords),
                        order: ruleIndex++
                    })
                    .execute()
            }
        }

        return NextResponse.json({ success: true, message: 'Database seeded with defaults' })
    } catch (error: any) {
        console.error('Error seeding categories:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
