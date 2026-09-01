Product Discovery
Yes. And I would **not simply concatenate the two documents**.

The second document is already strong, but after comparing it against the current state of Gamma, Unlayer, Beefree and the actual Google/Microsoft sending constraints, I would make several architectural corrections before declaring it the source of truth.

The biggest improvement is this:

> **The product should be architected around an Email Document Engine, not around an email editor.**

The editor is just one client of the document engine. AI, templates, preview, compilation, versioning and sending all consume the same canonical representation.

There are also two important corrections to the current spec:

* **Gmail's `gmail.send` scope is sensitive, not non-sensitive.** That means Google OAuth verification needs to be treated as a launch-critical dependency. ([Google for Developers][1])
* **"The same compiler renders the editor" needs qualification.** The final email HTML should absolutely come from the same compiler, but trying to make the editor literally render MJML/compiled email HTML as its primary interactive editing surface will make the UX unnecessarily difficult. The editor should render the **document model**, while the preview/send pipeline renders the **compiled output**. We can still have a high-fidelity preview from the exact compiler output.

I would therefore merge everything into the following **Master Architecture Specification v2**.

# MASTER ARCHITECTURE SPECIFICATION

## AI-Native Visual Email Creation & Sending Platform — MVP v2

### 0. Executive Architecture Decision

The MVP is an **AI-native visual email creation application** that lets users create structured, professional emails and send them through their own Gmail or Microsoft mailbox using OAuth.

The architecture is:

```text
                    ┌─────────────────────┐
                    │      USER            │
                    └──────────┬──────────┘
                               │
                               ▼
                 ┌──────────────────────────┐
                 │      React Web App        │
                 │                          │
                 │ Dashboard / Editor / AI │
                 │ Preview / Send / Settings│
                 └────────────┬─────────────┘
                              │
                              ▼
                 ┌──────────────────────────┐
                 │      API / App Layer      │
                 │      Node + TypeScript    │
                 │                          │
                 │ Auth                     │
                 │ Documents                │
                 │ AI                       │
                 │ Assets                   │
                 │ Sending                  │
                 │ Templates                │
                 └────────────┬─────────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
       ┌───────────┐    ┌────────────┐   ┌─────────────┐
       │ PostgreSQL│    │ Object     │   │ Redis/Queue │
       │           │    │ Storage    │   │             │
       │ Users     │    │ Images     │   │ Send Jobs   │
       │ Documents │    │ Assets     │   │ AI Jobs     │
       │ Sends     │    │            │   │ Retries     │
       └───────────┘    └────────────┘   └──────┬──────┘
                                                │
                                                ▼
                                     ┌────────────────────┐
                                     │ Sending Providers  │
                                     │                    │
                                     │ Gmail API          │
                                     │ Microsoft Graph    │
                                     └────────────────────┘


                ┌───────────────────────────────┐
                │     EMAIL DOCUMENT ENGINE    │
                │                               │
                │ Schema → Editor → AI → Theme │
                │ → Compiler → Preview → Send │
                └───────────────────────────────┘
```

The fundamental invariant is:

```text
EmailDocument
      │
      ├── Editor
      ├── AI
      ├── Templates
      ├── Versioning
      │
      └── Compiler
             │
             ├── HTML
             └── Plaintext
                    │
                    ▼
                 MIME
                    │
                    ▼
            Gmail / Microsoft
```

**HTML is a compiled artifact.**

**EmailDocument is the source of truth.**

That principle should survive every future phase.

---

# 1. Product Thesis

The product is not "another email marketing platform."

It is:

> **A visual AI email composer that lets people create unusually polished emails and send them as themselves.**

Gamma demonstrated the power of turning a prompt into a structured visual artifact rather than simply generating text. Its current product emphasizes prompt-to-structured content, smart layouts, themes and AI-assisted refinement. ([Gamma][2])

Unlayer demonstrates the importance of a structured email-design system with reusable blocks, AI assistance and an exportable design representation. ([Unlayer][3])

Beefree/RGE demonstrates the value of email-specific design and AI assistance. ([beefree.io][4])

But the opportunity is the combination:

**AI generation + visual creation + email-safe rendering + personal mailbox sending.**

That combination is the product.

---

# 2. Product Positioning

The product should sit between:

```text
                    DESIGN
                       ▲
                       │
                 Canva │
                       │
                       │
                       │       OUR PRODUCT
                       │          ★
                       │
                       │
───────────────────────┼────────────────────► SENDING
                       │
                 Gmail │
                       │
                       │
              Mailchimp│
                       │
```

But there is an important strategic distinction.

Mailchimp and similar products are fundamentally:

> **Audience → Campaign → Delivery → Analytics**

This product is initially:

> **Idea → Design → Email → Personal sending**

That distinction should remain visible in both UX and architecture.

---

# 3. Target User

The ideal MVP user is someone who says:

> "I want this email to look really good, but I don't want to become an email designer."

Examples:

* consultants
* freelancers
* founders
* recruiters
* sales professionals
* creators
* coaches
* small-business owners
* community managers
* professionals sending client updates
* people sending small newsletters

The primary unit is **the email**, not the audience.

That distinction is extremely important.

---

# 4. Core Problem

Today's workflow often looks like:

```text
Think of message
      ↓
Write in ChatGPT
      ↓
Design in Canva
      ↓
Realize Canva doesn't produce a proper email
      ↓
Use an email builder
      ↓
Export HTML
      ↓
Find an ESP
      ↓
Configure sender
      ↓
Send
```

The product collapses this into:

```text
Describe what you want
        ↓
AI creates email
        ↓
Visually edit
        ↓
Preview
        ↓
Send as yourself
```

---

# 5. MVP Value Proposition

### Primary

> **Create beautiful emails with AI and send them directly from your Gmail or Outlook.**

### Secondary

> No HTML. No email marketing setup. No fake sender address.

### Product promise

The user should be able to go from:

**"I need to send this"**

to

**"Sent."**

in minutes.

---

# 6. Competitive Architecture

