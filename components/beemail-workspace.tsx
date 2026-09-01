'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bell, CalendarClock, CalendarDays, Check,
  CheckCircle2, ChevronDown, Cloud, Copy, Eye, FileImage, FileText, Grid2X2, Heart,
  Image as ImageIcon, LayoutTemplate, Library, Loader2, Mail, Megaphone, Menu, MessageCircle,
  Minus, Monitor, MoreHorizontal, MousePointerClick, PenLine, Plus, Redo2, Search, Send, Settings as SettingsIcon,
  ShieldCheck, Smartphone, Sparkles, Trash2, Type, Undo2, Wand2, X,
  type LucideIcon,
} from 'lucide-react'

/* ─── Email document model ─────────────────────────────────────────────── */

type BlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social'
type EmailBlock = { id: number; type: BlockType; title: string; body?: string; rev?: number }
type EmailDoc = { title: string; subject: string; blocks: EmailBlock[] }

let blockSeq = 1
const b = (type: BlockType, title: string, body?: string): EmailBlock => ({ id: blockSeq++, type, title, body })

/* Each job maps a communication intent to a *designed* document, not just text.
   This is the product thesis in code: idea → structure → email. */
type Job = {
  id: string
  label: string
  hint: string
  icon: LucideIcon
  accent: 'honey' | 'sage' | 'sky' | 'blush'
  placeholder: string
  examples: string[]
  compose: (brief: string) => EmailDoc
}

const lead = (brief: string, fallback: string) => {
  const t = brief.trim()
  if (!t) return fallback
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.')
}

const JOBS: Job[] = [
  {
    id: 'followup', label: 'Follow up with a client', hint: 'Warm, low-pressure, easy to reply to',
    icon: MessageCircle, accent: 'honey',
    placeholder: 'e.g. Follow up on last week’s proposal and offer a quick call this week',
    examples: ['Check in after our proposal', 'See if they had questions', 'Nudge on the contract'],
    compose: (brief) => ({
      title: 'Client follow-up', subject: 'Following up — whenever you’re ready',
      blocks: [
        b('heading', 'Circling back'),
        b('text', 'Hi there,', lead(brief, 'I wanted to follow up on what we shared last week — no rush at all, just keeping it on your radar.')),
        b('text', 'If it’s helpful, I’m happy to jump on a quick call and walk through anything that’s still open.'),
        b('button', 'Grab 15 minutes'),
        b('text', 'Warmly,\nAlex', 'Reply here anytime — I read every note.'),
      ],
    }),
  },
  {
    id: 'event', label: 'Invite people to an event', hint: 'Clear details, one obvious action',
    icon: CalendarDays, accent: 'sky',
    placeholder: 'e.g. Invite our community to a studio open house on the 24th, 6pm, drinks + a short talk',
    examples: ['Studio open house', 'A small dinner for clients', 'Product launch evening'],
    compose: (brief) => ({
      title: 'Event invitation', subject: 'You’re invited',
      blocks: [
        b('heading', 'You’re invited'),
        b('text', lead(brief, 'We’re hosting an evening together, and we’d love for you to be in the room.')),
        b('image', 'The invitation'),
        b('text', 'When', 'Thursday the 24th · 6:00pm\nThe studio · light bites and drinks'),
        b('button', 'Save your spot'),
        b('text', 'Hope to see you,\nAlex'),
      ],
    }),
  },
  {
    id: 'announce', label: 'Announce something new', hint: 'A moment worth reading twice',
    icon: Megaphone, accent: 'sage',
    placeholder: 'e.g. Announce our new brand identity and the thinking behind it',
    examples: ['A new product', 'A rebrand', 'A big milestone'],
    compose: (brief) => ({
      title: 'Announcement', subject: 'Something new from us',
      blocks: [
        b('heading', 'Something worth sharing'),
        b('text', 'Hi everyone,', lead(brief, 'We’ve been quietly working on something we’re genuinely proud of — and today we get to share it with you.')),
        b('image', 'The reveal'),
        b('button', 'See what’s new'),
        b('divider', ''),
        b('text', 'Thank you for being here from the start.\nAlex & the team'),
      ],
    }),
  },
  {
    id: 'meeting', label: 'Ask for a meeting', hint: 'Respectful of their time',
    icon: CalendarClock, accent: 'blush',
    placeholder: 'e.g. Ask a prospect for 20 minutes next week to explore working together',
    examples: ['Intro call with a prospect', 'Coffee with a mentor', 'Kickoff with a new client'],
    compose: (brief) => ({
      title: 'Meeting request', subject: 'Could I borrow 20 minutes?',
      blocks: [
        b('heading', 'Finding time to talk'),
        b('text', 'Hi there,', lead(brief, 'I’d love to find twenty minutes to talk properly — I think there’s something worth exploring together.')),
        b('button', 'Pick a time that works'),
        b('text', 'No pressure if the timing’s off — happy to work around you.\nAlex'),
      ],
    }),
  },
  {
    id: 'proposal', label: 'Send a proposal', hint: 'Confident, structured, skimmable',
    icon: FileText, accent: 'honey',
    placeholder: 'e.g. Send a design retainer proposal — scope, timeline, and next steps',
    examples: ['A design retainer', 'A project quote', 'A partnership'],
    compose: (brief) => ({
      title: 'Proposal', subject: 'A proposal, put together for you',
      blocks: [
        b('heading', 'A proposal for you'),
        b('text', 'Hi there,', lead(brief, 'Here’s a clear look at how we’d work together, what’s included, and what happens next.')),
        b('divider', ''),
        b('text', 'What’s included', 'Strategy, design, and hands-on delivery — end to end, with room to adapt as we learn.'),
        b('button', 'Review the proposal'),
        b('text', 'Looking forward to it,\nAlex'),
      ],
    }),
  },
  {
    id: 'thanks', label: 'Thank someone', hint: 'Short, sincere, generous',
    icon: Heart, accent: 'blush',
    placeholder: 'e.g. Thank a client for trusting us with their launch this year',
    examples: ['A client after a project', 'A teammate', 'Someone who referred us'],
    compose: (brief) => ({
      title: 'Thank you', subject: 'A quick, genuine thank you',
      blocks: [
        b('heading', 'Thank you'),
        b('spacer', ''),
        b('text', lead(brief, 'I’ve been meaning to say it properly: thank you. It genuinely meant a lot.')),
        b('text', 'Whenever there’s something I can do in return, you know where to find me.\nAlex'),
      ],
    }),
  },
  {
    id: 'custom', label: 'Write something else', hint: 'Describe it in your own words',
    icon: Wand2, accent: 'sage',
    placeholder: 'e.g. A warm note to our newsletter about what we learned this month',
    examples: ['A monthly update', 'A heartfelt note', 'A gentle reminder'],
    compose: (brief) => ({
      title: 'New email', subject: lead(brief, 'A note from me'),
      blocks: [
        b('heading', 'A note worth opening'),
        b('text', 'Hi there,', lead(brief, 'I wanted to write something thoughtful, and share it while it still felt fresh.')),
        b('button', 'Take a closer look'),
        b('text', 'Warmly,\nAlex'),
      ],
    }),
  },
]

const blankDoc = (): EmailDoc => ({
  title: 'Untitled email', subject: '',
  blocks: [b('heading', 'Your headline here'), b('text', 'Hi there,', 'Start writing, or ask BeeMail to shape it for you.')],
})

