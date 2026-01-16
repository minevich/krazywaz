import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SponsorshipForm, { PastSponsors } from '@/components/sponsorship/SponsorshipForm'

export const metadata = {
  title: 'Sponsor a Shiur | Rabbi Kraz',
  description: 'Dedicate a shiur and support Rabbi Kraz\'s teachings. Sponsor in honor, in memory, or for a refuah sheleima.',
}

export default function SponsorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Shiur <span className="text-primary">Sponsorship</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Dedicate a lesson and support the continued spread of Torah wisdom.
          </p>
        </div>
      </div>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Form */}
          <div className="lg:col-span-7">
            <SponsorshipForm />
          </div>

          {/* Sidebar - Past Sponsors */}
          <aside className="hidden lg:block lg:col-span-5 sticky top-8">
            <PastSponsors />

            {/* Additional Info Card */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm border p-6">
              <h4 className="font-bold text-gray-900 mb-3">💡 About Sponsorships</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Your dedication will be announced at the beginning of the shiur</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Sponsors are listed on the shiur page on our website</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Tax-deductible receipts provided automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Contact <a href="mailto:rabbikraz1@gmail.com" className="text-primary hover:underline">rabbikraz1@gmail.com</a> for questions</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
