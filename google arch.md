This phase introduces an important architectural constraint: **your product is not an ESP in the MVP. It is a visual composition layer sitting on top of the user's existing mailbox.**

That means Gmail and Microsoft remain the systems of record for mailbox identity and sending. Your application owns the document, design, AI, drafts, scheduling state, and send orchestration.

I also checked the current Google and Microsoft documentation because OAuth scopes, verification requirements, and provider behavior are areas where stale assumptions can cause serious implementation problems.

# Phase 3 — Identity, OAuth & Sending Architecture

## 1. Executive architecture decision

For the MVP, I recommend **Option A: your backend → Gmail/Microsoft APIs**.

Not Resend.

Not SMTP.

Not app passwords.

Not storing users' mailbox passwords.

The architecture should be:

```text
                         YOUR APPLICATION
                               │
                ┌──────────────┴──────────────┐
                │                             │
          Application Auth              Mailbox Connection
                │                             │
                │                    ┌────────┴────────┐
                │                    │                 │
                │                  Gmail           Microsoft
                │                  OAuth              OAuth
                │                    │                 │
                │                    ▼                 ▼
                │                Gmail API       Microsoft Graph
                │                    │                 │
                └──────────────┬─────┴─────────────────┘
                               │
                        Connected Account
                               │
                        Email Composer
                               │
                        EmailDocument
                               │
                           Compiler
                               │
                         CompiledEmail
                               │
                         Send Orchestrator
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
               Gmail API             Graph API
                    │                     │
                    └──────────┬──────────┘
                               ▼
                          RECIPIENT
```

This is the cleanest MVP because the user's existing mailbox handles:

* sender identity
* authentication
* mailbox ownership
* sending
* Sent folder
* provider-level delivery infrastructure

Your application handles:

* design
* AI
* email document
* templates
* drafts
* scheduling
* orchestration
* UX

---

# 2. Why Option A wins for the MVP

There are three possible architectures.

### Option A — Direct mailbox API

```text
Your backend
     ↓
Gmail API / Microsoft Graph
     ↓
Recipient
```

**Pros**

* No SMTP infrastructure.
* No domain verification.
* No DKIM/SPF setup for users.
* Email naturally comes from their mailbox.
* Appears in their Sent folder.
* Low infrastructure cost.
* Excellent fit for the product thesis.
* Very fast to build.

**Cons**

* Provider sending limits.
* Gmail/Microsoft OAuth verification.
* Provider-specific APIs.
* Limited delivery analytics.
* You're dependent on provider availability.
* High-volume sending is inappropriate.

**MVP:** **YES**

---

### Option B — Third-party email infrastructure

```text
Your backend
     ↓
Resend / SES / Postmark
     ↓
Recipient
```

**Pros**

* Better sending infrastructure.
* Better delivery events.
* Better campaign support.
* Better high-volume sending.
* Provider-independent mailbox sending.

**Cons**

Users eventually need:

```text
Domain verification
SPF
DKIM
DMARC
```

And the sender identity becomes a different problem.

It also changes the product from:

> "Send beautiful emails from your existing mailbox."

toward:

> "Run email delivery infrastructure."

**MVP:** No.

---

### Option C — Hybrid

Eventually:

```text
                    Send Engine
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
        Gmail        Outlook       ESP
         API           Graph      Provider
```

This is the **long-term architecture**.

But don't build all three paths now.

---

# 3. The important product boundary

The system should distinguish:

```text
Application Account
```

from:

```text
Connected Mailbox
```

They are not the same thing.

A user might have:

```text
Daniel's account
    │
    ├── Gmail: daniel@gmail.com
    │
    ├── Work Outlook: daniel@company.com
    │
    └── another mailbox
```

Therefore:

```text
User
 └── ConnectedMailAccount[]
```

This is important even if the MVP initially permits only one connected mailbox.

---

# 4. Authentication architecture

There are two authentication concepts.

### Application authentication

Used to access your application:

```text
User
 ↓
Your Auth Provider
 ↓
Application Session
```

### Mailbox authorization

Used to send through Gmail/Outlook:

```text
User
 ↓
Connect Gmail
 ↓
Google OAuth
 ↓
Connected Mailbox
```

Never confuse these.

A user could sign into your application using one identity and connect a completely different mailbox.

---

# 5. Account model

Conceptually:

```text
User
│
├── profile
│
├── connected_mail_accounts[]
│
├── email_documents[]
│
├── templates[]
│
└── scheduled_messages[]
```

Connected account:

```ts
type ConnectedMailAccount = {
  id: string;

  userId: string;

  provider: "google" | "microsoft";

  providerAccountId: string;

  email: string;

  displayName?: string;

  status:
    | "active"
    | "reauthorization_required"
    | "revoked"
    | "disconnected";

  scopes: string[];

  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
};
```

Do not use the email address as the primary identity.

Use the provider's stable account identifier.

---

# 6. Gmail OAuth

For Gmail, use **server-side OAuth authorization-code flow**.

Google specifically documents web-server applications exchanging an authorization code for access and refresh tokens, with offline access allowing your backend to act when the user isn't present. ([Google for Developers][1])

Flow:

```text
User
 │
 │ "Connect Gmail"
 ▼
Your Backend
 │
 │ authorization request
 ▼
Google
 │
 │ user consent
 ▼
Google
 │
 │ authorization code
 ▼
Your Backend
 │
 │ exchange code
 ▼
Access Token + Refresh Token
 │
 ▼
Encrypted Token Storage
```