const emails = [
  { name: 'Weekend notes', subject: 'A little something for you', status: 'Draft', date: 'Edited today', tone: 'honey' },
  { name: 'Welcome to the studio', subject: 'Let’s make something beautiful', status: 'Sent', date: 'Aug 28, 2026', tone: 'sage' },
  { name: 'The August edit', subject: 'Five things worth sharing', status: 'Draft', date: 'Aug 21, 2026', tone: 'sky' },
  { name: 'Client handoff', subject: 'Everything in one place', status: 'Sent', date: 'Aug 14, 2026', tone: 'blush' },
]

const accentBg: Record<Job['accent'], string> = {
  honey: 'bg-[var(--honey-pale)]', sage: 'bg-[var(--sage)]', sky: 'bg-[var(--sky)]', blush: 'bg-[var(--blush)]',
}

/* ─── Primitives ───────────────────────────────────────────────────────── */

function Button({ children, primary = false, onClick, className = '', type = 'button', disabled = false }: { children: React.ReactNode; primary?: boolean; onClick?: () => void; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-px disabled:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--honey)] ${primary ? 'bg-[var(--deep)] text-[var(--surface)] hover:bg-[var(--deep-strong)]' : 'bg-[var(--surface)] text-[var(--ink)] ring-1 ring-[var(--line)] hover:bg-[var(--paper)]'} ${className}`}>{children}</button>
}

function Logo() { return <div className="flex items-center gap-2 px-2 py-2"><div className="relative grid size-8 place-items-center rounded-[11px] bg-[var(--deep)] text-[var(--honey)] shadow-[0_5px_14px_rgba(30,69,54,.16)]"><span className="font-serif text-xl leading-none">B</span><span className="absolute bottom-1 right-1 size-1.5 rounded-full bg-[var(--honey)]" aria-hidden="true" /></div><span className="font-serif text-[1.45rem] leading-none tracking-[-0.04em]">BeeMail</span></div> }

/* ─── AI text engine ───────────────────────────────────────────────────────
   Deterministic, believable transforms so the in-editor AI feels reliable
   rather than random. Each one visibly and correctly changes the copy. */

const CONTRACTIONS: [RegExp, string][] = [
  [/\bI’m\b/g, 'I am'], [/\bwe’re\b/g, 'we are'], [/\byou’re\b/g, 'you are'],
  [/\bit’s\b/g, 'it is'], [/\bthat’s\b/g, 'that is'], [/\bhere’s\b/g, 'here is'],
  [/\bdon’t\b/g, 'do not'], [/\bdoesn’t\b/g, 'does not'], [/\bcan’t\b/g, 'cannot'],
  [/\bwon’t\b/g, 'will not'], [/\bI’d\b/g, 'I would'], [/\bwe’d\b/g, 'we would'],
  [/\blet’s\b/g, 'let us'], [/\bI’ll\b/g, 'I will'], [/\bwe’ll\b/g, 'we will'],
]
const WARM: [RegExp, string][] = [
  [/\bI wanted to\b/g, 'I’ve been meaning to'],
  [/\bHere’s\b/g, 'I’m so glad to share'],
  [/\bLet me know\b/g, 'I’d genuinely love to hear'],
  [/\bReach out\b/gi, 'Just say the word'],
  [/\bHi there\b/g, 'Hello, lovely'],
]
const REPHRASE: [RegExp, string][] = [
  [/\bfollow up\b/gi, 'check in'], [/\bquick\b/gi, 'short'],
  [/\bgreat\b/gi, 'wonderful'], [/\breach out\b/gi, 'get in touch'],
  [/\bwe’d love\b/gi, 'we’d be delighted'],
]
const apply = (list: [RegExp, string][]) => (s: string) => list.reduce((a, [re, r]) => a.replace(re, r), s)
const makeFormal = apply(CONTRACTIONS)
const warmer = apply(WARM)
const rephrase = apply(REPHRASE)
const concise = (s: string) => {
  const parts = s.split(/(?<=[.!?])\s+/).filter(Boolean)
  return parts.length > 1 ? parts.slice(0, Math.max(1, parts.length - 1)).join(' ') : s
}
const EXPAND = ' If it’s helpful, I’m happy to share more whenever the timing’s right.'
const expand = (s: string) => (/more whenever/.test(s) ? s : `${s.replace(/\s+$/, '')}${EXPAND}`)
const routeAsk = (t: string): ((s: string) => string) => {
  const q = t.toLowerCase()
  if (/(short|concise|tighten|trim|brief|cut)/.test(q)) return concise
  if (/(formal|professional|polished|serious)/.test(q)) return makeFormal
  if (/(warm|friendl|kind|personal|human|soft)/.test(q)) return warmer
  if (/(expand|longer|detail|more|elaborate)/.test(q)) return expand
  return rephrase
}
const bumpBlock = (bl: EmailBlock, fn: (s: string) => string): EmailBlock => ({
  ...bl, title: fn(bl.title), body: bl.body !== undefined ? fn(bl.body) : bl.body, rev: (bl.rev ?? 0) + 1,
})

/* ─── Editable (direct manipulation on the canvas) ─────────────────────── */

function Editable({ value, rev = 0, editable = false, onChange, className = '', as = 'div', multiline = false }: {
  value: string; rev?: number; editable?: boolean; onChange?: (v: string) => void
  className?: string; as?: 'div' | 'h2' | 'span'; multiline?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  // Uncontrolled by design: only write to the DOM when the value truly diverges
  // (AI edit / external change), never on the user's own keystroke — keeps the caret still.
  useEffect(() => { const el = ref.current; if (el && el.textContent !== value) el.textContent = value }, [value, rev])
  const Tag = as as any
  if (!editable) return <Tag className={className}>{value}</Tag>
  return <Tag
    ref={ref}
    contentEditable
    suppressContentEditableWarning
    role="textbox"
    aria-multiline={multiline}
    tabIndex={0}
    spellCheck
    onInput={(e: React.FormEvent<HTMLElement>) => onChange?.(e.currentTarget.textContent || '')}
    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && !multiline) e.preventDefault() }}
    className={`${className} cursor-text rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--honey)]/45 focus:ring-offset-2 focus:ring-offset-[var(--surface)]`}
  />
}

/* ─── Canvas (shared render of the document model) ─────────────────────── */

function Canvas({ blocks, selected, onSelect, device = 'desktop', editable = false, onEdit }: {
  blocks: EmailBlock[]; selected: number; onSelect?: (id: number) => void; device?: 'desktop' | 'mobile'
  editable?: boolean; onEdit?: (id: number, field: 'title' | 'body', value: string) => void
}) {
  return <div className={`mx-auto w-full rounded-[1.4rem] bg-[var(--surface)] p-5 shadow-[var(--shadow)] ring-1 ring-[var(--line)]/70 transition-[max-width] duration-300 sm:p-8 ${device === 'mobile' ? 'max-w-[380px]' : 'max-w-[640px]'}`}>
    <div className="rounded-xl bg-[var(--deep)] px-6 py-7 text-center text-[var(--surface)]"><p className="font-serif text-2xl tracking-[-0.03em]">BeeMail</p><div className="mx-auto mt-4 h-px w-10 bg-[var(--honey)]" /></div>
    <div className="flex flex-col">{blocks.map(block => {
      const active = selected === block.id
      const ring = editable ? (active ? 'z-10 rounded-lg outline-2 outline-dashed outline-[var(--honey)] outline-offset-4' : 'rounded-lg hover:outline-1 hover:outline-dashed hover:outline-[var(--line)]') : ''
      return <div key={block.id} onClick={editable ? () => onSelect?.(block.id) : undefined} className={`group relative text-left transition ${editable ? 'cursor-pointer' : ''} ${ring}`}>
        {block.type === 'heading' && <div className="px-5 pb-3 pt-9"><Editable as="h2" value={block.title} rev={block.rev} editable={editable} onChange={v => onEdit?.(block.id, 'title', v)} className="font-serif text-4xl leading-none tracking-[-0.04em]" /></div>}
        {block.type === 'text' && <div className="px-5 py-4"><Editable value={block.title} rev={block.rev} editable={editable} multiline onChange={v => onEdit?.(block.id, 'title', v)} className="whitespace-pre-line text-base leading-7" />{block.body !== undefined && (block.body !== '' || editable) && <Editable value={block.body ?? ''} rev={block.rev} editable={editable} multiline onChange={v => onEdit?.(block.id, 'body', v)} className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--muted)]" />}</div>}
        {block.type === 'image' && <div className="mx-5 my-5 grid h-44 place-items-center rounded-xl bg-[var(--honey-pale)] text-[var(--deep)]"><ImageIcon /><span className="ml-2 text-sm font-semibold">{block.title}</span></div>}
        {block.type === 'button' && <div className="px-5 py-5"><span className="inline-flex items-center rounded-full bg-[var(--honey)] px-5 py-3 text-sm font-bold text-[var(--deep)]"><Editable as="span" value={block.title} rev={block.rev} editable={editable} onChange={v => onEdit?.(block.id, 'title', v)} /> <ArrowRight className="ml-2" /></span></div>}
        {block.type === 'divider' && <div className="px-5 py-6"><div className="h-px bg-[var(--line)]" /></div>}
        {block.type === 'spacer' && <div className="h-8" />}
        {block.type === 'social' && <div className="flex justify-center gap-4 py-6 text-xs font-bold text-[var(--muted)]">Instagram · LinkedIn · Website</div>}
      </div>
    })}</div>
    <div className="mt-4 border-t border-[var(--line)] pt-4 text-center text-[11px] leading-5 text-[var(--muted)]">Sent with care via BeeMail · <span className="underline">Unsubscribe</span></div>
  </div>
}

/* ─── AI creation flow (the product thesis) ────────────────────────────── */

const STAGES = [
  { label: 'Understanding your intent', reveal: 0 },
  { label: 'Choosing the right structure', reveal: 1 },
  { label: 'Writing in your voice', reveal: 2 },
  { label: 'Designing the layout', reveal: 4 },
  { label: 'Composing your email', reveal: 99 },
]

function Generating({ job, brief, onDone }: { job: Job; brief: string; onDone: (doc: EmailDoc) => void }) {
  const doc = useMemo(() => job.compose(brief), [job, brief])
  const [stage, setStage] = useState(0)
  const [revealed, setRevealed] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    const timers: number[] = []
    STAGES.forEach((s, i) => {
      timers.push(window.setTimeout(() => {
        setStage(i)
        setRevealed(Math.min(doc.blocks.length, s.reveal === 99 ? doc.blocks.length : s.reveal + 1))
      }, i * 620))
    })
    timers.push(window.setTimeout(() => { if (!done.current) { done.current = true; onDone(doc) } }, STAGES.length * 620 + 700))
    return () => timers.forEach(clearTimeout)
  }, [doc, onDone])

  return <div className="grid min-h-[60vh] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
    <div>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--deep)] ${accentBg[job.accent]}`}><job.icon className="size-4" /> {job.label}</span>
      <h2 className="mt-6 font-serif text-5xl leading-[0.95] tracking-[-0.04em] text-[var(--surface)]">Composing your email.</h2>
      <ul className="mt-8 flex flex-col gap-3">{STAGES.map((s, i) => <li key={s.label} className="flex items-center gap-3 text-sm">{i < stage ? <CheckCircle2 className="size-5 text-[var(--honey)]" /> : i === stage ? <Loader2 className="size-5 animate-spin text-[var(--honey)]" /> : <span className="size-5 rounded-full border border-[var(--surface-muted)]/30" />}<span className={i <= stage ? 'font-medium text-[var(--surface)]' : 'text-[var(--surface-muted)]'}>{s.label}</span></li>)}</ul>
    </div>
    <div className="relative">
      <div className="pointer-events-none">
        <Canvas blocks={doc.blocks.slice(0, revealed)} selected={0} onSelect={() => {}} />
      </div>
    </div>
  </div>
}

