import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], variable: '--font-instrument-serif', weight: '400' })

export const metadata: Metadata = { title: 'BeeMail — Email, made beautifully', description: 'Create beautiful, structured emails with AI and send them from your own inbox.' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} bg-[var(--paper)]`}><body>{children}</body></html> }