Do **not** send the refresh token to the browser.

---

# 7. Gmail scopes

This is one place where we should be deliberately minimal.

For sending, Google's Gmail API supports:

```text
https://www.googleapis.com/auth/gmail.send
```

The `messages.send` endpoint accepts `gmail.send`, `gmail.compose`, `gmail.modify`, or the broader `mail.google.com` scope. ([Google for Developers][2])

For your MVP, the default should therefore be:

```text
gmail.send
```

If you need Gmail drafts:

```text
gmail.compose
```

But don't request:

```text
mail.google.com
```

unless you genuinely need its much broader permissions.

Google explicitly recommends requesting the narrowest scope necessary. ([Google for Developers][3])

This matters commercially too.

Your OAuth consent screen should ideally say something close to:

> This app can send email on your behalf.

rather than:

> This app can read, modify, delete and manage all your email.

---

# 8. Gmail verification is a real product requirement

This isn't something to leave until launch.

Google currently classifies certain OAuth scopes as sensitive/restricted and requires verification for production applications using them unless an exception applies. ([Google for Developers][4])

For your product, this means:

```text
Development
    ↓
OAuth testing
    ↓
Production Google Cloud project
    ↓
Consent-screen configuration
    ↓
Domain/brand verification
    ↓
Scope verification where required
    ↓
Public launch
```

Google also recommends separate projects for testing and production. ([Google for Developers][3])

This should therefore be part of the MVP launch plan, not an afterthought.

---

# 9. Microsoft OAuth

Microsoft should use Microsoft identity platform authorization-code flow.

Conceptually:

```text
User
 │
 │ Connect Outlook
 ▼
Your Backend
 │
 ▼
Microsoft Identity Platform
 │
 │ consent
 ▼
Authorization Code
 │
 ▼
Your Backend
 │
 ▼
Access + Refresh Token
 │
 ▼
Encrypted Storage
```

For sending, the delegated permission you want is:

```text
Mail.Send
```

Microsoft's permissions documentation identifies delegated `Mail.Send` as the least-privileged permission for sending mail as the signed-in user. ([Microsoft Learn][5])

This is much better than requesting `Mail.ReadWrite`.

---

# 10. Microsoft sending

Microsoft Graph supports:

```http
POST /me/sendMail
```

and can send JSON or MIME messages. Attachments can be included in the JSON send operation. ([Microsoft Learn][6])

It can also create and send drafts.

The delegated `Mail.Send` permission is sufficient for sending and saving a copy to Sent Items; `Mail.ReadWrite` isn't required just to send. ([Microsoft Learn][5])

Therefore:

```text
MVP:
Mail.Send
```

not:

```text
Mail.ReadWrite
Mail.Read
Mail.ReadWrite.Shared
```

unless a future feature genuinely requires them.

---

# 11. Token storage

This is one of the highest-security parts of the system.

Never store tokens like:

```text
access_token = "..."
refresh_token = "..."
```

in plaintext.

Instead:

```text
Database
   │
   └── encrypted credential payload
             │
             ▼
        Encryption key
             │
             ▼
        Secret manager
```

At minimum:

```text
refresh_token_encrypted
access_token_encrypted
access_token_expires_at
scopes
```

The access token is temporary.

The refresh token is the important long-lived credential.

Treat it like a password.

---

# 12. Should access tokens even be persisted?

For the MVP, I'd persist encrypted access-token metadata only if your provider library requires it.

Prefer:

```text
Refresh Token
      ↓
Token Service
      ↓
Fresh Access Token
      ↓
Provider API
```

rather than maintaining long-lived access tokens unnecessarily.

The token service becomes the only component allowed to retrieve/decrypt provider credentials.

---

# 13. Token service

Create a dedicated abstraction:

```ts
interface MailAuthService {
  getValidAccessToken(
    connectionId: string
  ): Promise<string>;

  refreshAccessToken(
    connectionId: string
  ): Promise<string>;

  revokeConnection(
    connectionId: string
  ): Promise<void>;
}
```

Provider implementations:

```text
GoogleTokenService
MicrosoftTokenService
```

The rest of your application should never manipulate refresh tokens directly.

---

# 14. Token lifecycle

```text
                    OAuth
                      │
                      ▼
              Authorization Code
                      │
                      ▼
              Access + Refresh
                      │
                      ▼
               Encrypted Store
                      │
                      ▼
                 Send Request
                      │
              ┌───────┴────────┐
              │                │
          Access valid     Access expired
              │                │
              │                ▼
              │          Refresh Token
              │                │
              │                ▼
              │          New Access
              │                │
              └────────┬───────┘
                       ▼
                 Provider API
```

Google's server-side OAuth flow explicitly supports offline access and refresh tokens for operations when the user is absent. ([Google for Developers][7])

Microsoft likewise uses refresh tokens to obtain new access/refresh token pairs, and recommends securely deleting the old refresh token after obtaining a new one. ([Microsoft Learn][8])

---

# 15. Token rotation

Your token service must handle:

```text
new refresh token returned
```

by replacing the stored token atomically.

Don't do:

```text
decrypt
refresh
write later
```

without concurrency protection.

Two simultaneous jobs could otherwise race.

Use:

```text
database transaction / row lock
```

or a provider-token mutex.

---

# 16. Account revocation

A provider can revoke access.

Your application should recognize errors such as:

```text
invalid_grant
unauthorized
token revoked
consent required
```

and transition:

```text
active
   ↓
reauthorization_required
```