function ComposeFlow({ initialJob, onCancel, onDone }: { initialJob: Job | null; onCancel: () => void; onDone: (doc: EmailDoc) => void }) {
  const [job, setJob] = useState<Job | null>(initialJob)
  const [brief, setBrief] = useState('')
  const [step, setStep] = useState<'intent' | 'brief' | 'generating'>(initialJob ? 'brief' : 'intent')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (step === 'brief') taRef.current?.focus() }, [step])

  const submitBrief = () => setStep('generating')

  return <main className="relative min-h-screen bg-[var(--deep)] text-[var(--surface)]">
    <header className="flex items-center justify-between px-5 py-5 md:px-8">
      <Logo />
      <button onClick={onCancel} className="flex items-center gap-2 rounded-full border border-[var(--surface-muted)]/25 px-4 py-2 text-sm text-[var(--surface-muted)] transition hover:border-[var(--honey)] hover:text-[var(--honey)]"><X className="size-4" /> Cancel</button>
    </header>

    <div className="mx-auto w-full max-w-5xl px-5 pb-16 md:px-8">
      {step === 'intent' && <section>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--honey)]">Start with the job, not the layout</p>
        <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-balance md:text-7xl">What are you trying to send?</h1>
        <p className="mt-5 max-w-md text-[15px] leading-7 text-[var(--surface-muted)]">Pick the moment. BeeMail understands the email behind it — the structure, the tone, and the design.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{JOBS.map(j => <button key={j.id} onClick={() => { setJob(j); setStep('brief') }} className="group flex items-start gap-4 rounded-2xl border border-[var(--surface-muted)]/15 bg-[var(--deep-strong)] p-5 text-left transition hover:-translate-y-1 hover:border-[var(--honey)]">
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-[var(--deep)] ${accentBg[j.accent]}`}><j.icon className="size-5" /></span>
          <span className="min-w-0"><span className="block font-semibold leading-tight">{j.label}</span><span className="mt-1 block text-xs leading-5 text-[var(--surface-muted)]">{j.hint}</span></span>
        </button>)}</div>
      </section>}

      {step === 'brief' && job && <section className="mx-auto max-w-2xl pt-6">
        <button onClick={() => setStep('intent')} className="flex items-center gap-2 text-sm text-[var(--surface-muted)] transition hover:text-[var(--honey)]"><ArrowLeft className="size-4" /> Choose a different goal</button>
        <span className={`mt-8 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--deep)] ${accentBg[job.accent]}`}><job.icon className="size-4" /> {job.label}</span>
        <h1 className="mt-5 font-serif text-4xl leading-[0.98] tracking-[-0.04em] text-balance md:text-5xl">Tell me what matters.</h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--surface-muted)]">A sentence is plenty. I’ll handle the rest — you keep the final word.</p>
        <div className="mt-7 rounded-2xl border border-[var(--surface-muted)]/20 bg-[var(--deep-strong)] p-3 focus-within:border-[var(--honey)]">
          <textarea ref={taRef} value={brief} onChange={e => setBrief(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) submitBrief() }} rows={4} placeholder={job.placeholder} className="w-full resize-none bg-transparent p-2 text-[15px] leading-7 text-[var(--surface)] outline-none placeholder:text-[var(--surface-muted)]/70" />
          <div className="flex flex-wrap gap-2 border-t border-[var(--surface-muted)]/15 px-2 pt-3">{job.examples.map(x => <button key={x} onClick={() => setBrief(x)} className="rounded-full border border-[var(--surface-muted)]/20 px-3 py-1.5 text-xs text-[var(--surface-muted)] transition hover:border-[var(--honey)] hover:text-[var(--honey)]">{x}</button>)}</div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="hidden text-xs text-[var(--surface-muted)] sm:block">Press <kbd className="rounded border border-[var(--surface-muted)]/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide">Cmd + Enter</kbd> to compose</p>
          <Button primary onClick={submitBrief} className="ml-auto bg-[var(--honey)] text-[var(--deep)] hover:bg-[var(--honey-pale)]"><Sparkles className="size-4" /> Compose my email</Button>
        </div>
      </section>}

      {step === 'generating' && job && <Generating job={job} brief={brief} onDone={onDone} />}
    </div>
  </main>
}

/* ─── Send flow (designed for confidence) ─────��──���─────────────────────── */

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

function RecipientField({ label, values, setValues, autoFocus = false }: { label: string; values: string[]; setValues: (v: string[]) => void; autoFocus?: boolean }) {
  const [draft, setDraft] = useState('')
  const commit = () => {
    const parts = draft.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...values]
    parts.forEach(p => { if (isEmail(p) && !next.includes(p)) next.push(p) })
    setValues(next)
    setDraft('')
  }
  return <div>
    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
    <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2 focus-within:border-[var(--honey)]">
      {values.map(v => <span key={v} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface)] px-2 py-1 text-xs font-medium ring-1 ring-[var(--line)]">{v}<button onClick={() => setValues(values.filter(x => x !== v))} aria-label={`Remove ${v}`} className="text-[var(--muted)] hover:text-[var(--ink)]"><X className="size-3" /></button></span>)}
      <input autoFocus={autoFocus} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',' || e.key === ' ') && draft.trim()) { e.preventDefault(); commit() } else if (e.key === 'Backspace' && !draft && values.length) setValues(values.slice(0, -1)) }} onBlur={commit} placeholder={values.length ? '' : 'name@company.com'} className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none" aria-label={`Add ${label} recipient`} />
    </div>
  </div>
}

function SendDialog({ doc, onClose, onSent }: { doc: EmailDoc; onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(doc.subject || doc.blocks.find(b => b.type === 'heading')?.title || '')
  const [phase, setPhase] = useState<'compose' | 'sending' | 'sent'>('compose')
  const total = to.length + cc.length + bcc.length
  const canSend = to.length > 0 && subject.trim().length > 0

  const send = () => { setPhase('sending'); window.setTimeout(() => setPhase('sent'), 1400) }

  return <div className="fixed inset-0 z-40 grid place-items-center bg-[var(--ink)]/45 p-4 backdrop-blur-sm" onClick={phase === 'compose' ? onClose : undefined}>
    <div onClick={e => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-[var(--surface)] shadow-2xl">
      {phase === 'sent' ? <div className="p-8 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--sage)] text-[var(--deep)]"><Check /></div>
        <h2 className="mt-5 font-serif text-4xl tracking-[-0.04em]">Sent.</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Delivered to {total} {total === 1 ? 'person' : 'people'} from your own inbox.</p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-[var(--paper)] p-4 text-left text-sm">
          <p className="flex items-center justify-between gap-3"><span className="text-[var(--muted)]">From</span><span className="font-medium">alex@morgan.studio</span></p>
          <p className="mt-2 flex items-center justify-between gap-3"><span className="text-[var(--muted)]">To</span><span className="truncate font-medium">{to[0]}{total > 1 ? ` +${total - 1}` : ''}</span></p>
          <p className="mt-2 flex items-start justify-between gap-3"><span className="text-[var(--muted)]">Subject</span><span className="text-right font-medium">{subject}</span></p>
        </div>
        <Button primary onClick={onSent} className="mt-6 w-full">Back to workspace</Button>
      </div> : <>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--honey-dark)]">Review &amp; send</p><h2 className="mt-1 font-semibold">One last look</h2></div>
          <button onClick={onClose} disabled={phase === 'sending'} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--paper)]" aria-label="Close"><X /></button>
        </div>
        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-6">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--sage)]/60 p-3">
            <div className="grid size-9 place-items-center rounded-full bg-[var(--surface)] text-[var(--deep)]"><Mail className="size-4" /></div>
            <div className="min-w-0 text-sm"><p className="font-semibold">Sending as Alex Morgan</p><p className="text-[var(--muted)]">alex@morgan.studio · Gmail</p></div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--deep)]"><ShieldCheck className="size-3.5" /> Verified</span>
          </div>
          <RecipientField label="To" values={to} setValues={setTo} autoFocus />
          {showCc ? <div className="grid gap-4 sm:grid-cols-2"><RecipientField label="Cc" values={cc} setValues={setCc} /><RecipientField label="Bcc" values={bcc} setValues={setBcc} /></div>
            : <button onClick={() => setShowCc(true)} className="-mt-1 self-start text-xs font-semibold text-[var(--deep)] underline-offset-2 hover:underline">Add Cc / Bcc</button>}
          <label className="flex flex-col gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Subject</span><input value={subject} onChange={e => setSubject(e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none focus:border-[var(--honey)]" /></label>
          <div className="rounded-2xl border border-[var(--line)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Before it goes</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[var(--deep)]" /> Looks great on mobile and desktop</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[var(--deep)]" /> Plain-text fallback included automatically</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[var(--deep)]" /> Sends from your inbox — no fake sender</li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--paper)]/50 px-6 py-4">
          <p className="text-xs text-[var(--muted)]">{total ? `${total} recipient${total === 1 ? '' : 's'}` : 'Add at least one recipient'}</p>
          <Button primary disabled={!canSend || phase === 'sending'} onClick={send}>{phase === 'sending' ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : <><Send className="size-4" /> Send email</>}</Button>
        </div>
      </>}
    </div>
  </div>
}

/* ─── Workspace shell ──────────────────────────────────────────────────── */

type Screen = 'Home' | 'Emails' | 'Templates' | 'Assets' | 'Settings'

function Sidebar({ screen, setScreen, onCreate }: { screen: Screen; setScreen: (s: Screen) => void; onCreate: () => void }) {
  const items: [Screen, LucideIcon][] = [['Home', Grid2X2], ['Emails', Mail], ['Templates', LayoutTemplate], ['Assets', Library], ['Settings', SettingsIcon]]
  return <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] p-4 lg:flex"><Logo /><Button primary onClick={onCreate} className="mt-8 w-full"><Plus /> Create email</Button><nav className="mt-8 flex flex-col gap-1" aria-label="Main navigation">{items.map(([label, Icon]) => <button key={label} onClick={() => setScreen(label)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${screen === label ? 'bg-[var(--sage)] text-[var(--deep)]' : 'text-[var(--muted)] hover:bg-[var(--paper)]'}`}><Icon />{label}</button>)}</nav><div className="mt-auto rounded-2xl bg-[var(--deep)] p-4 text-[var(--surface)]"><Sparkles className="text-[var(--honey)]" /><p className="mt-4 text-sm font-semibold">A quieter way to create.</p><p className="mt-1 text-xs leading-5 text-[var(--surface-muted)]">Your best ideas deserve room to breathe.</p></div><div className="mt-4 flex items-center gap-3 border-t border-[var(--line)] pt-4"><div className="grid size-8 place-items-center rounded-full bg-[var(--sage)] text-xs font-bold text-[var(--deep)]">AM</div><div className="min-w-0 text-xs"><p className="truncate font-semibold">Alex Morgan</p><p className="text-[var(--muted)]">Personal workspace</p></div><ChevronDown className="ml-auto text-[var(--muted)]" /></div></aside>
}

