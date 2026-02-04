export interface ParshaLink {
    name: string
    youtube?: string
    spotify?: string
}

export interface BookData {
    bookName: string
    parshas: ParshaLink[]
}

export const PLAYLIST_DATA: BookData[] = [
    {
        bookName: 'Bereishis',
        parshas: [
            { name: 'Bereishis', youtube: '', spotify: '' },
            { name: 'Noach', youtube: '', spotify: '' },
            { name: 'Lech Lecha', youtube: '', spotify: '' },
            { name: 'Vayera', youtube: '', spotify: '' },
            { name: 'Chayei Sarah', youtube: '', spotify: '' },
            { name: 'Toldos', youtube: '', spotify: '' },
            { name: 'Vayetzei', youtube: '', spotify: '' },
            { name: 'Vayishlach', youtube: '', spotify: '' },
            { name: 'Vayeshev', youtube: '', spotify: '' },
            { name: 'Miketz', youtube: '', spotify: '' },
            { name: 'Vayigash', youtube: '', spotify: '' },
            { name: 'Vayechi', youtube: '', spotify: '' },
        ]
    },
    {
        bookName: 'Shemos',
        parshas: [
            { name: 'Shemos', youtube: '', spotify: '' },
            { name: 'Vaera', youtube: '', spotify: '' },
            { name: 'Bo', youtube: '', spotify: '' },
            { name: 'Beshalach', youtube: '', spotify: '' },
            { name: 'Yisro', youtube: '', spotify: '' },
            { name: 'Mishpatim', youtube: '', spotify: '' },
            { name: 'Terumah', youtube: '', spotify: '' },
            { name: 'Tetzaveh', youtube: '', spotify: '' },
            { name: 'Ki Tisa', youtube: '', spotify: '' },
            { name: 'Vayakhel', youtube: '', spotify: '' },
            { name: 'Pekudei', youtube: '', spotify: '' },
        ]
    },
    {
        bookName: 'Vayikra',
        parshas: [
            { name: 'Vayikra', youtube: '', spotify: '' },
            { name: 'Tzav', youtube: '', spotify: '' },
            { name: 'Shemini', youtube: '', spotify: '' },
            { name: 'Tazria', youtube: '', spotify: '' },
            { name: 'Metzora', youtube: '', spotify: '' },
            { name: 'Acharei Mot', youtube: '', spotify: '' },
            { name: 'Kedoshim', youtube: '', spotify: '' },
            { name: 'Emor', youtube: '', spotify: '' },
            { name: 'Behar', youtube: '', spotify: '' },
            { name: 'Bechukotai', youtube: '', spotify: '' },
        ]
    },
    {
        bookName: 'Bamidbar',
        parshas: [
            { name: 'Bamidbar', youtube: '', spotify: '' },
            { name: 'Nasso', youtube: '', spotify: '' },
            { name: 'Behaalotecha', youtube: '', spotify: '' },
            { name: 'Shelach', youtube: '', spotify: '' },
            { name: 'Korach', youtube: '', spotify: '' },
            { name: 'Chukat', youtube: '', spotify: '' },
            { name: 'Balak', youtube: '', spotify: '' },
            { name: 'Pinchas', youtube: '', spotify: '' },
            { name: 'Matot', youtube: '', spotify: '' },
            { name: 'Masei', youtube: '', spotify: '' },
        ]
    },
    {
        bookName: 'Devarim',
        parshas: [
            { name: 'Devarim', youtube: '', spotify: '' },
            { name: 'Vaetchanan', youtube: '', spotify: '' },
            { name: 'Eikev', youtube: '', spotify: '' },
            { name: 'Reeh', youtube: '', spotify: '' },
            { name: 'Shoftim', youtube: '', spotify: '' },
            { name: 'Ki Teitzei', youtube: '', spotify: '' },
            { name: 'Ki Tavo', youtube: '', spotify: '' },
            { name: 'Nitzavim', youtube: '', spotify: '' },
            { name: 'Vayeilech', youtube: '', spotify: '' },
            { name: 'Haazinu', youtube: '', spotify: '' },
            { name: 'Vezot Haberakhah', youtube: '', spotify: '' },
        ]
    }
]