rather than repeatedly retrying.

Microsoft explicitly notes that refresh tokens can expire or be revoked and applications should gracefully redirect users through interactive authorization again. ([Microsoft Learn][8])

The UX should be:

> Gmail connection expired. Reconnect to continue sending.

Not:

> Something went wrong.

---

# 17. Disconnecting an account

When the user clicks:

> Disconnect Gmail

your system should:

1. Stop scheduled sends.
2. Mark connection inactive.
3. Revoke provider authorization where supported/appropriate.
4. Delete encrypted provider credentials.
5. Remove provider-specific cached data.
6. Preserve the user's email documents.
7. Preserve sent-message history as application metadata where legally/contractually appropriate.

Important distinction:

**Disconnecting a mailbox should not delete the user's email designs.**

---

# 18. Sender identity

Don't let the frontend simply submit:

```json
{
  "from": "someone@example.com"
}
```

The backend should derive sender identity from the authenticated connection.

For example:

```text
connectionId
      ↓
ConnectedMailAccount
      ↓
provider
      ↓
providerAccountId
      ↓
verified mailbox identity
```

The client says:

```text
send using connection X
```

The server determines:

```text
from = actual authorized mailbox
```

This prevents impersonation.

---

# 19. Multiple mailboxes

Architect for multiple connections from day one.

Example:

```text
Daniel
│
├── Gmail
│   └── daniel@gmail.com
│
└── Microsoft
    └── daniel@company.com
```

The UI can initially show:

> **Send from:** Daniel [daniel@gmail.com](mailto:daniel@gmail.com)

Later:

> Send from:
>
> * Daniel [daniel@gmail.com](mailto:daniel@gmail.com)
> * Daniel [daniel@company.com](mailto:daniel@company.com)

No major database redesign required.

---

# 20. Sending architecture

The core interface should be:

```ts
interface MailProvider {
  send(message: ProviderMessage): Promise<SendResult>;

  createDraft?(message: ProviderMessage): Promise<DraftResult>;

  sendDraft?(draftId: string): Promise<SendResult>;

  getAccountIdentity(): Promise<SenderIdentity>;
}
```

Implementations:

```text
GmailProvider
MicrosoftGraphProvider
```

Later:

```text
ResendProvider
SesProvider
PostmarkProvider
```

The send engine doesn't care which one is underneath.

---

# 21. Provider message

The provider should receive:

```ts
type ProviderMessage = {
  from: SenderIdentity;

  to: EmailAddress[];

  cc?: EmailAddress[];

  bcc?: EmailAddress[];

  replyTo?: EmailAddress[];

  subject: string;

  html: string;

  text: string;

  attachments?: Attachment[];
};
```

This is deliberately **after** compilation.

The sending layer shouldn't know anything about:

```text
sections
columns
blocks
colors
spacing
```

That belongs to Phase 2.

---

# 22. The complete send pipeline

This is the critical path:

```text
User clicks SEND
       │
       ▼
Create Send Request
       │
       ▼
Validate permissions
       │
       ▼
Load EmailDocument
       │
       ▼
Create immutable document snapshot
       │
       ▼
Compile document
       │
       ▼
Generate HTML + plain text
       │
       ▼
Validate recipients
       │
       ▼
Resolve connected mailbox
       │
       ▼
Resolve provider
       │
       ▼
Obtain access token
       │
       ▼
Create ProviderMessage
       │
       ▼
Send
       │
       ▼
Record provider result
       │
       ▼
Update Send status
```

---

# 23. Immutable send snapshot

This is extremely important.

Never send directly from a mutable draft.

When the user clicks Send:

```text
Draft v17
   ↓
Send Snapshot v17
   ↓
Compile
   ↓
Send
```

Suppose the user edits the draft while the send is processing.

The email already queued should not mysteriously change.

Therefore:

```text
send_messages
```

should reference an immutable snapshot/version.

---

# 24. Idempotency

This is essential.

Imagine:

```text
Send
 ↓
Gmail accepts
 ↓
Your server times out
```

Your system doesn't know whether the message was sent.

If you blindly retry:

```text
Send again
```

the recipient might receive two emails.

Therefore every send request needs an idempotency key.

Example:

```text
send_message.id = UUID
```

and:

```text
provider_request_key
```

The application guarantees:

```text
one logical send
=
one send job
```

Provider-level idempotency isn't necessarily available in the same way, so your own state machine must be designed carefully around ambiguous outcomes.

This is one of the most important limitations of direct mailbox APIs.

---

# 25. Send state machine

I recommend:

```text
draft
  │
  ▼
queued
  │
  ▼
processing
  │
  ├───────────────┐
  ▼               ▼
sent           retryable_failure
                  │
                  ▼
               retrying
                  │
          ┌───────┴───────┐
          ▼               ▼
        sent         permanent_failure
```

Also:

```text
reauthorization_required
cancelled
```

where appropriate.

---

# 26. What does "sent" actually mean?

This needs precise product language.

If Gmail API accepts your request:

> **Sent**

does **not necessarily mean:**

> The recipient received the email.

It means your application successfully handed the message to the provider.

Likewise Microsoft Graph's send endpoint can return `202 Accepted`, meaning the request was accepted, not that the recipient's mailbox has definitively received the message. ([Microsoft Learn][9])

Therefore MVP statuses should say:

```text
Sending
Sent
Failed
```

rather than claiming:

```text
Delivered
```

unless you have a real delivery signal.

---