function MobileHeader({ onMenu }: { onMenu: () => void }) { return <header className="flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 lg:hidden"><Logo /><button onClick={onMenu} className="rounded-lg p-2 hover:bg-[var(--paper)]" aria-label="Open navigation"><Menu /></button></header> }
function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) { return <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--honey-dark)]">{eyebrow}</p><h1 className="mt-2 max-w-2xl font-serif text-4xl leading-[0.98] tracking-[-0.04em] text-balance md:text-6xl">{title}</h1>{description && <p className="mt-3 max-w-xl text-[15px] leading-7 text-[var(--muted)]">{description}</p>}</div>{action}</div> }

function Home({ onCompose, onBlank, setScreen }: { onCompose: (job?: Job) => void; onBlank: () => void; setScreen: (s: Screen) => void }) {
  return <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-5 md:p-10">
    <PageHeader eyebrow="Monday · September 1, 2026" title="What do you need to send?" description="Start from the message you have in mind. BeeMail turns it into a polished email you can send as yourself." action={<button className="grid size-10 place-items-center rounded-full bg-[var(--surface)] ring-1 ring-[var(--line)]" aria-label="Notifications"><Bell /></button>} />

    <section className="mt-10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {JOBS.slice(0, 6).map(j => <button key={j.id} onClick={() => onCompose(j)} className="group flex items-start gap-4 rounded-2xl bg-[var(--surface)] p-5 text-left ring-1 ring-[var(--line)] transition hover:-translate-y-1 hover:ring-[var(--honey)]">
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-[var(--deep)] ${accentBg[j.accent]}`}><j.icon className="size-5" /></span>
          <span className="min-w-0"><span className="block font-semibold leading-tight">{j.label}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{j.hint}</span></span>
        </button>)}
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <button onClick={() => onCompose()} className="flex flex-1 items-center gap-3 rounded-2xl bg-[var(--deep)] p-5 text-left text-[var(--surface)] transition hover:-translate-y-1"><span className="grid size-11 place-items-center rounded-xl bg-[var(--honey)] text-[var(--deep)]"><Sparkles className="size-5" /></span><span><span className="block font-semibold">Describe it in your own words</span><span className="mt-1 block text-xs text-[var(--surface-muted)]">Tell BeeMail anything — it finds the structure.</span></span><ArrowRight className="ml-auto" /></button>
        <button onClick={onBlank} className="flex flex-1 items-center gap-3 rounded-2xl bg-[var(--surface)] p-5 text-left ring-1 ring-[var(--line)] transition hover:-translate-y-1 hover:ring-[var(--honey)]"><span className="grid size-11 place-items-center rounded-xl bg-[var(--paper)]"><PenLine className="size-5" /></span><span><span className="block font-semibold">Start from a blank canvas</span><span className="mt-1 block text-xs text-[var(--muted)]">Full control, from the first block.</span></span></button>
      </div>
    </section>

    <section className="mt-12">
      <div className="flex items-end justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--honey-dark)]">Keep going</p><h2 className="mt-2 font-serif text-3xl tracking-[-0.04em]">Recent emails</h2></div><button onClick={() => setScreen('Emails')} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--deep)]">View all <ArrowRight className="size-4" /></button></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{emails.slice(0, 3).map(email => <EmailCard key={email.name} email={email} onClick={onBlank} />)}</div>
    </section>
  </main>
}

function EmailCard({ email, onClick }: { email: typeof emails[number]; onClick: () => void }) { const tones = { honey: 'bg-[var(--honey-pale)]', sage: 'bg-[var(--sage)]', sky: 'bg-[var(--sky)]', blush: 'bg-[var(--blush)]' }; return <button onClick={onClick} className="group overflow-hidden rounded-2xl bg-[var(--surface)] text-left ring-1 ring-[var(--line)] transition hover:-translate-y-1 hover:ring-[var(--honey)]"><div className={`h-32 p-5 ${tones[email.tone as keyof typeof tones]}`}><div className="h-full rounded-lg bg-[var(--surface)]/80 p-3"><div className="h-2 w-1/2 rounded-full bg-[var(--deep)]/20" /><div className="mt-2 h-1.5 w-3/4 rounded-full bg-[var(--deep)]/10" /><div className="mt-6 h-5 w-1/3 rounded bg-[var(--deep)]/80" /></div></div><div className="p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{email.name}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${email.status === 'Sent' ? 'bg-[var(--sage)] text-[var(--deep)]' : 'bg-[var(--paper)] text-[var(--muted)]'}`}>{email.status}</span></div><p className="mt-1 truncate text-sm text-[var(--muted)]">{email.subject}</p><p className="mt-4 text-xs text-[var(--muted)]">{email.date}</p></div></button> }

