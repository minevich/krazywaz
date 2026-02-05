'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Save, MoveUp, MoveDown, Trash2, Edit2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface Category {
    id: string
    name: string
    order: number
    isHidden: boolean
    rules: Rule[]
}

interface Rule {
    id: string
    categoryId: string
    name: string
    keywords: string[]
    order: number
}

export default function CategoriesSettingsPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const toast = useToast()

    // Edit states
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [editingRule, setEditingRule] = useState<Rule | null>(null)
    const [ruleKeywordsString, setRuleKeywordsString] = useState('')

    // New item states
    const [newCategoryName, setNewCategoryName] = useState('')
    const [showNewRuleFor, setShowNewRuleFor] = useState<string | null>(null) // categoryId
    const [newRuleName, setNewRuleName] = useState('')
    const [newRuleKeywords, setNewRuleKeywords] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/categories')
            const data = await res.json()
            setCategories(data)
        } catch (error) {
            toast.error('Failed to load categories')
        } finally {
            setLoading(false)
        }
    }

    const handleSeed = async () => {
        if (!confirm('This will reset all categories to default. Are you sure?')) return
        setLoading(true)
        try {
            await fetch('/api/admin/categories/seed', { method: 'POST' })
            await fetchData()
            toast.success('Reset to defaults')
        } catch (error) {
            toast.error('Error seeding data')
        } finally {
            setLoading(false)
        }
    }

    const moveCategory = async (index: number, direction: 'up' | 'down') => {
        const newCategories = [...categories]
        if (direction === 'up' && index > 0) {
            [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]]
        } else if (direction === 'down' && index < newCategories.length - 1) {
            [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]]
        } else {
            return
        }

        // Optimistic update
        setCategories(newCategories)

        // Save order to server (batch update logic would be better, but loop for now)
        // Or specific endpoint for reorder. For now, just update the touched ones.
        // Actually, let's just update the `order` property locally and rely on a "Save Order" button?
        // Or update immediately.

        // Update indices
        newCategories.forEach((c, i) => c.order = i)
        setCategories(newCategories)

        // Call API for each updated category (inefficient but simple for MVP)
        // Better: POST /api/admin/categories/reorder
        // For now, I'll allow "Edit" to change order number or just swapping.
        // Let's implement single update for simplicity in MVP
        const cat1 = newCategories[index]
        const cat2 = direction === 'up' ? newCategories[index + 1] : newCategories[index - 1] // The one swapped with

        // Actually, easier to loop and update all order on server?
        // I'll stick to a "Save Order" implementation if user requests, but for now individual updates is laggy.
        // Let's just update the specific changed item via API.

        // Simpler approach: Just update the `order` field of the moved item in UI, 
        // and then trigger a re-fetch or specific PUT.

        // To save complexity, I'll skipping auto-save on move for a second and just implement the specific action:
        const target = newCategories[index]
        const other = direction === 'up' ? newCategories[index + 1] : newCategories[index - 1] // Wait, index is NEW index.

        // Let's skip complex reorder logic and just do simple editing for now? 
        // No, user asked for order control.

        // I'll implement a simple loop update.
        try {
            await Promise.all(newCategories.map((c, i) =>
                fetch(`/api/admin/categories/${c.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ order: i })
                })
            ))
        } catch (e) { toast.error('Error saving order') }
    }

    const addCategory = async () => {
        if (!newCategoryName.trim()) return
        try {
            const res = await fetch('/api/admin/categories', {
                method: 'POST',
                body: JSON.stringify({ name: newCategoryName, order: categories.length })
            })
            if (res.ok) {
                setNewCategoryName('')
                fetchData()
            }
        } catch (e) { toast.error('Error creating category') }
    }

    const addRule = async (categoryId: string) => {
        if (!newRuleName.trim()) return
        const keywords = newRuleKeywords.split(',').map(s => s.trim()).filter(Boolean)
        if (keywords.length === 0) keywords.push(newRuleName)

        try {
            const res = await fetch('/api/admin/rules', {
                method: 'POST',
                body: JSON.stringify({
                    categoryId,
                    name: newRuleName,
                    keywords,
                    order: 999 // Put at end
                })
            })
            if (res.ok) {
                setNewRuleName('')
                setNewRuleKeywords('')
                setShowNewRuleFor(null)
                fetchData()
            }
        } catch (e) { toast.error('Error adding rule') }
    }

    const deleteCategory = async (id: string) => {
        if (!confirm('Delete this category?')) return
        await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
        fetchData()
    }

    const deleteRule = async (id: string) => {
        if (!confirm('Delete this rule?')) return
        await fetch(`/api/admin/rules/${id}`, { method: 'DELETE' })
        fetchData()
    }

    const saveRule = async () => {
        if (!editingRule) return
        const keywords = ruleKeywordsString.split(',').map(s => s.trim()).filter(Boolean)

        await fetch(`/api/admin/rules/${editingRule.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: editingRule.name,
                keywords
            })
        })
        setEditingRule(null)
        fetchData()
    }

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></Link>
                        <h1 className="text-xl font-bold">Category Manager</h1>
                    </div>
                    <button onClick={handleSeed} className="text-sm text-gray-500 underline">Reset / Seed Defaults</button>
                    <button onClick={fetchData} className="p-2 bg-gray-100 rounded hover:bg-gray-200"><Loader2 className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                {/* Categories */}
                <div className="space-y-4">
                    {categories.map((category, index) => (
                        <div key={category.id} className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => moveCategory(index, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                                        <button onClick={() => moveCategory(index, 'down')} disabled={index === categories.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                                    </div>
                                    <h2 className="text-lg font-bold text-primary">{category.name}</h2>
                                    {category.isHidden && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">Hidden</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => deleteCategory(category.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {/* Rules List */}
                            <div className="pl-8 space-y-2">
                                {category.rules.map((rule) => (
                                    <div key={rule.id} className="flex items-start justify-between bg-gray-50 p-3 rounded group">
                                        {editingRule?.id === rule.id ? (
                                            <div className="flex-1 flex gap-2 items-center">
                                                <input
                                                    value={editingRule.name}
                                                    onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                                                    className="border p-1 rounded text-sm w-32"
                                                />
                                                <input
                                                    value={ruleKeywordsString}
                                                    onChange={e => setRuleKeywordsString(e.target.value)}
                                                    className="border p-1 rounded text-sm flex-1"
                                                />
                                                <button onClick={saveRule} className="text-green-600"><Save className="w-4 h-4" /></button>
                                                <button onClick={() => setEditingRule(null)} className="text-gray-500">Cancel</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <div className="font-medium text-sm">{rule.name}</div>
                                                    <div className="text-xs text-gray-500">{rule.keywords.join(', ')}</div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingRule(rule)
                                                            setRuleKeywordsString(rule.keywords.join(', '))
                                                        }}
                                                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                                    ><Edit2 className="w-3 h-3" /></button>
                                                    <button onClick={() => deleteRule(rule.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}

                                {/* Add Rule */}
                                {showNewRuleFor === category.id ? (
                                    <div className="bg-blue-50 p-3 rounded flex gap-2 flex-col md:flex-row">
                                        <input
                                            placeholder="Rule Name (e.g. My Parsha)"
                                            value={newRuleName}
                                            onChange={e => setNewRuleName(e.target.value)}
                                            className="border p-1.5 rounded text-sm flex-1"
                                        />
                                        <input
                                            placeholder="Keywords (comma separated, e.g. Name, Alias)"
                                            value={newRuleKeywords}
                                            onChange={e => setNewRuleKeywords(e.target.value)}
                                            className="border p-1.5 rounded text-sm flex-[2]"
                                        />
                                        <button onClick={() => addRule(category.id)} className="bg-primary text-white px-3 py-1 rounded text-sm">Add</button>
                                        <button onClick={() => setShowNewRuleFor(null)} className="text-gray-500 text-sm">Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowNewRuleFor(category.id)} className="flex items-center gap-1 text-sm text-primary hover:underline pl-1 py-1">
                                        <Plus className="w-3 h-3" /> Add Rule
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* New Category */}
                    <div className="bg-gray-100 border-dashed border-2 border-gray-300 rounded-xl p-4 flex items-center gap-3">
                        <input
                            placeholder="New Category Name"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            className="flex-1 p-2 rounded border bg-white"
                        />
                        <button onClick={addCategory} className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
