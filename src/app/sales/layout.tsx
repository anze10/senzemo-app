import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
//import './globals.css'
import { Navbar } from '../testic/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Inventory Management System',
    description: 'A colorful and dynamic inventory management system',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className="flex h-screen bg-gradient-to-br from-purple-100 to-blue-100">
                    <Navbar />
                    <main className="flex-1 overflow-y-auto p-6">{children}</main>
                </div>
            </body>
        </html>
    )
}