function Emails({ onCompose, onBlank }: { onCompose: () => void; onBlank: () => void }) { const [filter, setFilter] = useState('All emails'); const [search, setSearch] = useState(''); const filtered = useMemo(() => emails.filter(e => (filter === 'All emails' || e.status === filter.slice(0, -1)) && `${e.name} ${e.subject}`.toLowerCase().includes(search.toLowerCase())), [filter, search]); return <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-5 md:p-10"><PageHeader eyebrow="Your workspace" title="Emails" description="Every idea, draft, and beautifully sent note in one place." action={<Button primary onClick={onCompose}><Plus /> Create email</Button>} /><div className="mt-8 flex flex-col gap-4 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1 rounded-xl bg-[var(--paper)] p-1">{['All emails', 'Drafts', 'Sent'].map(x => <button key={x} onClick={() => setFilter(x)} className={`rounded-lg px-3 py-2 text-sm font-medium ${filter === x ? 'bg-[var(--surface)] text-[var(--deep)] shadow-sm' : 'text-[var(--muted)]'}`}>{x}</button>)}</div><label className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]"><Search /><input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Search emails" aria-label="Search emails" /></label></div>{filtered.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(email => <EmailCard key={email.name} email={email} onClick={onBlank} />)}<button onClick={onCompose} className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]/50 p-6 text-center hover:border-[var(--honey)]"><div><div className="mx-auto grid size-10 place-items-center rounded-xl bg-[var(--sage)] text-[var(--deep)]"><Plus /></div><p className="mt-3 text-sm font-semibold">Create another email</p><p className="mt-1 text-xs text-[var(--muted)]">Describe it — BeeMail drafts it.</p></div></button></div> : <EmptyState icon={Mail} title="No emails yet" body="Your drafts and sent notes will live here. Start with the message you have in mind." action={<Button primary onClick={onCompose}><Sparkles className="size-4" /> Create your first email</Button>} />}</main> }

function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: React.ReactNode }) {
  return <div className="mt-10 grid place-items-center rounded-[2rem] border border-dashed border-[var(--line)] bg-[var(--surface)]/50 px-6 py-16 text-center"><div className="grid size-14 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--deep)]"><Icon /></div><h3 className="mt-5 font-serif text-2xl tracking-[-0.03em]">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{body}</p>{action && <div className="mt-6">{action}</div>}</div>
}

