import { Suspense } from 'react'
import SourceManager from '@/components/SourceManager'

export default function SourceClipperPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SourceManager />
        </Suspense>
    )
}
