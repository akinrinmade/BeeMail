import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'BeeMail — Email, made beautifully', description: 'Create beautiful emails with AI.' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className="bg-[#f7f8f5]"><body>{children}</body></html> }
