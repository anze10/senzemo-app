"use client"

import dynamic from 'next/dynamic'

const ProductList = dynamic(() => import("./SensorList"), {
    ssr: false,
})

export default function Side() {
    return (
        <div>
            <ProductList />
        </div>
    );
}