The current market reinforces the architecture rather than invalidating it.

Unlayer, for example, explicitly uses a JSON design representation alongside generated HTML, and offers AI workflows on top of the builder. ([Unlayer][3])

That validates our decision to treat structured design data as a first-class object.

However, Unlayer's own documentation makes an important distinction: the builder itself does not send production campaigns; customers integrate their own email infrastructure or ESP. ([help.unlayer.com][5])

That leaves an interesting opening for us:

> **We own the creation-to-personal-mailbox workflow.**

Gamma provides the AI-native creation lesson:

```text
Prompt
 ↓
Structure
 ↓
Design
 ↓
Edit
 ↓
Publish
```

We adapt that to:

```text
Prompt
 ↓
Email structure
 ↓
Email-safe design
 ↓
Edit
 ↓
Compile
 ↓
Personal mailbox
```

---

# 7. The Most Important Architectural Principle

## Email Document Model

This is the heart of the entire system.

Example conceptually:

```json
{
  "schemaVersion": "1.0",
  "settings": {
    "width": 600,
    "backgroundColor": "#ffffff"
  },
  "theme": {
    "fontFamily": "Arial",
    "primaryColor": "#111827",
    "accentColor": "#2563eb"
  },
  "blocks": [
    {
      "id": "b1",
      "type": "heading",
      "content": {
        "text": "Important Update"
      }
    },
    {
      "id": "b2",
      "type": "paragraph",
      "content": {
        "text": "We wanted to share..."
      }
    },
    {
      "id": "b3",
      "type": "button",
      "content": {
        "text": "Learn More",
        "url": "https://example.com"
      }
    }
  ]
}
```

This representation becomes the contract between:

* editor
* AI
* compiler
* templates
* versions
* preview
* sending
* future integrations

---

# 8. Do Not Make the Editor Equal to the Compiler

This is the biggest refinement I would make to your previous architecture.

Your earlier specification says:

> "the canvas is a live render of the document model through the same compiler used for the final email."

I would change this.

Instead:

```text
             Email Document
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
   Editor Renderer       Email Compiler
          │                   │
          ▼                   ▼
   Interactive Canvas     Email HTML
                              │
                              ▼
                        Preview / Send
```

Why?

Because email HTML is deliberately restrictive.

The editor needs:

* selection
* drag/drop
* handles
* insertion zones
* editing overlays
* responsive controls
* AI suggestions
* undo/redo

The final email needs:

* tables
* inline CSS
* email-safe markup
* Outlook compatibility
* MIME structure

Trying to make the compiler's output the interactive editor DOM will create unnecessary complexity.

Instead:

> **Both renderers consume the same canonical document model.**

Then:

> **The preview uses the actual compiler output.**

That gives us both good UX and trustworthy rendering.

---

# 9. Email Block System

MVP block vocabulary should be deliberately small.

### Content blocks

* Heading
* Paragraph
* Image
* Button
* Divider
* Spacer

### Layout blocks

* Section
* Two-column
* Three-column

### Utility

* Logo
* Footer

Potentially:

* Social links

But I would probably defer social blocks.

The MVP should prioritize **quality over block count**.

---

# 10. Design System

Instead of exposing arbitrary CSS:

```text
Padding: 17px
Margin: 13px
Line-height: 1.37
Border-radius: 8.5px
```

give users:

```text
Spacing
  Compact
  Comfortable
  Spacious

Typography
  Small
  Normal
  Large
  Display

Alignment
  Left
  Center
  Right

Color
  Primary
  Secondary
  Accent

Button
  Filled
  Outline
```

Internally those map to design tokens.

This is how we preserve:

**Canva-like simplicity**

without sacrificing:

**email rendering reliability.**

---

# 11. AI Architecture

AI should not simply "write an email."

It should produce a **design intent**.

The AI pipeline becomes:

```text
User brief
    ↓
Intent extraction
    ↓
Email strategy
    ↓
Document generation
    ↓
Schema validation
    ↓
Design policy validation
    ↓
Document
```

For example:

User:

> "Write a professional update to 40 clients announcing that our consulting prices are changing next month."

AI internally determines:

```text
Purpose: announcement
Audience: existing clients
Tone: professional
CTA: contact us
Structure:
  heading
  introduction
  pricing change
  effective date
  CTA
  closing
```

Then generates the document.

This is much stronger than:

```text
prompt → HTML
```

or even:

```text
prompt → JSON
```

because there is an intermediate **semantic understanding layer**.

---

# 12. AI Modes

MVP should have four AI actions.

### Generate

Create the entire email.

### Rewrite

Rewrite selected text.

### Improve

Improve the selected block while preserving intent.

### Restyle

Change the visual treatment while preserving content.

Example:

> "Make this feel more premium."

The system changes the document's design tokens/layout rather than rewriting the entire email.

That becomes a major future differentiator.

---

# 13. AI Must Never Directly Own the Document

AI produces:

```text
validated document mutation
```

not:

```text
HTML
```

and not:

```text
untrusted arbitrary JSON
```

Pipeline:

```text
LLM
 ↓
Structured response
 ↓
Schema validator
 ↓
Business-rule validator
 ↓
Document mutation
 ↓
Editor
```

If validation fails:

```text
LLM
 ↓
invalid output
 ↓
repair attempt
 ↓
validator
 ↓
fail → user-friendly error
```

---

# 14. Compiler Architecture

Use a dedicated compiler package.

```text
EmailDocument
       ↓
Normalize
       ↓
Validate
       ↓
Resolve theme
       ↓
Resolve assets
       ↓
Generate MJML representation
       ↓
MJML compiler
       ↓
HTML
       ↓
Post-process
       ↓
Final email HTML
```

MJML remains an implementation detail.

The product's API should not expose MJML.

That means:

```text
Document JSON
```

is our architecture.

MJML is simply:

```text
compiler technology
```

This protects us if we eventually replace MJML.

---

# 15. Compiler Versioning

This is another addition I strongly recommend.

Every compiled send should record:

