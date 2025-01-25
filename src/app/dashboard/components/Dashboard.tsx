'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Dashboard = dynamic(() => import('./Buttonic'), { ssr: false });

export default function Dashboar() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Dashboard />
        </Suspense>
    );
}