function Templates({ onUse }: { onUse: (job: Job) => void }) {
  const map: { label: string; desc: string; tone: Job['accent']; jobId: string }[] = [
    { label: 'Announcement', desc: 'Make an important moment feel memorable.', tone: 'sky', jobId: 'announce' },
    { label: 'Event invite', desc: 'Clear details, one obvious action.', tone: 'honey', jobId: 'event' },
    { label: 'Client follow-up', desc: 'Warm, and easy to reply to.', tone: 'sage', jobId: 'followup' },
    { label: 'Thank you', desc: 'A thoughtful note with room to breathe.', tone: 'blush', jobId: 'thanks' },
    { label: 'Meeting request', desc: 'Ask for time without asking too much.', tone: 'sage', jobId: 'meeting' },
    { label: 'Proposal', desc: 'Confident, structured, easy to skim.', tone: 'honey', jobId: 'proposal' },
    { label: 'Re-engage', desc: 'A gentle nudge that reopens the door.', tone: 'sky', jobId: 'followup' },
    { label: 'Launch invite', desc: 'Build anticipation, then point the way.', tone: 'blush', jobId: 'event' },
  ]
  return <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-5 md:p-10"><PageHeader eyebrow="Start somewhere good" title="Templates" description="Email structures designed around the moments you send most." action={<Button><Search /> Explore all</Button>} /><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{map.map(t => { const job = JOBS.find(j => j.id === t.jobId)!; return <button key={t.label} onClick={() => onUse(job)} className="group overflow-hidden rounded-2xl bg-[var(--surface)] text-left ring-1 ring-[var(--line)] transition hover:-translate-y-1 hover:ring-[var(--honey)]"><div className={`h-48 p-6 ${accentBg[t.tone]}`}><div className="h-full rounded-xl bg-[var(--surface)] p-5"><div className="h-3 w-1/2 rounded bg-[var(--deep)]/25" /><div className="mt-3 h-2 w-4/5 rounded bg-[var(--deep)]/10" /><div className="mt-3 h-2 w-3/5 rounded bg-[var(--deep)]/10" /><div className="mt-9 h-7 w-1/3 rounded-md bg-[var(--deep)]" /></div></div><div className="p-5"><h3 className="font-semibold">{t.label}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.desc}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--deep)]">Use template <ArrowUpRight /></span></div></button> })}</div></main>
}

function Assets() { const [tab, setTab] = useState('All assets'); return <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-5 md:p-10"><PageHeader eyebrow="Your visual library" title="Assets" description="Keep your images, logos, and brand pieces close to the canvas." action={<Button primary><Plus /> Upload asset</Button>} /><div className="mt-8 rounded-[2rem] bg-[var(--surface)] p-6 ring-1 ring-[var(--line)]"><div className="flex items-center justify-between border-b border-[var(--line)] pb-4"><div className="flex gap-1 rounded-xl bg-[var(--paper)] p-1">{['All assets', 'Images', 'Logos'].map(x => <button key={x} onClick={() => setTab(x)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === x ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted)]'}`}>{x}</button>)}</div><button className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--paper)]" aria-label="More asset options"><MoreHorizontal /></button></div><div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4"><div className="aspect-square rounded-2xl bg-[var(--deep)] p-5 text-[var(--surface)]"><div className="flex h-full flex-col justify-between"><div className="flex items-center justify-between"><span className="rounded-full bg-[var(--honey)] px-2 py-1 text-[10px] font-bold text-[var(--deep)]">LOGO</span><Sparkles className="text-[var(--honey)]" /></div><div><p className="font-serif text-3xl">BeeMail</p><p className="mt-1 text-xs text-[var(--surface-muted)]">A little more human.</p></div></div></div>{['Studio mood', 'Product detail', 'Team portrait'].map((name, i) => <div key={name} className={`aspect-square rounded-2xl p-5 ${i === 0 ? 'bg-[var(--sky)]' : i === 1 ? 'bg-[var(--honey-pale)]' : 'bg-[var(--sage)]'}`}><div className="flex h-full flex-col justify-between"><FileImage className="text-[var(--deep)]/60" /><p className="text-sm font-semibold">{name}</p></div></div>)}</div></div></main> }

function SettingCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) { return <section className="rounded-[2rem] bg-[var(--surface)] p-6 ring-1 ring-[var(--line)]"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{desc}</p><div className="mt-6 flex flex-col gap-4">{children}</div></section> }
function ToggleRow({ title, desc }: { title: string; desc: string }) { const [on, setOn] = useState(true); return <button onClick={() => setOn(v => !v)} className="flex items-center gap-4 rounded-2xl border border-[var(--line)] p-4 text-left"><div className="min-w-0 flex-1"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-[var(--muted)]">{desc}</p></div><div className={`h-6 w-10 rounded-full p-1 transition ${on ? 'bg-[var(--deep)]' : 'bg-[var(--line)]'}`}><div className={`size-4 rounded-full bg-[var(--surface)] transition ${on ? 'ml-4' : ''}`} /></div></button> }
function Settings() { const [tab, setTab] = useState('Workspace'); const [connected, setConnected] = useState(true); const tabs = ['Workspace', 'Sending accounts', 'Brand kit', 'Notifications']; return <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-5 md:p-10"><PageHeader eyebrow="Workspace preferences" title="Settings" description="Shape how BeeMail feels, sends, and remembers your work." /><div className="mt-8 grid gap-5 lg:grid-cols-[220px_1fr]"><nav className="flex gap-1 overflow-auto lg:flex-col">{tabs.map(x => <button key={x} onClick={() => setTab(x)} className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm ${tab === x ? 'bg-[var(--sage)] font-semibold text-[var(--deep)]' : 'text-[var(--muted)] hover:bg-[var(--surface)]'}`}>{x}</button>)}</nav><div className="flex flex-col gap-5">{tab === 'Workspace' && <SettingCard title="Workspace details" desc="The name and defaults shown across your projects."><label className="flex flex-col gap-2 text-sm font-medium">Workspace name<input defaultValue="Alex Morgan’s studio" className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none focus:border-[var(--honey)]" /></label><label className="flex flex-col gap-2 text-sm font-medium">Default reply-to<input defaultValue="alex@morgan.studio" className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none focus:border-[var(--honey)]" /></label><Button primary className="self-start">Save changes</Button></SettingCard>}{tab === 'Sending accounts' && <SettingCard title="Sending accounts" desc="Connect the mailbox you want to send from."><div className="flex items-center gap-4 rounded-2xl border border-[var(--line)] p-4"><div className="grid size-10 place-items-center rounded-xl bg-[var(--sky)]"><Mail /></div><div className="min-w-0 flex-1"><p className="font-semibold">{connected ? 'Alex Morgan · Gmail' : 'No account connected'}</p><p className="text-sm text-[var(--muted)]">{connected ? 'Ready to send' : 'Connect to start sending'}</p></div><Button onClick={() => setConnected(v => !v)}>{connected ? 'Disconnect' : 'Connect'}</Button></div></SettingCard>}{tab === 'Brand kit' && <SettingCard title="Brand kit" desc="Colors and type BeeMail reaches for by default."><div className="flex gap-3">{['bg-[var(--deep)]', 'bg-[var(--honey)]', 'bg-[var(--sage)]', 'bg-[var(--blush)]'].map(c => <div key={c} className={`size-12 rounded-xl ${c} ring-1 ring-[var(--line)]`} />)}</div></SettingCard>}{tab === 'Notifications' && <SettingCard title="Notifications" desc="Decide when BeeMail should reach out."><ToggleRow title="Send confirmations" desc="Get a note when an email is delivered." /><ToggleRow title="Weekly digest" desc="A calm summary of your sending week." /></SettingCard>}</div></div></main> }

/* ─── Editor ───────────────────────────────────────────────────────────── */

function DocumentOutline({ blocks, selected, onSelect, onAdd }: { blocks: EmailBlock[]; selected: number; onSelect: (id: number) => void; onAdd: () => void }) { return <aside className="hidden w-56 shrink-0 border-r border-[var(--line)] bg-[var(--paper)]/70 p-5 xl:flex xl:flex-col"><div className="flex items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Document</p><span className="rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">v3</span></div><div className="mt-5 rounded-xl bg-[var(--surface)] p-3 ring-1 ring-[var(--honey)]"><span className="flex items-center gap-2 text-xs font-bold text-[var(--deep)]"><ChevronDown /> Main email</span><span className="mt-2 block pl-5 text-[10px] text-[var(--muted)]">1 column · {blocks.length} blocks</span></div><div className="mt-6 border-t border-[var(--line)] pt-4"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Layers</p><div className="mt-3 flex flex-col gap-1">{blocks.map((block, index) => <button key={block.id} onClick={() => onSelect(block.id)} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs ${selected === block.id ? 'bg-[var(--sage)] font-semibold text-[var(--deep)]' : 'text-[var(--muted)] hover:bg-[var(--surface)]'}`}><span className="w-4 text-[10px] text-[var(--muted)]">{index + 1}</span>{block.type[0].toUpperCase() + block.type.slice(1)}</button>)}</div></div><button onClick={onAdd} className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] px-3 py-2.5 text-xs font-semibold text-[var(--muted)] hover:border-[var(--honey)]"><Plus /> Add section</button></aside> }

function Inspector({ block, onChange, onDelete, onDuplicate, onAi, onUndoAi, canUndoAi, onClose }: { block?: EmailBlock; onChange: (field: 'title' | 'body', value: string) => void; onDelete: () => void; onDuplicate: () => void; onAi: (fn: (s: string) => string) => void; onUndoAi: () => void; canUndoAi: boolean; onClose: () => void }) {
  const [ask, setAsk] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const run = (key: string, fn: (s: string) => string) => { if (busy) return; setBusy(key); window.setTimeout(() => { onAi(fn); setBusy(null); if (key === 'ask') setAsk('') }, 620) }
  if (!block) return <aside className="hidden w-80 shrink-0 border-l border-[var(--line)] bg-[var(--surface)] p-6 lg:block"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Inspector</p><p className="mt-5 text-sm leading-6 text-[var(--muted)]">Select any block on the canvas to edit its words and style.</p></aside>
  return <><div onClick={onClose} className="fixed inset-0 z-30 bg-[var(--ink)]/40 backdrop-blur-sm lg:hidden" aria-hidden="true" /><aside className="fixed inset-x-0 bottom-0 z-40 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl lg:static lg:z-auto lg:max-h-none lg:w-80 lg:shrink-0 lg:overflow-visible lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Inspector</p><h2 className="mt-2 font-semibold">{block.type[0].toUpperCase() + block.type.slice(1)} block</h2></div><div className="flex items-center gap-1"><button onClick={onDelete} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--paper)] hover:text-red-700" aria-label="Delete block"><Trash2 /></button><button onClick={onClose} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--paper)] lg:hidden" aria-label="Close inspector"><X /></button></div></div><label className="mt-7 flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Content<input value={block.title} onChange={e => onChange('title', e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--honey)]" /></label>{block.body !== undefined && <label className="mt-4 flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Supporting copy<textarea value={block.body} onChange={e => onChange('body', e.target.value)} rows={5} className="resize-none rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--honey)]" /></label>}{['heading', 'text', 'button'].includes(block.type) && <div className="mt-6 border-t border-[var(--line)] pt-5"><div className="flex items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Ask AI</p>{canUndoAi && <button onClick={onUndoAi} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] transition hover:text-[var(--deep)]"><Undo2 className="size-3.5" /> Undo AI</button>}</div><div className="mt-3 flex flex-wrap gap-2">{([['warm', 'Warmer', warmer], ['formal', 'More formal', makeFormal], ['tight', 'Tighten', concise], ['expand', 'Expand', expand], ['rephrase', 'Rephrase', rephrase]] as [string, string, (s: string) => string][]).map(([key, label, fn]) => <button key={key} disabled={busy !== null} onClick={() => run(key, fn)} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:border-[var(--honey)] hover:bg-[var(--honey-pale)]/50 disabled:opacity-50">{busy === key && <Loader2 className="size-3.5 animate-spin" />}{label}</button>)}</div><div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-1.5 transition focus-within:border-[var(--honey)]"><Wand2 className="ml-1 size-4 shrink-0 text-[var(--honey-dark)]" /><input value={ask} onChange={e => setAsk(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && ask.trim() && !e.nativeEvent.isComposing) { e.preventDefault(); run('ask', routeAsk(ask)) } }} placeholder="Tell AI how to change this…" className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" aria-label="Ask AI to rewrite this block" /><button onClick={() => ask.trim() && run('ask', routeAsk(ask))} disabled={!ask.trim() || busy !== null} aria-label="Apply AI change" className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--deep)] text-[var(--surface)] transition hover:bg-[var(--deep-strong)] disabled:opacity-40">{busy === 'ask' ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}</button></div><p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">Refines just this block — your words, kept yours. Undo anytime.</p></div>}<div className="mt-6 border-t border-[var(--line)] pt-5"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Quick actions</p><button onClick={onDuplicate} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-medium hover:border-[var(--honey)]"><Copy className="size-4" /> Duplicate block</button></div></aside></>
}