# 27. Delivery tracking

This is a major architectural limitation of Option A.

With Gmail/Graph direct sending, you don't get the same universal webhook model that an ESP provides for:

```text
delivered
opened
clicked
bounced
complained
```

Therefore:

### MVP

Don't promise delivery analytics.

### Later

Add:

```text
ESP sending
     ↓
Delivery events
     ↓
Webhook
     ↓
Analytics engine
```

This becomes one reason to eventually introduce Option C.

---

# 28. Gmail sending

Gmail expects an RFC 2822/MIME message encoded into `raw`, then submitted through `messages.send` or a draft through `drafts.send`. ([Google for Developers][10])

Your pipeline therefore becomes:

```text
CompiledEmail
     │
     ├── HTML
     └── Plain text
          │
          ▼
       MIME builder
          │
          ▼
      RFC 2822 MIME
          │
          ▼
       base64url
          │
          ▼
Gmail messages.send
```

This MIME builder should be a dedicated module.

---

# 29. Attachments

The document system already has assets.

But don't confuse:

```text
inline email image
```

with:

```text
email attachment
```

They are different.

### Inline image

```text
<img src="https://...">
```

### Attachment

```text
Content-Disposition: attachment
```

Your MVP can support attachments separately from the visual editor.

For example:

```text
EmailDocument
     │
     ├── visual content
     │
     └── attachments[]
```

An attachment should reference an asset:

```ts
type EmailAttachment = {
  assetId: string;
  filename: string;
  contentType: string;
};
```

The provider adapter retrieves the actual file.

---

# 30. CC/BCC

These belong to the send request, not necessarily the visual document.

```text
EmailDocument
    │
    └── content

SendRequest
    │
    ├── documentVersion
    ├── to
    ├── cc
    ├── bcc
    └── connectionId
```

That keeps the reusable design independent of a specific recipient list.

---

# 31. Reply-To

Same principle.

```text
SendRequest
 ├── to
 ├── cc
 ├── bcc
 └── replyTo
```

Don't permanently bake reply-to into the design unless the product eventually introduces brand-level sender settings.

---

# 32. Drafts

There are two different concepts:

### Your application draft

```text
EmailDocument
status = draft
```

### Provider draft

```text
Gmail Draft
Microsoft Draft
```

Do not make provider drafts the canonical draft system.

Your application draft is authoritative.

Provider drafts should be an optional integration feature.

---

# 33. Should MVP create Gmail/Outlook drafts?

I would make it optional.

Primary path:

```text
Your draft
 ↓
Preview
 ↓
Send
```

Future feature:

> **Open in Gmail**

which could create a provider draft.

But don't make provider draft synchronization a requirement for the MVP.

It introduces unnecessary state synchronization.

---

# 34. Scheduling

Scheduling is interesting because it fundamentally changes token requirements.

If the user says:

> Send tomorrow at 9 AM.

the user may not be online tomorrow.

Therefore the system needs:

```text
refresh token
+
background job
+
scheduler
```

Google specifically states that offline access is required for applications that need to access Google APIs when the user is not present, including actions at predetermined times. ([Google for Developers][7])

So scheduling is compatible with your architecture.

---

# 35. Scheduling architecture

```text
User
 │
 │ Schedule
 ▼
ScheduledMessage
 │
 │ scheduledFor
 ▼
Job Scheduler
 │
 │ when due
 ▼
Send Queue
 │
 ▼
Send Worker
 │
 ▼
Token Service
 │
 ▼
Provider
```

---

# 36. Scheduling MVP recommendation

I'd actually include **basic scheduling** if it is central to your product thesis, but keep it very constrained:

```text
Send now
Schedule for later
```

No:

```text
recurring campaigns
time-zone campaigns
drip sequences
follow-up automation
```

Those belong to the future campaign product.

---

# 37. Time handling

Always store:

```text
scheduled_at_utc
timezone
```

Example:

```text
scheduled_at:
2026-09-02T08:00:00Z

timezone:
Africa/Lagos
```

The UI can display:

> Tomorrow, 9:00 AM

but the backend stores a canonical UTC timestamp.

---

# 38. Queue architecture

For MVP:

```text
API
 ↓
Database
 ↓
Queue
 ↓
Worker
 ↓
Provider
```

The API should **not** hold an HTTP request open while Gmail/Microsoft sends.

Bad:

```text
POST /send
   ↓
wait for provider
   ↓
return response
```

Better:

```text
POST /send
   ↓
create send job
   ↓
return queued
```

Then:

```text
Worker
 ↓
process
 ↓
provider
```

---

# 39. Queue choices

If your Phase 1 stack is already Supabase/Postgres-based, you don't necessarily need another infrastructure product immediately.

A PostgreSQL-backed job queue can be enough for MVP.

If the application grows:

```text
Postgres queue
      ↓
Redis / managed queue
```

or another dedicated job system.

Don't add Redis merely because "production systems use Redis."

---

# 40. Retry strategy

Retries should only happen for **transient** failures.

### Retry

```text
429
500
502
503
504
network timeout
temporary provider failure
```

### Don't retry

```text
invalid recipient
invalid token
permission denied
revoked account
malformed message
invalid request
```

Microsoft specifically recommends respecting `Retry-After` on 429 responses and using backoff for service-unavailable responses. ([Microsoft Learn][11])

---

# 41. Exponential backoff

Conceptually:

```text
Attempt 1 → immediate
Attempt 2 → 30 sec
Attempt 3 → 2 min
Attempt 4 → 10 min
Attempt 5 → 30 min
```

