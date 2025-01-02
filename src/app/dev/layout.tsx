import Script from 'next/script'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
            <Script src="/third_party/BrowserPrint-Zebra-1.1.250.min.js" />
            <Script src="/third_party/BrowserPrint-3.1.250.min.js" />
        </>
    )
}
///nerabim več ampak naj ostane 