function Editor({ doc, onBack }: { doc: EmailDoc; onBack: () => void }) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(doc.blocks)
  const [selected, setSelected] = useState(doc.blocks[0]?.id ?? 0)
  const [preview, setPreview] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [sendOpen, setSendOpen] = useState(false)
  const [aiUndo, setAiUndo] = useState<EmailBlock | null>(null)
  useEffect(() => { setAiUndo(null) }, [selected])
  const selectedBlock = blocks.find(b => b.id === selected)
  const update = (field: 'title' | 'body', value: string) => setBlocks(xs => xs.map(bl => bl.id === selected ? { ...bl, [field]: value } : bl))
  const addBlock = () => { const nb = b('text', 'New section', 'Add something useful here.'); setBlocks(xs => [...xs, nb]); setSelected(nb.id) }
  const duplicate = () => selectedBlock && (() => { const nb = { ...selectedBlock, id: blockSeq++ }; setBlocks(xs => { const i = xs.findIndex(x => x.id === selected); return [...xs.slice(0, i + 1), nb, ...xs.slice(i + 1)] }); setSelected(nb.id) })()
  const applyAi = (fn: (s: string) => string) => { const cur = blocks.find(bl => bl.id === selected); if (!cur) return; setAiUndo(cur); setBlocks(xs => xs.map(bl => bl.id === selected ? bumpBlock(bl, fn) : bl)) }
  const undoAi = () => setAiUndo(prev => { if (prev) setBlocks(xs => xs.map(bl => bl.id === prev.id ? prev : bl)); return null })

  return <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
    <div className="hidden items-center justify-center gap-2 border-b border-[var(--line)] bg-[var(--surface)]/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] lg:flex"><span className="size-1.5 rounded-full bg-[var(--honey)]" aria-hidden="true" /> Editing the email document <span className="font-normal normal-case tracking-normal text-[var(--muted)]">· changes are saved automatically</span></div>

    {preview && <div className="absolute inset-0 z-20 grid place-items-center bg-[var(--ink)]/45 p-5 backdrop-blur-sm"><div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[var(--paper)] shadow-2xl"><div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3"><p className="text-sm font-semibold">Preview</p><div className="flex items-center gap-1 rounded-lg bg-[var(--paper)] p-1"><button onClick={() => setDevice('desktop')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${device === 'desktop' ? 'bg-[var(--surface)] text-[var(--deep)] shadow-sm' : 'text-[var(--muted)]'}`}><Monitor className="size-4" /> Desktop</button><button onClick={() => setDevice('mobile')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${device === 'mobile' ? 'bg-[var(--surface)] text-[var(--deep)] shadow-sm' : 'text-[var(--muted)]'}`}><Smartphone className="size-4" /> Mobile</button></div><button onClick={() => setPreview(false)} className="rounded-lg p-2 hover:bg-[var(--surface)]" aria-label="Close preview"><X /></button></div><div className="overflow-auto p-5"><Canvas blocks={blocks} selected={0} onSelect={() => {}} device={device} /></div></div></div>}

    {sendOpen && <SendDialog doc={{ ...doc, blocks }} onClose={() => setSendOpen(false)} onSent={onBack} />}

    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><button onClick={onBack} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--paper)]" aria-label="Back to workspace"><ArrowLeft /></button><div className="hidden sm:block"><p className="truncate text-sm font-semibold">{doc.title}</p><p className="flex items-center gap-1 text-[11px] text-[var(--muted)]"><Cloud /> Saved just now</p></div></div><div className="flex items-center gap-1 sm:gap-2"><button className="hidden rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--paper)] sm:block" aria-label="Undo"><Undo2 /></button><button className="hidden rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--paper)] sm:block" aria-label="Redo"><Redo2 /></button><Button onClick={() => setPreview(true)}><Eye /> <span className="hidden sm:inline">Preview</span></Button><Button primary onClick={() => setSendOpen(true)}><Send /> Send</Button></div></header>

    <div className="flex min-h-0 flex-1"><DocumentOutline blocks={blocks} selected={selected} onSelect={setSelected} onAdd={addBlock} /><main className="min-w-0 flex-1 overflow-y-auto p-5 md:p-10"><div className="mx-auto flex max-w-3xl flex-col gap-5"><p className="flex items-center gap-2 text-[13px] leading-6 text-[var(--muted)]"><MousePointerClick className="size-4 shrink-0 text-[var(--honey-dark)]" /> Click any block to edit it directly — or select one and ask AI to refine just that piece.</p><Canvas blocks={blocks} selected={selected} onSelect={setSelected} /></div></main><Inspector block={selectedBlock} onChange={update} onDelete={() => { setBlocks(xs => xs.filter(bl => bl.id !== selected)); setSelected(0) }} onDuplicate={duplicate} onAi={applyAi} onUndoAi={undoAi} canUndoAi={!!aiUndo} onClose={() => setSelected(0)} /></div>

    <footer className="flex min-h-12 items-center justify-between border-t border-[var(--line)] bg-[var(--surface)] px-4 text-xs text-[var(--muted)] sm:px-6"><div className="flex items-center gap-3"><span className="flex items-center gap-2 font-semibold text-[var(--deep)]"><Monitor /> {blocks.length} blocks</span></div><span>Ready to send</span></footer>
  </div>
}