Add jitter.

But provider-specific `Retry-After` should override your generic backoff when provided.

---

# 42. Rate limiting

There are **three different rate limits**.

### Your application

Prevent abuse:

```text
user
IP
connection
```

### Provider API

Gmail/Graph quotas.

### Mailbox sending limits

The actual number of emails the user's account is permitted to send.

These aren't interchangeable.

Your application should maintain:

```text
per-user send limits
per-connection send limits
global infrastructure limits
```

The purpose is partly abuse prevention, not merely API protection.

---

# 43. Why your product must not become a spam cannon

This is a serious business risk.

Your product is attractive for:

> beautiful personalized emails

but could also be abused for:

> automated spam.

Therefore the MVP should have:

* authentication
* verified application accounts
* provider OAuth
* rate limits
* send quotas
* abuse monitoring
* suspicious activity detection
* account suspension
* audit logs

Don't build anonymous bulk sending.

---

# 44. Provider-specific rate limits

Don't hardcode assumptions like:

> Gmail allows exactly X emails.

Provider limits vary by account type and policy, and Gmail's API itself has quota accounting that has changed recently. Google announced updated Gmail API quota models in 2026. ([Google for Developers][12])

Your architecture should therefore represent:

```text
ProviderLimitPolicy
```

rather than scattering numbers throughout the code.

---

# 45. Error model

Normalize provider errors into your own model.

```ts
type MailError = {
  code:
    | "AUTH_REQUIRED"
    | "AUTH_REVOKED"
    | "RATE_LIMITED"
    | "INVALID_RECIPIENT"
    | "PROVIDER_UNAVAILABLE"
    | "MESSAGE_REJECTED"
    | "ATTACHMENT_ERROR"
    | "UNKNOWN";

  retryable: boolean;

  providerCode?: string;

  message: string;
};
```

Then:

```text
Gmail error
      ↓
Gmail adapter
      ↓
Normalized MailError
      ↓
Send engine
```

The UI doesn't need to understand Google's error taxonomy.

---

# 46. Security model

The security boundary should look like:

```text
                    Browser
                       │
                 HTTPS / Session
                       │
                       ▼
                 Application API
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Database     Token       Send Queue
                    Service
                       │
                       ▼
               Encrypted Tokens
                       │
                       ▼
                 Provider APIs
```

The browser must never receive:

```text
refresh_token
client_secret
provider_secret
AI secret
encryption key
```

---

# 47. OAuth state protection

Every OAuth authorization request should have:

```text
state
```

bound to the initiating application session.

The callback must verify it.

This protects against OAuth CSRF/account-linking attacks.

Also use:

```text
PKCE
```

where appropriate, especially for public-client/browser portions of an OAuth flow.

---

# 48. Account-linking attack

This deserves special attention.

Imagine:

```text
Daniel logged into your app
```

and an attacker tries to make Daniel connect:

```text
attacker@gmail.com
```

Your OAuth callback must be associated with the authenticated application user who initiated the connection.

Never:

```text
OAuth callback → trust returned email → create account
```

Instead:

```text
Authenticated user
      ↓
OAuth state
      ↓
callback
      ↓
verify state
      ↓
create connection for initiating user
```

---

# 49. Audit logging

Record security-sensitive events:

```text
oauth_connected
oauth_reauthorized
oauth_revoked
oauth_disconnected

send_requested
send_queued
send_started
send_succeeded
send_failed

schedule_created
schedule_cancelled

token_refresh_failed
```

Don't log the actual access/refresh tokens.

Don't log full email bodies unnecessarily.

---

# 50. Privacy

This product potentially handles:

* email addresses
* email content
* recipient lists
* OAuth credentials
* attachments

Therefore your privacy architecture should explicitly define:

```text
What data do we store?
Why?
How long?
Who can access it?
When do we delete it?
```

A particularly good MVP principle:

> **Don't read mailbox contents unless the feature actually requires it.**

This is another reason to avoid requesting `gmail.modify`, `gmail.readonly`, or Microsoft `Mail.Read`.

You don't need to read a user's inbox just to create and send a beautiful email.

---

# 51. Database architecture

I'd add these entities to the previous architecture.

```text
users
│
├── mail_connections
│      │
│      ├── provider
│      ├── provider_account_id
│      ├── email
│      ├── status
│      └── scopes
│
├── mail_credentials
│      │
│      ├── connection_id
│      ├── encrypted_refresh_token
│      ├── encrypted_access_token
│      └── expires_at
│
├── email_documents
│
├── email_document_versions
│
├── send_messages
│
├── scheduled_messages
│
└── audit_events
```

---

# 52. `mail_connections`

```text
mail_connections

id
user_id
provider
provider_account_id
email
display_name
status
scopes
created_at
updated_at
last_used_at
```

Unique constraint:

```text
(provider, provider_account_id)
```

This prevents duplicate connections.

---

# 53. `mail_credentials`

Keep credentials separate from the connection metadata.

```text
mail_credentials

id
connection_id
encrypted_access_token
encrypted_refresh_token
access_token_expires_at
updated_at
```

This lets you lock down access to credentials more aggressively.

---

# 54. `send_messages`

```text
send_messages

id
user_id
connection_id

document_id
document_version_id

status

to_addresses
cc_addresses
bcc_addresses
reply_to_addresses

subject

provider_message_id
provider_thread_id

idempotency_key

attempt_count

scheduled_at
started_at
sent_at

last_error_code
last_error_message

created_at
updated_at
```