```text
document_schema_version
compiler_version
theme_version
```

Why?

Suppose the compiler changes in 2028.

A 2026 email should still be reproducible.

Therefore:

```text
Send
 ├── document snapshot
 ├── schema version
 ├── compiler version
 ├── generated HTML hash
 └── plaintext
```

This gives us deterministic historical records.

---

# 16. Sending Architecture

The sending abstraction should be:

```ts
interface MailProvider {
  send(message: OutboundEmail): Promise<SendResult>;
}
```

Providers:

```text
GmailProvider
MicrosoftGraphProvider
```

Later:

```text
AmazonSesProvider
PostmarkProvider
ResendProvider
PlatformSMTPProvider
```

without changing the application-level sending model.

---

# 17. Gmail

Use Gmail API with:

```text
gmail.send
```

not passwords or app passwords.

Google explicitly documents `gmail.send` as a sensitive scope, so the original document should be corrected here: it is **not** a non-sensitive scope. Public applications using it may require OAuth verification. ([Google for Developers][1])

Gmail's API accepts an RFC 2822 MIME message encoded in base64url and can send it using `users.messages.send`. ([Google for Developers][6])

Therefore:

```text
EmailDocument
 ↓
Compiler
 ↓
HTML + plaintext
 ↓
MIME builder
 ↓
base64url
 ↓
Gmail messages.send
```

---

# 18. Microsoft

Microsoft Graph's delegated `Mail.Send` permission is available for both personal Microsoft accounts and work/school accounts. Microsoft documents it as the least-privileged delegated permission for sending mail. ([Microsoft Learn][7])

Therefore:

```text
EmailDocument
 ↓
Compiler
 ↓
OutboundEmail
 ↓
MicrosoftProvider
 ↓
Graph /me/sendMail
```

The rest of the application should not care whether the provider is Gmail or Microsoft.

---

# 19. Important Sending Correction

I would change this assumption from the previous specification:

> "Email sending itself is free from a platform-cost perspective."

That's too strong.

The platform may not pay an ESP per message, but there are still:

* queue/worker costs
* API calls
* retry costs
* storage
* logging
* support
* abuse mitigation
* AI generation costs

The **marginal provider delivery cost** is effectively delegated to the user's mailbox infrastructure, which is an excellent advantage.

But don't model sending as literally zero-cost.

---

# 20. Recipient Model

For MVP:

```text
To
CC
BCC
```

should exist.

But:

* no contacts
* no CRM
* no CSV
* no segmentation

Recipient entry should support:

```text
john@example.com
mary@example.com
```

with validation and duplicate detection.

I would avoid hard-coding "50" as an architectural invariant.

Instead:

```text
product_limit
provider_limit
abuse_limit
```

should be separate concepts.

Gmail's consumer sending limits can vary and Google currently documents a threshold of more than 500 recipients in a single email or more than 500 emails/day as a trigger for sending-limit errors, while Workspace limits differ. ([Google Help][8])

So our MVP could conservatively impose something like 50 recipients/send, but it should be a **configurable product policy**, not a fundamental system constraint.

---

# 21. Draft Architecture

This deserves a slight redesign.

Instead of:

```text
documents.type = draft | template | sent-snapshot
```

I recommend:

```text
documents
document_versions
templates
sends
```

Why?

Because draft, template and sent email have different semantics.

A document is an editable object.

A template is a reusable object.

A send is an immutable event.

Don't force all three into one table if it creates semantic confusion.

---

# 22. Recommended Data Model

Core:

```text
users
oauth_connections
documents
document_versions
templates
assets
sends
send_recipients
ai_generations
```

Potentially later:

```text
workspaces
members
brands
campaigns
contacts
schedules
analytics_events
```

But none of those are required for MVP.

---

# 23. Documents

```text
documents
---------
id
user_id
title
status
current_version_id
created_at
updated_at
deleted_at
```

Statuses:

```text
draft
archived
```

The actual content lives in versions.

---

# 24. Document Versions

```text
document_versions
-----------------
id
document_id
version_number
schema_version
content_json
created_at
created_by
```

This gives us:

* undo foundation
* history
* recovery
* immutable snapshots
* future collaboration
* reliable send snapshots

---

# 25. Sends

```text
sends
-----
id
user_id
document_id
document_version_id
connection_id
provider
subject
status
provider_message_id
compiled_html_hash
compiler_version
schema_version
created_at
queued_at
sent_at
failed_at
error_code
error_message
```

This means a sent email remains historically accurate.

---

# 26. Recipients

Rather than:

```text
recipients JSONB
```

I recommend a small relational table:

```text
send_recipients
---------------
id
send_id
email
name
type
status
```

Where:

```text
type = to | cc | bcc
```

This is one place where normalization is worthwhile.

It makes future analytics, debugging and querying easier without introducing much complexity.

---

# 27. Templates

Templates should reference document versions.

```text
templates
---------
id
user_id
document_version_id
name
created_at
updated_at
```

Creating an email from a template means:

```text
Template version
       ↓
Clone
       ↓
New document
       ↓
Edit
```

Never mutate the original template.

---

# 28. Asset Architecture

Images should have stable asset identities:

```text
assets
------
id
user_id
storage_key
content_type
size
width
height
checksum
created_at
```

The document references:

```json
{
  "assetId": "asset_123"
}
```

rather than directly embedding:

```text
https://random-storage-url...
```

This is an important improvement.

The compiler resolves the asset.

That gives us freedom later to change:

* storage provider
* CDN
* resizing
* optimization
* image proxy
* CID handling

without rewriting documents.

---

# 29. Image Delivery

There are actually two different image requirements:

### Editor/preview

Use HTTPS URLs.

### Email

Compiler creates the correct representation for the outbound email.

Don't make "CID everything" an architectural requirement yet.

Instead:

```text
Asset
 ↓
Email Asset Resolver
 ↓
remote URL OR CID
```

Then test which strategy gives the best Gmail/Outlook behavior for the MVP.

---

# 30. Authentication

