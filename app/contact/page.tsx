'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { Send, Phone, Mail, MessageSquare } from 'lucide-react'

const SUBJECT_OPTIONS = [
    { value: '', label: 'Select a topic...' },
    { value: 'shiur-question', label: 'Question about a Shiur' },
    { value: 'torah-question', label: 'Torah Question' },
    { value: 'shiur-request', label: 'Shiur Request' },
    { value: 'speaking-engagement', label: 'Speaking Engagement' },
    { value: 'sponsorship', label: 'Sponsorship Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'feedback', label: 'Feedback / Suggestion' },
    { value: 'consultation', label: 'Private Consultation' },
    { value: 'media', label: 'Media Inquiry' },
    { value: 'other', label: 'Other' },
]

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        shiur: '',
        message: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError('')

        try {
            // TODO: Replace with Cloudflare Email Worker endpoint when domain is set up
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                setSubmitted(true)
                setFormData({ name: '', email: '', phone: '', subject: '', shiur: '', message: '' })
            } else {
                const data = await response.json() as { error?: string }
                setError(data.error || 'Failed to send message. Please try again.')
            }
        } catch (err) {
            setError('Failed to send message. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50/50">
            <Header />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3" style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
                        Contact Us
                    </h1>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Have a question, suggestion, or just want to say hello? We'd love to hear from you.
                    </p>
                </div>

                {submitted ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Send className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-semibold text-green-800 mb-2">Message Sent!</h2>
                        <p className="text-green-700">
                            Thank you for reaching out. We'll get back to you as soon as possible.
                        </p>
                        <button
                            onClick={() => setSubmitted(false)}
                            className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Send Another Message
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Name & Email Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Your name"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                                />
                            </div>
                        </div>

                        {/* Phone & Subject Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone <span className="text-gray-400">(optional)</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="(555) 123-4567"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-white"
                                >
                                    {SUBJECT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Which Shiur (conditional) */}
                        {(formData.subject === 'shiur-question' || formData.subject === 'shiur-request') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Which shiur? <span className="text-gray-400">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.shiur}
                                    onChange={(e) => setFormData({ ...formData, shiur: e.target.value })}
                                    placeholder="Enter shiur name or topic"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                                />
                            </div>
                        )}

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Message <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                rows={5}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="How can we help you?"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Send Message
                                </>
                            )}
                        </button>

                        <p className="text-center text-sm text-gray-500">
                            Or email us directly at{' '}
                            <a href="mailto:rabbikraz1@gmail.com" className="text-primary hover:underline">
                                rabbikraz1@gmail.com
                            </a>
                        </p>
                    </form>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-primary text-white/70 py-8 px-4 mt-auto">
                <div className="max-w-4xl mx-auto text-center text-sm">
                    <p>© {new Date().getFullYear()} Rabbi Kraz's Shiurim. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
