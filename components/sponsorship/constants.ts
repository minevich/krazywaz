// Sponsorship Types
export enum SponsorshipType {
    InHonorOf = 'In Honor of',
    InMemoryOf = 'In Memory of',
    RefuahSheleima = 'For a Refuah Sheleima',
    Anonymous = 'Anonymous',
    Other = 'Other',
}

export interface SponsorshipOpportunity {
    id: number
    title: string
    description: string
    amount: number
}

export const SPONSORSHIP_OPPORTUNITIES: SponsorshipOpportunity[] = [
    { id: 1, title: 'Sponsor a Month', description: 'Sponsor a month of Shiurim, including a banner on the website.', amount: 3200 },
    { id: 2, title: 'Shiur Sponsorship', description: 'Mentioned in shiur and included on shiur page on website.', amount: 720 },
    { id: 3, title: 'Website Sponsorship', description: 'Includes a banner on the website for one month.', amount: 500 },
    { id: 4, title: 'Partial Sponsor', description: 'Mentioned in shiur.', amount: 360 },
    { id: 5, title: "Rabbi's Library", description: "A sefer for Rabbi's library.", amount: 36 },
    { id: 6, title: 'Other Amount', description: 'Enter your own custom dedication amount.', amount: 0 },
]

export const SPONSORSHIP_TYPES: { value: SponsorshipType; label: string }[] = [
    { value: SponsorshipType.InHonorOf, label: 'In Honor of' },
    { value: SponsorshipType.InMemoryOf, label: 'In Memory of' },
    { value: SponsorshipType.RefuahSheleima, label: 'For a Refuah Sheleima' },
    { value: SponsorshipType.Anonymous, label: 'Anonymous' },
    { value: SponsorshipType.Other, label: 'Other / No Dedication' },
]

export const PAST_SPONSORS = [
    {
        parsha: 'Parshas Bamidbar',
        sponsorName: 'The Cohen Family',
        dedication: 'In honor of our new grandson.',
    },
    {
        parsha: 'Parshas Behar',
        sponsorName: 'David & Sarah Levy',
        dedication: 'In memory of our beloved father, Moshe ben Yaakov.',
    },
    {
        parsha: 'Parshas Emor',
        sponsorName: 'Anonymous',
        dedication: 'For a Refuah Sheleima for Chaya bas Leah.',
    },
    {
        parsha: 'Parshas Acharei Mos-Kedoshim',
        sponsorName: 'The Goldstein Foundation',
        dedication: "Continued success of Rabbi Kraz's shiurim.",
    },
]