Separate:

```text
Product identity
```

from:

```text
Mailbox authorization
```

This is correct in your original architecture.

A user might authenticate into the application using:

```text
Google
```

but separately authorize:

```text
Gmail sending
```

Those are different concepts.

Do not accidentally use "Google login" as equivalent to "permission to send email."

---

# 31. OAuth Token Security

Store:

```text
encrypted refresh token
```

server-side.

Never:

```text
frontend localStorage
```

Never:

```text
database plaintext
```

Never:

```text
logs
```

Google recommends encrypting stored tokens for server-side applications that retain tokens for many users. ([Google for Developers][9])

---

# 32. OAuth Scope Strategy

MVP:

### Gmail

```text
gmail.send
```

### Microsoft

```text
Mail.Send
```

Do not request:

```text
gmail.readonly
gmail.modify
mail.read
mail.readwrite
```

just because they may be useful later.

Google explicitly recommends choosing the narrowest scope possible. ([Google for Developers][1])

This also improves trust.

---

# 33. Sent History

There is a subtle product issue here.

If we only request `gmail.send`, we cannot build a Gmail-synchronized sent mailbox.

That's fine.

Our "Sent" section means:

> **emails sent through our application**

not:

> **all emails sent from your Gmail account.**

This distinction should be explicit in UX.

---

# 34. Email Threading

MVP should **not** attempt full inbox synchronization.

But the sending architecture should leave room for:

```text
In-Reply-To
References
thread metadata
```

Gmail documents that matching the subject and using `References` / `In-Reply-To` correctly can group replies into a thread. ([Google for Developers][6])

Later, if inbox read permissions are added, this becomes much more powerful.

For MVP:

**new emails only.**

---

# 35. Preview Architecture

Two preview modes:

```text
EDITOR VIEW
Document Renderer
      ↓
Interactive
```

and:

```text
EMAIL PREVIEW
Document
 ↓
Compiler
 ↓
HTML
 ↓
Sandboxed iframe
```

The second is the authoritative preview.

Desktop:

```text
600px
```

Mobile:

```text
375px
```

But don't claim that this proves perfect rendering across every email client.

It doesn't.

---

# 36. Rendering Test Strategy

This needs to be explicitly added.

The compiler should have a fixture library:

```text
fixtures/
  basic-heading
  two-column
  image
  button
  long-text
  dark-background
  mobile
  outlook-edge-cases
```

Each fixture generates:

```text
document
HTML
plaintext
```

and is tested automatically.

Later:

```text
Gmail
Outlook
Apple Mail
Yahoo
```

can become a real rendering test matrix.

This is a major moat if executed well.

---

# 37. UX Architecture

Dashboard:

```text
┌────────────────────────────────────────┐
│ Create Email                           │
│                                        │
│ Recent                                │
│ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │ Draft  │ │ Sent   │ │Template│       │
│ └────────┘ └────────┘ └────────┘       │
└────────────────────────────────────────┘
```

Editor:

```text
┌────────────┬──────────────────┬─────────────┐
│ Blocks / AI│     Canvas       │  Inspector  │
│            │                  │             │
│ Heading    │     EMAIL        │ Typography  │
│ Text       │                  │ Colors      │
│ Image      │                  │ Spacing     │
│ Button     │                  │ Alignment   │
│ Columns    │                  │             │
└────────────┴──────────────────┴─────────────┘
```

But AI should not permanently consume a large side panel.

The default experience should feel like:

**a beautiful email editor with AI embedded inside it.**

Not:

**an AI chatbot with an email editor attached.**

---

# 38. AI UX

The user can:

```text
Generate
```

from the start.

But once editing:

```text
Select block
        ↓
AI ✨
        ↓
Rewrite
Shorten
Expand
Change tone
Improve CTA
Translate
```

For the whole document:

```text
Make this more premium
Make it friendlier
Make it shorter
Make it more persuasive
Restyle this
```

The AI should show a proposed change.

Never silently destroy the user's work.

---

# 39. Undo / Redo

This becomes a core feature, not a nice-to-have.

Every mutation should conceptually be:

```text
Document
+
Operation
=
New Document
```

Examples:

```text
ADD_BLOCK
UPDATE_BLOCK
DELETE_BLOCK
MOVE_BLOCK
UPDATE_THEME
AI_PATCH
```

That creates a powerful future foundation.

---

# 40. AI Patch Model

Instead of:

```json
{
  "entireDocument": "..."
}
```

AI should eventually return operations such as:

```json
{
  "operations": [
    {
      "type": "update_block",
      "blockId": "b2",
      "changes": {
        "text": "Updated text"
      }
    }
  ]
}
```

For full generation, the AI returns an entire valid document.

For editing, it returns operations.

This dramatically reduces accidental document destruction.

---

# 41. Backend Architecture

I would use:

```text
Node.js
TypeScript
Fastify
PostgreSQL
Redis
BullMQ
```

rather than automatically selecting NestJS.

NestJS is good, but the MVP does not need its abstraction overhead.

A disciplined Fastify modular monolith is sufficient.

Suggested modules:

```text
auth
users
documents
document-versions
templates
ai
compiler
assets
connections
sending
providers
jobs
```

---

# 42. API

REST is still the right MVP choice.

Core endpoints:

```text
POST   /auth/register
POST   /auth/login

GET    /account
GET    /connections
POST   /connections/gmail
POST   /connections/microsoft
DELETE /connections/:id

GET    /documents
POST   /documents
GET    /documents/:id
PATCH  /documents/:id

GET    /documents/:id/versions
POST   /documents/:id/versions

POST   /documents/:id/compile

POST   /ai/generate
POST   /ai/rewrite
POST   /ai/restyle

GET    /templates
POST   /templates
POST   /templates/:id/use

POST   /assets/upload-url

POST   /documents/:id/send

GET    /sends
GET    /sends/:id
```

---

# 43. Send Lifecycle

The send state machine should be explicit.

