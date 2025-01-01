'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import React from 'react'
import { getGoogleOauthConsentUrl } from 'src/server/auth.action'
import { toast } from 'sonner'
// import { signIn, signInSchema } from 'src/server/auth_due.actions'
//import { z } from "zod"

export default function Signin() {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            if (response.ok) {
                router.push('/dashboard')
            } else {
                const data = await response.json()
                setError(data.error || 'Prijava ni uspela. Prosimo, poskusite ponovno.')
            }
        } catch (err) {
            setError('Prišlo je do napake pri povezavi s strežnikom. Prosimo, poskusite ponovno.')
        }
    }

    // async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    //     e.preventDefault()
    //     const formData = new FormData(e.currentTarget)
    //     const values = {
    //         email: formData.get('email') as string,
    //         password: formData.get('password') as string,
    //     }
    //     const res = await signIn(values)
    //     if (res.success) {
    //         toast.success('Login successful')
    //         router.push('/podstran')
    //     } else {
    //         toast.error(res.error)
    //     }
    //     // Do something with the form values.
    //     // ✅ This will be type-safe and validated.
    //     console.log(values)
    // }

    return (
        <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-center text-white mb-8">Prijava v SENZEMO</h2>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                        E-poštni naslov
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                        Geslo
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Prijava
                    </button>
                </div>
            </form>
            <div className="mt-6">
                <button
                    onClick={async () => {
                        const res = await getGoogleOauthConsentUrl()
                        if (res.url) {
                            window.location.href = res.url
                        } else {
                            toast.error(res.error)
                        }
                    }
                    }
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                        <path fill="none" d="M1 1h22v22H1z" />
                    </svg>
                    Prijava z Google računom
                </button>
            </div>
        </div>
    )
}