/* ─── Onboarding ───────────────────────────────────────────────────────── */

function Onboarding({ onContinue }: { onContinue: () => void }) { return <main className="min-h-screen bg-[var(--deep)] p-5 text-[var(--surface)] md:p-8"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="relative grid size-9 place-items-center rounded-[11px] bg-[var(--honey)] font-serif text-xl leading-none text-[var(--deep)]">B<span className="absolute bottom-1 right-1 size-1.5 rounded-full bg-[var(--deep)]" aria-hidden="true" /></div><span className="font-serif text-[1.45rem] leading-none tracking-[-0.04em]">BeeMail</span></div><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--surface-muted)]">01 / 03</span></div><div className="mx-auto flex min-h-[calc(100vh-100px)] max-w-5xl items-center justify-center py-16"><div className="grid w-full items-center gap-10 md:grid-cols-[1fr_0.82fr] lg:gap-12"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--honey)]">A better place to begin</p><h1 className="mt-4 max-w-lg font-serif text-5xl leading-[0.92] tracking-[-0.05em] text-balance sm:text-6xl lg:text-8xl">Make the email you meant to send.</h1><p className="mt-6 max-w-md text-[15px] leading-7 text-[var(--surface-muted)]">A visual AI composer for unusually polished emails, sent from your own inbox.</p><div className="mt-8 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--surface-muted)]"><span className="rounded-full border border-[var(--surface-muted)]/25 px-3 py-2">Idea-first</span><span className="rounded-full border border-[var(--surface-muted)]/25 px-3 py-2">AI-assisted</span></div><Button primary onClick={onContinue} className="mt-10 bg-[var(--honey)] text-[var(--deep)] hover:bg-[var(--honey-pale)]">Enter your workspace <ArrowRight /></Button></div><div className="relative hidden aspect-square max-w-md justify-self-end rounded-[2rem] bg-[var(--honey)] p-6 text-[var(--deep)] md:flex lg:p-8"><div className="m-auto w-full max-w-xs rounded-2xl bg-[var(--surface)] p-5 shadow-xl"><p className="font-serif text-2xl leading-none">A little something</p><div className="mt-4 h-2 w-3/4 rounded-full bg-[var(--deep)]/10" /><div className="mt-2 h-2 w-1/2 rounded-full bg-[var(--deep)]/10" /><div className="mt-5 h-24 rounded-xl bg-[var(--sage)]" /><div className="mt-5 h-9 w-1/2 rounded-lg bg-[var(--honey)]" /></div><span className="absolute -bottom-4 left-6 rounded-full bg-[var(--deep)] px-3 py-2 text-xs font-bold text-[var(--surface)]">Thoughtful by default.</span></div></div></div></main> }

/* ─── Root ─────────────────────────────────────────────────────────────── */

export default function BeeMailWorkspace() {
  const [onboarded, setOnboarded] = useState(false)
  const [view, setView] = useState<'workspace' | 'compose' | 'editor'>('workspace')
  const [screen, setScreen] = useState<Screen>('Home')
  const [composeJob, setComposeJob] = useState<Job | null>(null)
  const [doc, setDoc] = useState<EmailDoc>(blankDoc())
  const [mobileMenu, setMobileMenu] = useState(false)

  const startCompose = (job?: Job) => { setComposeJob(job ?? null); setView('compose') }
  const startBlank = () => { setDoc(blankDoc()); setView('editor') }
  const finishCompose = (d: EmailDoc) => { setDoc(d); setView('editor') }

  if (!onboarded) return <Onboarding onContinue={() => setOnboarded(true)} />
  if (view === 'compose') return <ComposeFlow initialJob={composeJob} onCancel={() => setView('workspace')} onDone={finishCompose} />
  if (view === 'editor') return <Editor doc={doc} onBack={() => setView('workspace')} />

  return <div className="flex min-h-screen bg-[var(--paper)]">
    <Sidebar screen={screen} setScreen={setScreen} onCreate={() => startCompose()} />
    {mobileMenu && <div className="fixed inset-0 z-20 bg-[var(--ink)]/30 lg:hidden" onClick={() => setMobileMenu(false)}><div className="h-full w-72 bg-[var(--surface)] p-4" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between"><Logo /><button onClick={() => setMobileMenu(false)} aria-label="Close navigation"><X /></button></div><Button primary onClick={() => { startCompose(); setMobileMenu(false) }} className="mt-8 w-full"><Plus /> Create email</Button><nav className="mt-8 flex flex-col gap-1">{(['Home', 'Emails', 'Templates', 'Assets', 'Settings'] as Screen[]).map(item => <button key={item} onClick={() => { setScreen(item); setMobileMenu(false) }} className={`rounded-xl px-3 py-3 text-left text-sm ${screen === item ? 'bg-[var(--sage)] font-semibold text-[var(--deep)]' : 'text-[var(--muted)]'}`}>{item}</button>)}</nav></div></div>}
    <div className="flex min-w-0 flex-1 flex-col"><MobileHeader onMenu={() => setMobileMenu(true)} />
      {screen === 'Home' && <Home onCompose={startCompose} onBlank={startBlank} setScreen={setScreen} />}
      {screen === 'Emails' && <Emails onCompose={() => startCompose()} onBlank={startBlank} />}
      {screen === 'Templates' && <Templates onUse={startCompose} />}
      {screen === 'Assets' && <Assets />}
      {screen === 'Settings' && <Settings />}
    </div>
  </div>
}