```text
DRAFT
  │
  ▼
VALIDATING
  │
  ▼
QUEUED
  │
  ▼
SENDING
  │
  ├───────────────► RETRYING
  │                     │
  │                     └──► SENDING
  │
  ├───────────────► SENT
  │
  └───────────────► FAILED
```

This is much safer than simply:

```text
queued | sent | failed
```

---

# 44. Idempotency

This is an important addition.

Imagine:

```text
User clicks Send
 ↓
Server queues job
 ↓
Network fails
 ↓
User clicks Send again
```

You don't want two emails.

Every send request should have an idempotency key.

Example:

```text
Idempotency-Key: uuid
```

The server ensures that one logical send request produces one send operation.

This should be MVP architecture, not postponed.

---

# 45. Background Jobs

Only genuinely asynchronous tasks should use the queue.

MVP:

```text
send-email
```

Definitely async.

AI:

```text
synchronous initially
```

unless latency requires async processing.

Token refresh:

```text
on-demand
```

rather than creating a complicated proactive refresh system immediately.

This simplifies the MVP.

---

# 46. Rate Limiting

Separate limits:

```text
AI generation
Send requests
Recipients per send
OAuth attempts
API requests
Asset uploads
```

And distinguish:

```text
security limits
product limits
provider limits
```

Don't mix them.

---

# 47. Abuse Prevention

This is more important than it appears.

Because the product has:

```text
OAuth mailbox access
+
automated API sending
```

someone could attempt to use the platform as a spam interface.

MVP needs:

* per-user send limits
* recipient caps
* new-account restrictions
* suspicious-volume detection
* account suspension capability
* provider error monitoring
* abuse reporting
* audit logs

The system should be designed so that a compromised account cannot become a high-volume relay.

---

# 48. Security Architecture

Layers:

```text
Browser
 ↓
HTTPS
 ↓
Authentication
 ↓
Authorization
 ↓
Validation
 ↓
Business logic
 ↓
Provider boundary
```

Every resource request must enforce:

```text
user_id === resource.owner_id
```

No client-supplied user ID should be trusted.

---

# 49. Privacy

MVP should intentionally avoid:

* inbox reading
* email-body ingestion from inbox
* tracking pixels
* open tracking
* click tracking
* contact profiling
* behavioral advertising

This makes the privacy story unusually clean:

> **We help you create and send email. We don't need to read your inbox.**

That is a powerful onboarding message.

---

# 50. Database

Recommended MVP schema:

```text
users
oauth_connections
documents
document_versions
templates
assets
sends
send_recipients
ai_generations
```

Relationship:

```text
User
 ├── OAuth Connections
 ├── Documents
 │     └── Versions
 ├── Templates
 ├── Assets
 ├── Sends
 │     └── Recipients
 └── AI Generations
```

---

# 51. Frontend State

Use Zustand.

But don't put everything into one global store.

Separate:

```text
documentStore
editorStore
aiStore
sendStore
sessionStore
```

Document store:

```text
document
version
dirty
undo
redo
```

Editor store:

```text
selectedBlock
hoveredBlock
dragState
inspectorState
```

AI store:

```text
generation
pendingPatch
loading
error
```

---

# 52. Frontend Renderer

The editor renderer should be component-driven:

```text
EmailCanvas
 ├── Section
 │    ├── HeadingBlock
 │    ├── TextBlock
 │    ├── ImageBlock
 │    └── ButtonBlock
 └── Section
      ├── Column
      └── Column
```

It should never accept arbitrary HTML.

That protects the entire architecture.

---

# 53. Project Structure

I would modify your original structure slightly:

```text
/apps
  /web
    /src
      /app
      /routes
      /features
        /editor
        /ai
        /documents
        /templates
        /sending
        /settings
      /components
      /stores
      /lib

  /api
    /src
      /modules
        /auth
        /users
        /connections
        /documents
        /versions
        /templates
        /ai
        /compiler
        /assets
        /sending
        /sends
      /providers
        /gmail
        /microsoft
        /llm
        /storage
      /jobs
      /db
      /middleware
      /shared

/packages
  /email-schema
  /email-document
  /email-compiler
  /email-mime
  /design-system
  /validation
```

The separation between:

```text
email-schema
email-document
email-compiler
email-mime
```

is valuable.

---

# 54. Why Separate MIME from Compiler?

Because:

```text
Compiler = visual email representation
```

while:

```text
MIME = transport representation
```

So:

```text
EmailDocument
     ↓
Compiler
     ↓
HTML + plaintext
     ↓
MIME Builder
     ↓
Provider
```

Gmail specifically expects an RFC 2822 MIME message encoded into the `raw` field. ([Google for Developers][6])

This separation makes testing much easier.

---

# 55. Deployment

MVP:

```text
Vercel
   │
   └── React frontend

Managed container
   │
   ├── API
   └── Worker

Supabase/Neon/RDS
   │
   └── PostgreSQL

Upstash/Redis Cloud
   │
   └── Redis

S3/R2
   │
   └── Assets
```

You do not need:

* Kubernetes
* service mesh
* Kafka
* event sourcing
* multi-region
* dedicated SMTP infrastructure

---

# 56. Observability

Track:

```text
email_compilation_success
email_compilation_failure
send_queued
send_started
send_success
send_failure
oauth_connect
oauth_refresh_success
oauth_refresh_failure
ai_generation
ai_generation_failure
ai_validation_failure
```

Critical metrics:

```text
send success rate
send failure rate
OAuth failure rate
AI generation success rate
compiler failure rate
queue latency
```

These directly map to product reliability.

---

# 57. Cost Architecture

The important cost model is:

```text
User
 ↓
AI usage
 ↓
Storage
 ↓
Compute
 ↓
Queue
```

Mailbox sending is delegated to the user's provider.

That gives this product an attractive early gross-margin structure.

However, don't assume unlimited free delivery. Gmail and Microsoft still enforce their own sending policies and quotas. Gmail's documented consumer limits are an example of why the product must enforce conservative product-level limits. ([Google Help][8])

---