One important point:

**Store recipient metadata separately from the EmailDocument.**

The document is reusable.

The send is contextual.

---

# 55. `scheduled_messages`

Could be folded into `send_messages`, but I'd keep scheduling state conceptually separate if the product will grow.

```text
scheduled_messages

id
send_message_id
scheduled_at
timezone
status
cancelled_at
created_at
```

---

# 56. API design

I'd expose something like:

```text
GET    /api/mail-connections
POST   /api/mail-connections/google
POST   /api/mail-connections/microsoft
GET    /api/mail-connections/:id
DELETE /api/mail-connections/:id
```

OAuth callback:

```text
GET /api/oauth/google/callback
GET /api/oauth/microsoft/callback
```

Sending:

```text
POST /api/emails/:id/send
POST /api/emails/:id/schedule
POST /api/sends/:id/cancel
GET  /api/sends/:id
```

Identity:

```text
GET /api/mail-connections/:id/identity
```

The browser should never call Gmail/Graph directly with your stored refresh credentials.

---

# 57. Send API

Request:

```json
{
  "connectionId": "conn_123",
  "versionId": "ver_456",
  "to": [
    {
      "email": "recipient@example.com"
    }
  ],
  "cc": [],
  "bcc": [],
  "replyTo": []
}
```

The backend then:

```text
connectionId
 ↓
authorize ownership
 ↓
load version
 ↓
compile
 ↓
send
```

The user cannot submit an arbitrary:

```text
from
```

field.

---

# 58. Schedule API

```json
{
  "connectionId": "conn_123",
  "versionId": "ver_456",
  "scheduledAt": "2026-09-02T08:00:00Z",
  "timezone": "Africa/Lagos",
  "to": [
    {
      "email": "recipient@example.com"
    }
  ]
}
```

The server validates:

```text
connection belongs to user
version belongs to user
scheduled time is valid
recipients are valid
```

---

# 59. Event model

Use internal events:

```text
MailConnectionCreated
MailConnectionRevoked
MailConnectionDisconnected

SendRequested
SendQueued
SendStarted
SendSucceeded
SendRetryScheduled
SendFailed

ScheduleCreated
ScheduleTriggered
ScheduleCancelled

TokenRefreshSucceeded
TokenRefreshFailed
```

This makes analytics and monitoring much easier later.

---

# 60. Monitoring

Monitor:

```text
OAuth success rate
OAuth failure rate

Token refresh success rate
Token refresh failures

Send success rate
Send failure rate

Provider latency

429 rate
5xx rate

Queue depth
Queue age

Retry count

Scheduled-send lateness

Compiler failures
```

The most useful operational metric will probably be:

```text
successful send / send attempt
```

broken down by:

```text
provider
```

---

# 61. Cost architecture

The beauty of Option A is that sending itself can be relatively inexpensive from your infrastructure perspective.

Your major costs become:

```text
Database
Storage
AI
Compute
OAuth/API infrastructure
Queue workers
```

You aren't paying an ESP per email for the basic MVP sending path.

The bigger cost is actually **AI generation**, not sending.

---

# 62. Scaling

At 100 users:

```text
Postgres
+
API
+
worker
```

is enough.

At 10,000 users:

```text
API
 ↓
Postgres
 ↓
Queue
 ↓
Workers
 ↓
Provider adapters
```

At much larger scale:

```text
API cluster
       │
       ▼
Message queue
       │
 ┌─────┼─────┐
 ▼     ▼     ▼
Workers
 │
 ├── Gmail
 ├── Microsoft
 └── ESP
```

The provider abstraction means this doesn't require rewriting the application.

---

# 63. What changes for newsletters?

This is where the architecture changes substantially.

Your MVP:

```text
One user
→
One mailbox
→
One/few recipients
```

Newsletter:

```text
One sender
→
10,000+ recipients
```

That is **not the same workload**.

You would need:

```text
ESP
Recipient management
Suppression lists
Unsubscribe
Bounce handling
Complaint handling
DKIM/SPF/DMARC
Campaign queues
Batching
Analytics
```

Don't try to make Gmail API your newsletter infrastructure.

---

# 64. High-volume campaigns

Move to:

```text
Campaign
 ↓
Recipient list
 ↓
Segmentation
 ↓
Campaign queue
 ↓
ESP
 ↓
Delivery events
```

Your Gmail/Outlook integration remains useful for individual emails.

So eventually:

```text
Personal email
       ↓
Gmail / Outlook

Campaign email
       ↓
ESP
```

That's the hybrid model.

---

# 65. Custom domains

Later:

```text
User verifies domain
       ↓
DNS
 ├── SPF
 ├── DKIM
 └── DMARC
       ↓
Sending provider
```

The user's mailbox no longer has to be the sender.

This enables:

```text
hello@company.com
marketing@company.com
updates@company.com
```

without requiring those addresses to be connected mailboxes.

---

# 66. Transactional email

That's another separate path:

```text
Application event
       ↓
Transactional template
       ↓
ESP
       ↓
Recipient
```

Examples:

```text
Password reset
Invoice
Welcome email
Order confirmation
Notification
```

Don't mix this into the Gmail/Outlook send engine.

---

# 67. Analytics

Direct mailbox sending:

```text
Send accepted
```

is relatively easy.

Full analytics:

```text
Delivered
Opened
Clicked
Bounced
Complained
```

is much easier through an ESP that exposes delivery events.

