'use client'

import { BarChart3, Calendar, FileCheck, AlertTriangle, TrendingUp } from 'lucide-react'

interface AdminStatsProps {
    totalShiurim: number
    thisMonthCount: number
    withSources: number
    missingLinks: number
    drafts: number
}

export default function AdminStats({
    totalShiurim,
    thisMonthCount,
    withSources,
    missingLinks,
    drafts
}: AdminStatsProps) {
    const sourcesPercentage = totalShiurim > 0 ? Math.round((withSources / totalShiurim) * 100) : 0

    const stats = [
        {
            label: 'Total Shiurim',
            value: totalShiurim,
            icon: BarChart3,
            color: 'text-primary',
            bgColor: 'bg-primary/10'
        },
        {
            label: 'This Month',
            value: thisMonthCount,
            icon: Calendar,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            label: 'Have Sources',
            value: `${sourcesPercentage}%`,
            icon: FileCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            label: 'Missing Links',
            value: missingLinks,
            icon: AlertTriangle,
            color: missingLinks > 0 ? 'text-yellow-600' : 'text-gray-400',
            bgColor: missingLinks > 0 ? 'bg-yellow-50' : 'bg-gray-50'
        },
        {
            label: 'Drafts',
            value: drafts,
            icon: TrendingUp,
            color: drafts > 0 ? 'text-purple-600' : 'text-gray-400',
            bgColor: drafts > 0 ? 'bg-purple-50' : 'bg-gray-50'
        }
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className={`${stat.bgColor} rounded-lg p-4 flex items-center gap-3`}
                >
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    <div>
                        <div className={`text-2xl font-bold ${stat.color}`}>
                            {stat.value}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                            {stat.label}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