# 58. Major Technical Risks

### 1. Email rendering

Highest risk.

Mitigation:

```text
constrained document model
+
MJML
+
fixture testing
+
real-client testing
```

### 2. Google OAuth

High risk because `gmail.send` is a sensitive scope and public use may require verification. ([Google for Developers][1])

Start this early.

### 3. OAuth lifecycle

Tokens expire/revoke/change.

Need robust reconnect UX.

### 4. AI quality

AI must generate useful designs, not merely valid JSON.

### 5. Abuse

Automated sending creates abuse potential.

### 6. Product positioning

Users must immediately understand:

> "This is not Mailchimp."

---

# 59. Major Product Risks

The biggest one isn't technical.

It is:

> **Is "beautiful email from my Gmail" painful enough to create a standalone product?**

That must be validated quickly.

The MVP therefore should not spend six months building:

* campaigns
* analytics
* collaboration
* CRM
* scheduling
* domains

before answering that question.

---

# 60. What Should NOT Be Built

Absolutely defer:

```text
CRM
Contact management
Campaigns
Sequences
Automation
A/B testing
Advanced analytics
Open tracking
Click tracking
Scheduling
Team collaboration
Roles
Brand CMS
Template marketplace
Custom domains
ESP infrastructure
Dedicated IPs
Mobile app
Inbox synchronization
Full Gmail search
```

Even if competitors have them.

The product is not trying to beat Mailchimp at Mailchimp.

---

# 61. MVP Definition of Done

I would make the MVP brutally specific.

A user can:

```text
1. Create account
2. Connect Gmail
3. Click New Email
4. Describe what they want
5. Receive a polished email
6. Edit blocks visually
7. Upload an image
8. Change theme/style
9. Preview compiled email
10. Add recipients
11. Send
12. See successful send
13. Reopen the sent email
14. Duplicate it
15. Edit and send again
```

If that works beautifully:

**MVP is done.**

Microsoft can follow immediately after Gmail is proven.

---

# 62. Development Sequence

I would modify your sequence significantly.

## Phase 0 — Product/Architecture Validation

Before building the entire app:

```text
Document schema
Compiler prototype
Gmail send prototype
```

Prove:

```text
JSON
 ↓
HTML
 ↓
MIME
 ↓
Gmail
 ↓
real inbox
```

This is the technical spine.

---

## Phase 1 — Email Engine

Build:

```text
email-schema
email-document
compiler
MIME builder
fixtures
validation
```

No polished UI yet.

---

## Phase 2 — Gmail Vertical Slice

Build:

```text
Auth
OAuth
Gmail
Simple editor
Compile
Send
```

The goal is:

> **One person can create and send one beautiful email.**

---

## Phase 3 — Editor

Build:

```text
Canvas
Block palette
Drag/drop
Inspector
Theme system
Undo/redo
Assets
Preview
```

---

## Phase 4 — AI

Build:

```text
Generate
Rewrite
Improve
Restyle
```

AI should plug into the already-working document engine.

---

## Phase 5 — Productization

Build:

```text
Drafts
Templates
Sent
Dashboard
Settings
Error recovery
Rate limits
Observability
```

---

## Phase 6 — Microsoft

Implement:

```text
MicrosoftProvider
```

without changing:

```text
Document
Compiler
MIME
Sending
```

---

## Phase 7 — Private Beta

Measure:

```text
time-to-first-email
generation acceptance rate
edit rate
send completion rate
failed sends
repeat usage
template reuse
emails/user/week
```

The most important metric is probably:

> **Percentage of users who generate an email and actually send it.**

That tells us whether the magic works.

---

# 63. Phase 2–4 Architectural Questions

The revised list should be:

1. Should recipient lists eventually become a separate campaign abstraction?
2. Should scheduling use our queue or provider-native scheduling?
3. Do users actually want open/click analytics badly enough to justify tracking?
4. Should inbox/reply integration ever be added?
5. Should multiple mailbox connections become first-class?
6. Should brand identity become a reusable theme object?
7. Should AI eventually understand a user's previous emails?
8. Should AI be allowed to modify the whole document through operations?
9. Should we build our own compiler if MJML becomes limiting?
10. Should custom-domain sending introduce a second delivery architecture?
11. Should teams/workspaces be introduced?
12. At what usage level does the monolith need decomposition?
13. Is there enough demand to move from personal correspondence into campaigns?
14. Should the product remain personal-email-first permanently?

---

# 64. The Strategic Architectural Moat

This is the part I would emphasize most.

The moat is **not**:

```text
AI
```

because everyone has AI.

It is not:

```text
drag-and-drop
```

because Unlayer, Beefree, Stripo and others already have it. Unlayer, for example, explicitly markets AI-assisted email creation, structured design data and reliable cross-client rendering. ([Unlayer][3])

The potential moat is:

```text
Semantic Email Document Engine
                +
Email-safe Compiler
                +
AI Design Intelligence
                +
Personal Mailbox Sending
```

That combination is much more defensible.

---

# A. FINAL RECOMMENDED MVP ARCHITECTURE

```text
PRODUCT
│
├── React + TypeScript Web App
│
├── Node.js + TypeScript Modular Monolith
│
├── PostgreSQL
│
├── Redis + BullMQ
│
├── S3/R2 Asset Storage
│
├── AI Provider
│
├── Gmail API
│
└── Microsoft Graph
```

At the center:

```text
                EMAIL DOCUMENT
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
      EDIT           AI         TEMPLATE
        │             │             │
        └─────────────┼─────────────┘
                      ▼
                  VALIDATION
                      │
                      ▼
                  COMPILER
                      │
              ┌───────┴───────┐
              ▼               ▼
            HTML          PLAINTEXT
              │               │
              └───────┬───────┘
                      ▼
                  MIME BUILDER
                      │
                      ▼
                MAIL PROVIDER
                 /           \
             Gmail          Microsoft
```

The architectural invariant is:

> **Every editable email is an Email Document. Every email sent by the system is a compiled version of an immutable Email Document snapshot.**