Therefore the eventual architecture should be:

```text
                    Send Router
                        │
             ┌──────────┴──────────┐
             │                     │
       Personal Send         Campaign Send
             │                     │
       Gmail / Graph              ESP
             │                     │
             └──────────┬──────────┘
                        ▼
                    Analytics
```

---

# A. FINAL SENDING ARCHITECTURE

I would lock this in:

```text
                         APPLICATION
                              │
                    ┌─────────┴─────────┐
                    │                   │
                App Auth          Mail Connections
                                        │
                         ┌──────────────┼──────────────┐
                         ▼              ▼              │
                       Gmail         Microsoft         │
                       OAuth           OAuth            │
                         │              │               │
                         └──────┬───────┘               │
                                ▼                       │
                       Encrypted Credentials            │
                                │                       │
                                ▼                       │
                         Token Service                  │
                                │                       │
                                ▼                       │
                         Send Orchestrator ◄────────────┘
                                │
                         Immutable Snapshot
                                │
                         Email Compiler
                                │
                         CompiledEmail
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
              Gmail Adapter          Graph Adapter
                    │                       │
                    ▼                       ▼
                Gmail API             Microsoft Graph
                    │                       │
                    └───────────┬───────────┘
                                ▼
                             RECIPIENT
```

**MVP provider strategy:**

> Gmail API + Microsoft Graph.

**Future provider strategy:**

> Gmail + Microsoft + ESP through a common provider interface.

---

# B. OAUTH FLOW DIAGRAMS

### Gmail

```text
User
 │
 │ Connect Gmail
 ▼
Your App
 │
 │ OAuth authorization request
 ▼
Google
 │
 │ Consent
 ▼
Google
 │
 │ Authorization code
 ▼
Backend
 │
 │ Exchange code
 ▼
Access Token + Refresh Token
 │
 ▼
Encrypt
 │
 ▼
Database
```

Google's web-server OAuth flow explicitly supports this authorization-code → access/refresh-token pattern and offline access. ([Google for Developers][1])

### Microsoft

```text
User
 │
 │ Connect Microsoft
 ▼
Your App
 │
 ▼
Microsoft Identity Platform
 │
 │ Consent
 ▼
Authorization Code
 │
 ▼
Backend
 │
 ▼
Access + Refresh Token
 │
 ▼
Encrypted Storage
```

---

# C. TOKEN LIFECYCLE

```text
             OAuth
               │
               ▼
        Refresh Token
               │
               ▼
        Encrypted Storage
               │
               ▼
          Send Request
               │
               ▼
       Token Service
               │
       ┌───────┴────────┐
       ▼                ▼
    Valid             Expired
       │                │
       │                ▼
       │         Refresh Provider
       │                │
       │                ▼
       │         New Access Token
       │                │
       └───────┬────────┘
               ▼
         Provider API
               │
          ┌────┴─────┐
          ▼          ▼
        Success    Revoked
                     │
                     ▼
          reauthorization_required
```

---

# D. SEND EMAIL FLOW

```text
User
 │
 │ Send
 ▼
POST /send
 │
 ▼
Authorization
 │
 ▼
Load Document Version
 │
 ▼
Create Immutable Send Snapshot
 │
 ▼
Validate Recipients
 │
 ▼
Compile EmailDocument
 │
 ▼
HTML + Plain Text
 │
 ▼
Create MIME / Provider Message
 │
 ▼
Queue
 │
 ▼
Worker
 │
 ▼
Token Service
 │
 ▼
Provider Adapter
 │
 ├───────────────┐
 ▼               ▼
Gmail          Graph
 │               │
 └───────┬───────┘
         ▼
   Provider Accepted
         │
         ▼
   send_messages
         │
         ▼
       SENT
```

---

# E. FAILURE / RETRY FLOW

```text
                    Send
                     │
                     ▼
                  Provider
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
       Success    Temporary   Permanent
                    Error       Error
                      │           │
                      ▼           ▼
                   Retry       Failed
                      │
                Retry-After?
                 /         \
               yes          no
                │            │
                ▼            ▼
           Wait specified   Exponential
                            Backoff
                │            │
                └─────┬──────┘
                      ▼
                    Retry
                      │
               ┌──────┴──────┐
               ▼             ▼
             Sent          Failed
```

For Microsoft Graph, respect the provider's `Retry-After` guidance on throttling rather than blindly applying your own retry interval. ([Microsoft Learn][11])

---

# F. DATABASE / API CONTRACTS

Core relationship:

```text
User
 │
 ├── MailConnection
 │      │
 │      └── MailCredential
 │
 ├── EmailDocument
 │      │
 │      └── EmailDocumentVersion
 │
 ├── SendMessage
 │      │
 │      └── MailConnection
 │
 └── AuditEvent
```

Critical APIs:

```text
POST /mail-connections/google
POST /mail-connections/microsoft

GET  /mail-connections
DELETE /mail-connections/:id

POST /emails/:id/send
POST /emails/:id/schedule

GET  /sends/:id
POST /sends/:id/cancel
```

Core provider abstraction:

```ts
interface MailProvider {
  getIdentity(): Promise<SenderIdentity>;

  send(message: ProviderMessage): Promise<SendResult>;

  createDraft?(
    message: ProviderMessage
  ): Promise<DraftResult>;

  sendDraft?(
    draftId: string
  ): Promise<SendResult>;
}
```

---

# G. CHANGES TO PREVIOUS ARCHITECTURE

