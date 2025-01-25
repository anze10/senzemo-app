"use client"

import dynamic from 'next/dynamic'

const SalesOverview = dynamic(() => import("./SalesOverview"), {
    ssr: false,
})

export default function Sales() {
    return (
        <div>
            <SalesOverview />
        </div>
    );
}