---

# B. FINAL ARCHITECTURAL DECISIONS

| Decision           | Recommendation                     |
| ------------------ | ---------------------------------- |
| Architecture       | Modular monolith                   |
| Canonical model    | Typed Email Document JSON          |
| Database           | PostgreSQL + JSONB/version records |
| Editor             | React component renderer           |
| Compiler           | MJML-backed compiler abstraction   |
| HTML               | Derived artifact                   |
| MIME               | Separate compiler/transport layer  |
| AI                 | Structured document + operations   |
| AI HTML generation | Never                              |
| Gmail              | Gmail API                          |
| Microsoft          | Graph API                          |
| Gmail scope        | `gmail.send`                       |
| Microsoft scope    | `Mail.Send`                        |
| OAuth tokens       | Encrypted server-side              |
| Sending            | User's mailbox                     |
| SMTP               | None                               |
| Queue              | Redis/BullMQ                       |
| Assets             | S3-compatible storage              |
| API                | REST                               |
| Backend            | Node/TypeScript                    |
| Frontend state     | Zustand                            |
| Drafts             | Versioned documents                |
| Templates          | Immutable reusable versions        |
| Sends              | Immutable snapshots/events         |
| Recipients         | Relational `send_recipients`       |
| Preview            | Actual compiled HTML               |
| Editor canvas      | Document-model renderer            |
| AI edits           | Patch/operation model              |
| Tracking           | None in MVP                        |
| CRM                | None                               |
| Campaigns          | None                               |
| Scheduling         | None                               |
| Teams              | None                               |
| Kubernetes         | None                               |

---

# C. Architectural Principles That Become Non-Negotiable

These should go into the repository as an `ARCHITECTURE.md`.

```text
1. EmailDocument is the source of truth.

2. HTML is always derived.

3. AI never generates authoritative HTML.

4. The editor never mutates arbitrary HTML.

5. The compiler is deterministic and versioned.

6. Sent emails reference immutable document snapshots.

7. MIME construction is separate from HTML compilation.

8. Gmail and Microsoft are provider implementations behind an abstraction.

9. OAuth authorization is separate from application authentication.

10. OAuth tokens never reach the browser.

11. OAuth scopes must be minimum-necessary.

12. The MVP does not operate its own SMTP infrastructure.

13. Provider-specific behavior stays inside provider adapters.

14. Product logic must not contain Gmail/Microsoft-specific branches.

15. AI changes must pass schema and business validation.

16. Every send must be idempotent.

17. Every user-owned resource must enforce ownership authorization.

18. Email layout freedom is intentionally constrained for reliability.

19. Infrastructure must remain simpler than the product.

20. New features must justify their complexity against the core thesis.
```

---

# D. MACHINE-READABLE SOURCE OF TRUTH

This is the version I would give another AI.