Phase 1/2 should now explicitly add:

### 1. `MailConnection` as a first-class entity

A user can have multiple mailboxes.

### 2. `MailCredential` security boundary

OAuth credentials must be isolated from ordinary application data.

### 3. `MailProvider` abstraction

The editor and document system must never know about Gmail or Microsoft.

### 4. `SendMessage`

Sending becomes a first-class persistent entity.

### 5. Immutable send snapshots

A sent email must always correspond to a specific document version.

### 6. Send state machine

```text
queued
processing
sent
retrying
failed
reauthorization_required
cancelled
```

### 7. Background worker

Sending and scheduling should not depend on an open browser request.

### 8. Token service

Only one subsystem should handle provider credentials.

### 9. Explicit distinction between "sent" and "delivered"

The MVP should not claim delivery tracking it cannot actually prove.

### 10. Future send router

Design the provider abstraction so that:

```text
Gmail
Microsoft
ESP
```

can eventually coexist.

---

# H. IMPLEMENTATION PLAN

I would implement this phase in this exact order:

```text
3A
Application authentication
        ↓
MailConnection data model
        ↓
OAuth state/PKCE infrastructure
```

```text
3B
Google OAuth
        ↓
Token exchange
        ↓
Encrypted credentials
        ↓
Identity retrieval
```

```text
3C
Microsoft OAuth
        ↓
Token exchange
        ↓
Encrypted credentials
        ↓
Identity retrieval
```

```text
3D
Token Service
        ↓
Access-token refresh
        ↓
Rotation
        ↓
Revocation handling
```

```text
3E
Provider Interface
        ↓
Gmail Adapter
        ↓
Microsoft Adapter
```

```text
3F
CompiledEmail → ProviderMessage
        ↓
MIME builder
        ↓
Gmail sending
        ↓
Graph sending
```

```text
3G
SendMessage
        ↓
State machine
        ↓
Idempotency
        ↓
Queue
        ↓
Worker
```

```text
3H
Retry system
        ↓
Rate limiting
        ↓
Provider error normalization
        ↓
Failure handling
```

```text
3I
Scheduling
        ↓
ScheduledMessage
        ↓
Scheduler
        ↓
Queue
```

```text
3J
Audit logs
        ↓
Monitoring
        ↓
Security hardening
        ↓
OAuth production readiness
```

## The architectural line I would not cross

The final MVP should preserve this:

```text
                  EMAIL CREATION
                       │
                       ▼
                 EmailDocument
                       │
                       ▼
                    Compiler
                       │
                       ▼
                 CompiledEmail
                       │
                       ▼
                  SendMessage
                       │
                       ▼
                Provider Adapter
                   /         \
                  /           \
             Gmail API    Microsoft Graph
```

The editor knows **nothing** about Gmail.

Gmail knows **nothing** about your editor.

The AI knows **nothing** about OAuth tokens.

The send worker knows **nothing** about React.

And the browser never receives the refresh tokens.

That separation is what makes the MVP both straightforward to build and capable of eventually becoming the larger product you have in mind.

The biggest external constraint I would put on the roadmap is **Google OAuth verification**. For a public product using Gmail sending scopes, this can become a launch dependency, and Google explicitly requires production apps using applicable sensitive/restricted scopes to go through verification unless an exception applies. ([Google for Developers][3])

So from a product-planning perspective, **Gmail OAuth should be implemented and tested early**, not as the final integration after the editor is finished.

[1]: https://developers.google.com/identity/protocols/oauth2/web-server?utm_source=chatgpt.com "Using OAuth 2.0 for Web Server Applications  |  Authorization  |  Google for Developers"
[2]: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send?authuser=2&utm_source=chatgpt.com "Method: users.messages.send  |  Gmail  |  Google for Developers"
[3]: https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance?authuser=0&utm_source=chatgpt.com "Comply with OAuth 2.0 policies  |  App verification to use Google Authorization APIs  |  Google for Developers"
[4]: https://developers.google.com/identity/protocols/oauth2/policies?utm_source=chatgpt.com "OAuth 2.0 Policies  |  Google for Developers"
[5]: https://learn.microsoft.com/en-us/graph/permissions-reference?utm_source=chatgpt.com "Microsoft Graph permissions reference - Microsoft Graph | Microsoft Learn"
[6]: https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0&utm_source=chatgpt.com "user: sendMail - Microsoft Graph v1.0 | Microsoft Learn"
[7]: https://developers.google.com/identity/protocols/oauth2/web-server?authuser=2&utm_source=chatgpt.com "Using OAuth 2.0 for Web Server Applications  |  Authorization  |  Google for Developers"
[8]: https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens?utm_source=chatgpt.com "Refresh tokens in the Microsoft identity platform - Microsoft identity platform | Microsoft Learn"
[9]: https://learn.microsoft.com/en-us/graph/api/message-send?view=graph-rest-1.0&utm_source=chatgpt.com "message: send - Microsoft Graph v1.0 | Microsoft Learn"
[10]: https://developers.google.com/workspace/gmail/api/guides/sending?utm_source=chatgpt.com "Create and send email messages  |  Gmail  |  Google for Developers"
[11]: https://learn.microsoft.com/en-us/graph/best-practices-concept?utm_source=chatgpt.com "Best practices for working with Microsoft Graph - Microsoft Graph | Microsoft Learn"
[12]: https://developers.google.com/workspace/release-notes?utm_source=chatgpt.com "Google Workspace developer release notes  |  Google for Developers"