```json
{
  "architecture_specification": {
    "version": "2.0",
    "status": "master_source_of_truth",
    "product": {
      "category": "AI-native visual email creation and personal mailbox sending",
      "thesis": "Users can describe, visually design, refine and send polished emails from their own Gmail or Microsoft mailbox without HTML or ESP infrastructure.",
      "primary_unit": "email",
      "primary_users": [
        "freelancers",
        "consultants",
        "founders",
        "creators",
        "small_business_operators",
        "sales_professionals",
        "recruiters"
      ],
      "mvp_positioning": "Personal-email-first, not campaign-first"
    },
    "core_invariant": {
      "canonical_source": "EmailDocument",
      "derived_artifacts": [
        "email_html",
        "plaintext",
        "mime_message"
      ],
      "rule": "HTML and MIME are never canonical sources of truth."
    },
    "document_engine": {
      "schema": "versioned_typed_json",
      "storage": "PostgreSQL JSONB",
      "versioning": true,
      "operations": [
        "ADD_BLOCK",
        "UPDATE_BLOCK",
        "DELETE_BLOCK",
        "MOVE_BLOCK",
        "UPDATE_THEME",
        "AI_PATCH"
      ],
      "block_types": [
        "heading",
        "paragraph",
        "image",
        "button",
        "divider",
        "spacer",
        "section",
        "two_column",
        "three_column",
        "logo",
        "footer"
      ]
    },
    "rendering": {
      "editor": "interactive_document_model_renderer",
      "email_preview": "compiled_email_html",
      "compiler": "MJML-backed abstraction",
      "output": [
        "HTML",
        "plaintext"
      ],
      "compiler_versioned": true,
      "arbitrary_html": false
    },
    "ai": {
      "generation_modes": [
        "full_document",
        "rewrite",
        "improve",
        "restyle"
      ],
      "full_generation_output": "validated_EmailDocument",
      "editing_output": "document_operations_or_patch",
      "raw_html_generation": false,
      "validation": [
        "schema_validation",
        "business_rule_validation",
        "design_policy_validation"
      ],
      "provider": "abstracted_llm_provider"
    },
    "frontend": {
      "framework": "React",
      "language": "TypeScript",
      "state": "Zustand",
      "editor": "component_based_document_renderer",
      "drag_drop": "dnd-kit",
      "preview": "sandboxed_iframe",
      "views": [
        "dashboard",
        "editor",
        "preview",
        "templates",
        "sent",
        "settings"
      ]
    },
    "backend": {
      "architecture": "modular_monolith",
      "runtime": "Node.js",
      "language": "TypeScript",
      "framework": "Fastify",
      "api": "REST",
      "modules": [
        "auth",
        "users",
        "connections",
        "documents",
        "document_versions",
        "templates",
        "ai",
        "compiler",
        "assets",
        "sending",
        "sends"
      ]
    },
    "database": {
      "engine": "PostgreSQL",
      "tables": [
        "users",
        "oauth_connections",
        "documents",
        "document_versions",
        "templates",
        "assets",
        "sends",
        "send_recipients",
        "ai_generations"
      ],
      "document_content": "JSONB",
      "send_snapshot": true
    },
    "authentication": {
      "product_auth": [
        "email_password",
        "Google_login",
        "Microsoft_login"
      ],
      "mailbox_authorization": {
        "protocol": "OAuth2",
        "server_side": true,
        "pkce": true,
        "refresh_tokens": "encrypted_at_rest"
      }
    },
    "mail_providers": {
      "interface": [
        "connect",
        "refresh",
        "send"
      ],
      "gmail": {
        "api": "Gmail API",
        "scope": "gmail.send"
      },
      "microsoft": {
        "api": "Microsoft Graph",
        "scope": "Mail.Send"
      },
      "smtp": false
    },
    "sending": {
      "pipeline": [
        "load_document_snapshot",
        "validate",
        "compile",
        "build_mime",
        "queue",
        "provider_send",
        "record_result"
      ],
      "async": true,
      "idempotency": true,
      "retry": true,
      "dead_letter_state": true,
      "product_recipient_cap": "configurable",
      "recipient_types": [
        "to",
        "cc",
        "bcc"
      ]
    },
    "assets": {
      "storage": "S3-compatible",
      "upload": "signed_direct_upload",
      "document_reference": "asset_id",
      "email_resolution": "provider_agnostic_asset_resolver"
    },
    "queue": {
      "technology": "Redis + BullMQ",
      "mvp_jobs": [
        "send_email"
      ],
      "ai_async": "only_if_latency_requires_it"
    },
    "security": {
      "principles": [
        "least_privilege",
        "encrypted_tokens",
        "resource_ownership",
        "schema_validation",
        "signed_asset_uploads",
        "rate_limiting",
        "idempotent_send"
      ],
      "inbox_access_mvp": false,
      "tracking_mvp": false
    },
    "privacy": {
      "gmail_read_access": false,
      "microsoft_mail_read_access": false,
      "open_tracking": false,
      "click_tracking": false,
      "contact_profiling": false
    },
    "excluded_mvp": [
      "crm",
      "contact_lists",
      "csv_import",
      "campaigns",
      "automation",
      "drip_sequences",
      "ab_testing",
      "scheduling",
      "advanced_analytics",
      "open_tracking",
      "click_tracking",
      "team_collaboration",
      "brand_cms",
      "template_marketplace",
      "custom_domain_sending",
      "platform_smtp",
      "dedicated_ips",
      "native_mobile_apps",
      "inbox_sync"
    ],
    "infrastructure": {
      "frontend": "CDN/edge hosting",
      "backend": "managed_container_platform",
      "database": "managed_postgresql",
      "queue": "managed_redis",
      "storage": "S3-compatible",
      "kubernetes": false,
      "multi_region": false,
      "microservices": false
    },
    "observability": {
      "error_tracking": "Sentry_or_equivalent",
      "structured_logging": true,
      "metrics": [
        "send_success_rate",
        "send_failure_rate",
        "oauth_refresh_failure_rate",
        "ai_generation_success_rate",
        "ai_validation_failure_rate",
        "compiler_failure_rate",
        "queue_latency"
      ]
    },
    "development_sequence": [
      "architecture_and_schema",
      "compiler_and_document_engine",
      "gmail_vertical_slice",
      "visual_editor",
      "preview",
      "ai_generation",
      "ai_editing",
      "drafts_templates_sent",
      "hardening",
      "microsoft_provider",
      "private_beta"
    ],
    "future_questions": [
      "campaign_model",
      "scheduling_model",
      "analytics_privacy",
      "multi_mailbox",
      "inbox_integration",
      "brand_system",
      "team_workspaces",
      "custom_domain_sending",
      "platform_delivery"
    ],
    "non_negotiable_rules": [
      "EmailDocument_is_canonical",
      "HTML_is_derived",
      "AI_does_not_generate_authoritative_HTML",
      "editor_does_not_edit_arbitrary_HTML",
      "compiler_is_versioned",
      "sent_emails_use_immutable_snapshots",
      "MIME_is_separate_from_compiler",
      "mail_providers_are_abstracted",
      "OAuth_tokens_never_reach_browser",
      "minimum_required_OAuth_scopes",
      "no_platform_SMTP_in_MVP",
      "all_AI_output_is_validated",
      "send_requests_are_idempotent",
      "all_resources_require_ownership_authorization",
      "email_layout_is_constrained_for_reliability",
      "infrastructure_remains_minimal"
    ]
  }
}
```

## The one architectural change I'd be most insistent about

Your original architecture was already around **80–90% of the way there**. The strongest version is not a dramatically different stack.

The key refinement is the separation:

```text
                    ┌─────────────────────┐
                    │    Email Document   │
                    │   Engine / Schema   │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
       Editor                 AI                Templates
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                               ▼
                         Email Compiler
                               │
                       ┌───────┴───────┐
                       ▼               ▼
                     HTML          Plaintext
                       │               │
                       └───────┬───────┘
                               ▼
                         MIME Builder
                               │
                               ▼
                         MailProvider
                         /          \
                     Gmail        Microsoft
```

That architecture is clean enough to build now, but it also gives you a very natural path toward the much bigger product later:

```text
MVP
Email creation
     ↓
Phase 2
Templates + scheduling
     ↓
Phase 3
Contacts + personalization
     ↓
Phase 4
Campaigns + analytics
     ↓
Phase 5
Teams + brands
     ↓
Phase 6
Platform sending / domains
```

And importantly, **none of those future phases require you to throw away the Email Document Engine**.

That is what makes this a genuinely good foundation rather than just an MVP that happens to work.

The competitive research also strengthens the thesis: Gamma validates the prompt → structured visual artifact → iterative refinement pattern, while Unlayer and Beefree validate the structured email-builder + AI direction. The remaining opportunity is the **personal-mailbox sending layer and the unified creation-to-send experience**. ([Gamma][2])

One final launch-critical point: **start the Google OAuth verification process early**, not after the product is finished. `gmail.send` is classified by Google as a sensitive Gmail scope, so verification is part of the actual launch path, not merely an administrative cleanup task. ([Google for Developers][1])
