Yes. I’d treat the Phase 1 architecture as binding here. Based on the Phase 1 decisions already established—canonical `EmailDocument`, strict `Intent → Document → Compiled Email → Provider Message` separation, a deterministic MJML-backed compiler, immutable version/send snapshots, asset IDs rather than raw URLs, and no campaigns/CRM/scheduling/custom domains in the MVP—the editor architecture should look like this.

# Phase 2 — Email Editor & Email Document Architecture

## 1. Core architectural decision

The most important decision is:

> **The editor does not edit HTML. It edits a structured email document.**

The system should have four distinct representations:

```text
                    ┌──────────────────────┐
                    │      AI / User       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    EmailDocument     │
                    │   CANONICAL STATE    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       Editor Renderer   Validation Layer   Compiler
              │                                 │
              ▼                                 ▼
        Visual Canvas                         MJML
                                                │
                                                ▼
                                      Email-safe HTML
                                                │
                                                ▼
                                        Provider Adapter
```

This distinction is fundamental.

The editor's React state is **not** the database representation.

The database representation is **not** HTML.

HTML is an **output artifact** generated from the canonical document.

MJML is an **intermediate compilation representation**, not the source of truth.

That gives you the ability to change your editor, compiler, AI model, or email provider without destroying users' documents.

MJML is particularly suitable as the compiler layer because it already abstracts responsive email's table-based HTML and client-specific CSS complexity. ([mjml.io][1])

---

# 2. Canonical Email Document

I recommend this hierarchy:

```text
EmailDocument
│
├── schemaVersion
├── id
├── metadata
│
├── settings
│
├── styles
│
├── content
│   ├── sections[]
│   │    ├── section
│   │    ├── columns[]
│   │    │    └── blocks[]
│   │    │         └── block
│   │    └── responsive
│   │
│   └── footer
│
└── variables
```

However, I would **not** make `footer` a special structural type.

A footer should simply be a section containing blocks.

That gives you:

```text
content
└── sections
    ├── hero
    ├── introduction
    ├── feature
    ├── CTA
    └── footer
```

rather than creating special cases throughout the system.

---

# 3. Proposed TypeScript model

The actual schema should be versioned.

A simplified representation:

```ts
type EmailDocument = {
  schemaVersion: number;
  id: string;

  metadata: {
    name: string;
    subject?: string;
    previewText?: string;
  };

  settings: {
    width: number;
    backgroundColor: Color;
    contentBackgroundColor: Color;
    defaultFontFamily: FontFamily;
  };

  styles: {
    typography: TypographyTokens;
    colors: ColorTokens;
    spacing: SpacingTokens;
    buttons: ButtonTokens;
  };

  content: {
    sections: EmailSection[];
  };

  variables: EmailVariable[];
};
```

Then:

```ts
type EmailSection = {
  id: string;
  type: "section";

  style: SectionStyle;

  columns: EmailColumn[];

  responsive?: ResponsiveSectionSettings;
};
```

And:

```ts
type EmailColumn = {
  id: string;

  width: number;

  blocks: EmailBlock[];

  style?: ColumnStyle;

  responsive?: ResponsiveColumnSettings;
};
```

The important constraint is:

```text
Section
  → Column
      → Block
```

rather than:

```text
Section
  → arbitrary HTML
```

---

# 4. Block system

The MVP should have a deliberately small block vocabulary.

I would start with:

```text
text
image
button
divider
spacer
social
```

And potentially:

```text
logo
```

But `logo` can initially just be an image with brand defaults.

Avoid creating 30 block types.

A block should have:

```ts
type EmailBlock = {
  id: string;
  type: BlockType;
  props: unknown;
  style: BlockStyle;
  responsive?: ResponsiveBlockSettings;
};
```

The `type` determines the contract.

For example:

```ts
type TextBlock = {
  id: string;
  type: "text";

  props: {
    content: RichTextDocument;
  };

  style: {
    typography: TypographyStyle;
    spacing: SpacingStyle;
    color?: Color;
    alignment?: Alignment;
  };
};
```

A button:

```ts
type ButtonBlock = {
  id: string;
  type: "button";

  props: {
    text: string;
    href: string;
  };

  style: {
    backgroundColor: Color;
    textColor: Color;
    borderRadius: number;
    padding: Spacing;
    typography: TypographyStyle;
  };
};
```

This gives every component a predictable contract.

---

# 5. Rich text

This is one area where I would **not** reinvent the wheel.

Use a dedicated rich-text model inside the `TextBlock`.

Lexical is a reasonable candidate because it provides editor state independently from UI and supports a modular plugin architecture. ([lexical.dev][2])

But don't allow Lexical's internal state to become your entire email document.

Instead:

```text
TextBlock
   │
   └── RichTextDocument
            │
            ├── paragraph
            ├── text
            ├── link
            └── formatting
```

The editor can use Lexical internally.

The canonical `EmailDocument` stores your normalized rich-text representation.

That prevents your database schema from becoming coupled to a UI library.

---

# 6. Layout system

The layout system should be constrained.

Don't give users arbitrary CSS grids.

Email clients are too inconsistent.

Instead:

```text
1 column
2 columns
3 columns
```

with controlled width ratios:

```text
100%
50 / 50
33 / 33 / 33
66 / 33
33 / 66
```

Potentially later:

```text
25 / 75
75 / 25
```

The editor can make this feel flexible while the underlying system remains email-safe.

For example:

```text
┌─────────────────────────────┐
│          Section            │
│                             │
│ ┌──────────┐ ┌────────────┐ │
│ │ Column 1 │ │  Column 2  │ │
│ │          │ │            │ │
│ │ [Image]  │ │ [Heading]  │ │
│ │ [Text]   │ │ [Button]   │ │
│ └──────────┘ └────────────┘ │
└─────────────────────────────┘
```

This maps naturally to MJML's section/column model. ([mjml.io][1])

---

# 7. Typography

Don't allow completely arbitrary CSS.

Create semantic typography tokens:

```text
Heading 1
Heading 2
Heading 3
Body
Small
Button
Caption
```

For example:

```ts
type TypographyTokens = {
  heading1: TypographyStyle;
  heading2: TypographyStyle;
  heading3: TypographyStyle;
  body: TypographyStyle;
  small: TypographyStyle;
  button: TypographyStyle;
};
```

Users can override them.

But the system should maintain sane defaults.

This is important for making the product feel like Canva rather than a CSS editor.

---

# 8. Color system

Use a design-token approach.

```ts
type ColorTokens = {
  primary: Color;
  secondary: Color;
  background: Color;
  surface: Color;
  text: Color;
  mutedText: Color;
  border: Color;
  accent: Color;
};
```

Then components can reference:

```text
color: "primary"
```

rather than:

```text
color: "#2176FF"
```

But allow literal values when necessary.

This becomes extremely useful for AI.

The AI can say:

```json
{
  "style": {
    "backgroundColor": {
      "token": "primary"
    }
  }
}
```

instead of generating arbitrary CSS.

---

# 9. Spacing

Use constrained spacing tokens:

```text
xs
sm
md
lg
xl
2xl
```

Internally:

```ts
type SpacingToken =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl";
```

This gives the AI a controlled design language.

It also makes the editor easier to use.

---

# 10. Images

This is an important Phase 1 decision to preserve.

**Blocks should reference asset IDs, not arbitrary URLs.**

```ts
type ImageBlock = {
  type: "image";

  props: {
    assetId: string;
    href?: string;
    alt: string;
  };
};
```

Then:

```text
ImageBlock
     │
     ▼
assetId
     │
     ▼
Asset service
     │
     ▼
Signed/public delivery URL
```

Never make this the canonical representation:

```json
{
  "src": "https://whatever.com/image.png"
}
```

The URL can change.

The asset identity shouldn't.

---

# 11. Drag and drop

Use drag-and-drop as an **editor interaction layer**, not as a document-storage mechanism.

The operation should be:

```text
Drag block A
     ↓
Editor calculates destination
     ↓
Document operation
     ↓
Update EmailDocument
     ↓
Render
```

For React, `dnd-kit` is a strong candidate. Its current React package provides draggable/droppable primitives, sensors, sortable behavior, and keyboard interaction support. ([dnd kit][3])

The editor should understand operations such as:

```ts
moveBlock({
  blockId,
  fromColumnId,
  toColumnId,
  index
});
```

rather than directly mutating arbitrary React state.

That becomes extremely useful for undo/redo and AI operations.

---

# 12. Command/operation architecture

This is one of the strongest improvements I'd make to the architecture.

Instead of every UI component directly mutating the document:

```text
UI
 ↓
setState(...)
```

use:

```text
UI
 ↓
Document Operation
 ↓
Document Reducer
 ↓
New EmailDocument
 ↓
Render
```

Examples:

```ts
insertBlock()
deleteBlock()
moveBlock()
updateBlock()
duplicateBlock()
updateSection()
moveSection()
applyStyle()
```

Then undo/redo becomes much easier.

More importantly, **AI can use the same operation system**.

For example:

```text
AI:
"Make the CTA blue and move it below the paragraph."

       ↓

updateBlock(...)
moveBlock(...)

       ↓

EmailDocument
```

The AI never needs to manipulate HTML.

This is a major architectural advantage.

---

# 13. Undo / redo

Use operation history.

Conceptually:

```text
Initial Document
      ↓
Operation 1
      ↓
Operation 2
      ↓
Operation 3
```

Undo:

```text
Operation 3 ← remove
```

Redo:

```text
Operation 3 → restore
```

For MVP, a client-side history stack is sufficient.

You don't need collaborative CRDT infrastructure.

---

# 14. Copy/paste

Copy/paste should operate on blocks and sections.

Clipboard payload:

```json
{
  "version": 1,
  "type": "email-block",
  "block": {}
}
```

When pasted:

1. Validate schema.
2. Generate new IDs.
3. Resolve asset references.
4. Insert into document.
5. Record operation.

Never duplicate IDs.

---

# 15. Keyboard shortcuts

MVP:

```text
Ctrl/Cmd + Z
Ctrl/Cmd + Shift + Z
Ctrl/Cmd + C
Ctrl/Cmd + V
Delete / Backspace
Escape
Arrow navigation
```

Later:

```text
Cmd/Ctrl + D
Cmd/Ctrl + Shift + K
```

Don't build a huge shortcut system initially.

---

# 16. Autosave

Autosave should not fire on every keystroke as a database write.

Use:

```text
User operation
     ↓
Local document state
     ↓
Debounce
     ↓
Persist draft
```

For example:

```text
2–5 second debounce
```

with immediate save on:

* leaving editor
* manual save
* send
* browser visibility change where practical

The editor should remain usable if persistence temporarily fails.

---

# 17. Persistence

Database model:

```text
email_documents
```

contains the current draft.

Then:

```text
email_document_versions
```

contains immutable snapshots.

Conceptually:

```text
email_documents
       │
       ├── current_version
       │
       └── versions
            ├── v1
            ├── v2
            ├── v3
            └── v4
```

Do not save every mouse movement as a version.

Save meaningful document states.

---

# 18. Versioning

Every persisted document should have:

```text
schemaVersion
documentVersion
updatedAt
```

Example:

```json
{
  "schemaVersion": 1,
  "documentVersion": 12
}
```

`schemaVersion` means:

> How is this JSON structured?

`documentVersion` means:

> Which revision of this particular document is this?

Those are different concepts.

---

# 19. Templates

Templates should essentially be reusable `EmailDocument` snapshots.

```text
Template
   ↓
EmailDocument
   ↓
Clone
   ↓
New Document
```

Do not let a user's document directly reference a mutable template.

When the user selects:

> “Welcome Email”

create a copy.

That means changes to the template don't unexpectedly alter existing drafts.

---

# 20. Brand system

A brand should provide reusable tokens:

```ts
type BrandKit = {
  colors: ColorTokens;
  typography: TypographyTokens;

  logoAssetId?: string;

  buttonDefaults: ButtonTokens;
};
```

An email can reference a brand:

```text
email
  ↓
brandId
```

But I recommend resolving the brand into the document at creation time or maintaining an explicit inheritance model.

For MVP, **snapshot the relevant brand values into the document**.

Why?

Because if a user changes their brand later, an existing draft shouldn't magically change.

---

# 21. Responsive behavior

This needs to be constrained by the email medium.

Don't expose:

```text
CSS media queries
flexbox
grid
absolute positioning
```

to users.

Instead expose semantic behavior:

```text
Desktop:
[ Image ][ Text ]

Mobile:
[ Image ]
[ Text ]
```

or:

```text
Stack columns on mobile: true
```

For example:

```ts
responsive: {
  mobile: {
    stackColumns: true;
    alignment: "center";
  }
}
```

The compiler translates this into email-compatible behavior.

MJML is designed specifically around responsive email generation and supports section/column abstractions that map well to this model. ([mjml.io][1])

---

# 22. Preview architecture

There should be two renderers.

### Editor renderer

Optimized for interaction:

```text
EmailDocument
 ↓
React Editor Renderer
 ↓
Interactive Canvas
```

### Email renderer

Optimized for accuracy:

```text
EmailDocument
 ↓
MJML Compiler
 ↓
HTML
 ↓
Iframe Preview
```

Don't use the same renderer for both.

The editor needs selection handles, drag zones, placeholders, etc.

The email renderer needs to approximate what the recipient will actually receive.

---

# 23. HTML compilation

The pipeline should be:

```text
EmailDocument
       ↓
Schema validation
       ↓
Normalization
       ↓
Document → MJML AST/string
       ↓
MJML compiler
       ↓
HTML
       ↓
HTML validation
       ↓
Sanitization where appropriate
       ↓
Plain-text generation
       ↓
CompiledEmail
```

I would keep the compiler deterministic.

Same document + same compiler version should produce the same output.

That is extremely valuable for debugging.

---

# 24. Compiler versioning

Every compiled email should know:

```text
documentSchemaVersion
compilerVersion
```

For example:

```json
{
  "schemaVersion": 1,
  "compilerVersion": "1.0.0"
}
```

This matters because your compiler will evolve.

If an old email was sent successfully six months ago, you don't want a future compiler change to make it impossible to understand what happened.

---

# 25. Custom HTML

For the MVP:

**Do not make arbitrary custom HTML a normal block.**

It undermines the entire architecture.

If you eventually support it, make it an explicitly isolated block:

```text
CustomHtmlBlock
```

with:

* strict sanitization
* restricted tags
* restricted attributes
* no scripts
* no event handlers
* no arbitrary external resources
* clear compatibility warnings

DOMPurify is an established option for sanitizing HTML against XSS, but it should be one layer in a broader validation/security model rather than your only protection. ([GitHub][4])

For MVP, I'd exclude custom HTML.

---

# 26. Security model

There are several attack surfaces.

### User-authored content

Validate:

```text
URLs
HTML
rich text
images
metadata
```

### Links

Don't blindly permit:

```text
javascript:
data:
```

or other dangerous schemes.

Allow:

```text
https:
http:
mailto:
tel:
```

where appropriate.

### Images

Validate asset ownership.

### HTML

Never trust generated HTML.

### AI

AI output must go through:

```text
AI output
 ↓
Schema validation
 ↓
Business validation
 ↓
Document normalization
 ↓
Persistence
```

Never:

```text
AI → HTML → send
```

---

# 27. AI integration

The editor should expose a document-operation API to the AI layer.

For example:

```ts
type DocumentOperation =
  | InsertBlockOperation
  | DeleteBlockOperation
  | MoveBlockOperation
  | UpdateBlockOperation
  | UpdateSectionOperation
  | ApplyStyleOperation;
```

This allows:

> “Make this email more premium.”

to become a series of controlled operations.

The AI doesn't get arbitrary database access.

The AI doesn't get HTML injection capability.

It manipulates a constrained document model.

This also creates a powerful future capability:

> “Undo AI changes.”

Because AI changes are just operations.

---

# 28. Component registry

I strongly recommend a registry:

```ts
const blockRegistry = {
  text: TextBlockDefinition,
  image: ImageBlockDefinition,
  button: ButtonBlockDefinition,
  divider: DividerBlockDefinition,
  spacer: SpacerBlockDefinition,
  social: SocialBlockDefinition,
};
```

Each definition provides:

```ts
type BlockDefinition = {
  type: string;

  defaultProps: unknown;

  validate: () => void;

  renderEditor: React.ComponentType;

  compile: () => MJML;

  getInspector: () => InspectorSchema;

  getPreview: React.ComponentType;
};
```

This is the heart of extensibility.

Adding a new block becomes:

```text
Register block
      ↓
Editor understands it
      ↓
Validator understands it
      ↓
Compiler understands it
```

rather than modifying the entire application.

---

# 29. Inspector architecture

The editor should have a contextual inspector.

Select:

```text
Button
```

and show:

```text
Button
─────────────
Text
Link
─────────────
Typography
Size
Weight
─────────────
Colors
Background
Text
─────────────
Shape
Radius
─────────────
Spacing
Padding
─────────────
Alignment
```

Select an image:

```text
Image
─────────────
Asset
Alt text
Link
─────────────
Width
Alignment
─────────────
Spacing
```

This is where the Canva-like experience comes from.

---

# 30. Editor state architecture

I'd separate state into three layers:

```text
Server State
   │
   ├── documents
   ├── templates
   └── assets

Editor State
   │
   ├── currentDocument
   ├── selectedNode
   ├── viewport
   ├── history
   └── UI state

Transient Interaction State
   │
   ├── dragging
   ├── hovering
   ├── resizing
   └── keyboard interaction
```

Don't put everything into one global store.

---

# 31. Suggested frontend structure

```text
src/
├── features/
│   └── email-editor/
│       ├── components/
│       │   ├── canvas/
│       │   ├── blocks/
│       │   ├── sections/
│       │   ├── inspector/
│       │   ├── toolbar/
│       │   └── panels/
│       │
│       ├── document/
│       │   ├── schema.ts
│       │   ├── types.ts
│       │   ├── validation.ts
│       │   ├── normalization.ts
│       │   └── operations/
│       │
│       ├── blocks/
│       │   ├── registry.ts
│       │   ├── text/
│       │   ├── image/
│       │   ├── button/
│       │   ├── divider/
│       │   ├── spacer/
│       │   └── social/
│       │
│       ├── history/
│       ├── clipboard/
│       ├── responsive/
│       └── state/
│
├── features/
│   └── email-renderer/
│
├── features/
│   └── templates/
│
├── features/
│   └── assets/
│
└── lib/
    └── email/
        ├── compiler/
        ├── validation/
        └── serialization/
```

Backend:

```text
src/
├── modules/
│   ├── email-documents/
│   ├── email-compiler/
│   ├── templates/
│   ├── assets/
│   └── brands/
│
└── shared/
    └── email/
```

The compiler should ideally be a shared, independently testable module.

---

# 32. Interfaces between subsystems

The most important contracts are:

```text
Editor
  ↓
EmailDocument
```

```text
AI
  ↓
DocumentOperation[]
```

```text
EmailDocument
  ↓
Compiler
```

```text
Compiler
  ↓
CompiledEmail
```

```text
CompiledEmail
  ↓
Provider Adapter
```

For example:

```ts
type CompiledEmail = {
  html: string;
  text: string;

  documentVersion: number;
  compilerVersion: string;
};
```

The sending subsystem doesn't care how the email was designed.

It receives a compiled message.

That's excellent separation.

---

# 33. Collaboration

Do **not** build collaboration in the MVP.

But don't make the architecture impossible to extend.

The document operation model gives you a future path:

```text
User A
   ↓
Operations
   ↓
Document

User B
   ↓
Operations
   ↓
Document
```

If collaboration becomes important later, you can introduce a more sophisticated synchronization model.

Do not introduce CRDTs, WebSockets, presence, conflict resolution, etc. now.

---

# 34. Performance

The editor should not rerender the entire email whenever one text character changes.

Use:

```text
Document
   ↓
Section subscription
   ↓
Column subscription
   ↓
Block subscription
```

Ideally:

```text
Edit TextBlock A
      ↓
TextBlock A rerenders
      ↓
Document state updates
      ↓
Other blocks remain stable
```

For large documents, consider memoization and selective subscriptions.

But don't prematurely virtualize the canvas. Email documents should generally remain relatively small.

---

# 35. Failure modes

Important failures:

### Invalid document

```text
Load
 ↓
Schema validation
 ↓
Invalid
 ↓
Migration / repair
```

Never blindly render invalid JSON.

### Compiler failure

```text
Document
 ↓
Compiler
 ↓
Error
```

Show:

> “We couldn't generate the email preview.”

Do not send uncompiled/invalid output.

### Asset unavailable

Display a broken-asset state.

Don't silently remove it.

### Autosave failure

Keep local editor state and clearly show:

> “Changes not saved.”

### Browser crash

Use local recovery/autosave where practical.

### AI generates invalid structure

Reject/repair the operation.

Never directly persist it.

---

# 36. Testing strategy

You need four testing layers.

### Document tests

Test:

```text
insert
delete
move
duplicate
update
undo
redo
serialization
migration
validation
```

### Compiler tests

Given:

```text
EmailDocument
```

expect:

```text
known MJML/HTML output
```

Use snapshot tests.

### Compatibility tests

Test representative emails against:

```text
Gmail
Outlook
Apple Mail
```

The actual rendering matrix should be maintained separately because email-client behavior changes.

### End-to-end

Test:

```text
Create
→ edit
→ save
→ reload
→ preview
→ send
```

---

# 37. Recommended technology choices

For the existing architecture, I'd use:

| Area              | Recommendation                        |
| ----------------- | ------------------------------------- |
| UI                | React + TypeScript                    |
| Rich text         | Lexical                               |
| Drag/drop         | dnd-kit                               |
| Canonical model   | Custom TypeScript schema              |
| Validation        | Zod or equivalent                     |
| Compiler          | MJML                                  |
| State             | Lightweight store + operation reducer |
| Persistence       | PostgreSQL JSONB                      |
| Assets            | S3/R2                                 |
| Sanitization      | DOMPurify where HTML input exists     |
| Testing           | Vitest + Playwright                   |
| Schema migrations | Versioned document migrations         |

MJML is the most important choice here. It already provides semantic components such as sections, columns, buttons, social blocks and responsive email compilation, which aligns unusually well with the document model we're designing. ([mjml.io][1])

For drag-and-drop, dnd-kit provides the primitives needed for draggable/droppable/sortable interactions and keyboard sensors without forcing the document model to depend on the library. ([dnd kit][3])

---

# A. FINAL EDITOR ARCHITECTURE

The resulting architecture is:

```text
                         USER
                           │
                           ▼
                  ┌─────────────────┐
                  │   Editor UI     │
                  │                 │
                  │ Canvas          │
                  │ Inspector       │
                  │ Toolbar         │
                  │ Block Library   │
                  └────────┬────────┘
                           │
                    Document Operations
                           │
                           ▼
                  ┌─────────────────┐
                  │ Document Engine │
                  │                 │
                  │ Validate        │
                  │ Normalize       │
                  │ Transform       │
                  │ History         │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ EmailDocument   │
                  │                 │
                  │ Sections        │
                  │ Columns         │
                  │ Blocks          │
                  │ Styles          │
                  │ Variables       │
                  └───────┬─────────┘
                          │
              ┌───────────┼───────────┐
              │                       │
              ▼                       ▼
       Editor Renderer           Email Compiler
              │                       │
              ▼                       ▼
       Interactive Canvas           MJML
                                      │
                                      ▼
                                Email HTML
                                      │
                                      ▼
                                Plain Text
                                      │
                                      ▼
                              CompiledEmail
                                      │
                                      ▼
                              Provider Adapter
```

This is the architecture I would lock in.

---

# B. CANONICAL EMAIL DOCUMENT SPECIFICATION

At a conceptual level:

```ts
type EmailDocument = {
  schemaVersion: number;

  id: string;

  metadata: {
    name: string;
    subject?: string;
    previewText?: string;
  };

  settings: {
    width: number;
    backgroundColor: Color;
    contentBackgroundColor: Color;
    defaultFontFamily: string;
  };

  styles: {
    typography: TypographyTokens;
    colors: ColorTokens;
    spacing: SpacingTokens;
    buttons: ButtonTokens;
  };

  content: {
    sections: EmailSection[];
  };

  variables: EmailVariable[];
};
```

Structure:

```text
EmailDocument
│
├── metadata
├── settings
├── styles
├── variables
│
└── content
    │
    └── sections[]
        │
        ├── style
        ├── responsive
        │
        └── columns[]
            │
            ├── width
            ├── style
            ├── responsive
            │
            └── blocks[]
                │
                ├── text
                ├── image
                ├── button
                ├── divider
                ├── spacer
                └── social
```

The **document is the product's canonical representation of an email.**

---

# C. HTML COMPILATION PIPELINE

```text
EmailDocument
      │
      ▼
Schema Validation
      │
      ▼
Normalization
      │
      ▼
Block Validation
      │
      ▼
Document → MJML
      │
      ▼
MJML Compiler
      │
      ▼
HTML
      │
      ├─────────────┐
      ▼             ▼
HTML Validation   Plain Text
      │             │
      └──────┬──────┘
             ▼
       CompiledEmail
             │
             ▼
      Immutable Send
          Snapshot
```

The compiler is authoritative for **what gets sent**.

The editor renderer is authoritative for **what the user manipulates**.

Those are intentionally different.

---

# D. COMPONENT CONTRACTS

Every block should satisfy the same conceptual contract:

```ts
interface BlockDefinition<TProps> {
  type: string;

  createDefault(): TProps;

  validate(props: unknown): TProps;

  renderEditor(props: TProps): ReactNode;

  renderPreview(props: TProps): ReactNode;

  compile(props: TProps): MjmlNode;

  getInspectorSchema(): InspectorSchema;
}
```

Therefore:

```text
TextBlock
ImageBlock
ButtonBlock
DividerBlock
SpacerBlock
SocialBlock
```

all behave consistently.

That becomes extremely powerful later because AI can generate **valid document operations against the same component contracts**.

---

# E. CHANGES REQUIRED TO MASTER ARCHITECTURE

I would make these explicit additions to Phase 1:

**1. Introduce a dedicated Document Engine.**

```text
EmailDocument
+
Operations
+
Validation
+
Normalization
+
Migration
+
History
```

**2. Make document operations a first-class abstraction.**

Both the UI and future AI should modify documents through operations.

**3. Explicitly separate three renderers.**

```text
Editor Renderer
Email Preview Renderer
Email Compiler
```

**4. Make the block registry an architectural primitive.**

This becomes the extension mechanism.

**5. Make compiler versioning explicit.**

Every compiled/send snapshot should record the compiler version.

**6. Exclude arbitrary Custom HTML from MVP.**

This protects the structured-document architecture.

**7. Make brand styles token-based.**

Don't allow the brand system to become a collection of arbitrary CSS.

**8. Make responsive behavior semantic.**

Users configure email behavior, not CSS.

**9. Keep collaboration out of MVP.**

The operation architecture preserves a future path without paying the complexity cost now.

---

# F. IMPLEMENTATION PLAN

I would implement the editor in this order:

```text
PHASE 2A
Document schema
       ↓
Validation
       ↓
Normalization
       ↓
Migrations
```

```text
PHASE 2B
Document operations
       ↓
Insert
Update
Move
Delete
Duplicate
       ↓
Undo/redo
```

```text
PHASE 2C
Editor canvas
       ↓
Sections
Columns
Blocks
Selection
Inspector
```

```text
PHASE 2D
Block library
       ↓
Text
Image
Button
Divider
Spacer
Social
```

```text
PHASE 2E
Drag/drop
       ↓
Reordering
       ↓
Cross-column movement
       ↓
Keyboard accessibility
```

```text
PHASE 2F
Persistence
       ↓
Autosave
       ↓
Versions
       ↓
Templates
```

```text
PHASE 2G
Compiler
       ↓
Document → MJML
       ↓
MJML → HTML
       ↓
Plain text
```

```text
PHASE 2H
Preview
       ↓
Desktop
       ↓
Mobile
       ↓
Compiled-email preview
```

```text
PHASE 2I
AI interface
       ↓
Document operations
       ↓
Validation
       ↓
Undo AI changes
```

Then:

```text
PHASE 2J
Testing + hardening
       ↓
Document tests
Compiler snapshots
Compatibility tests
E2E
Security
Performance
```

### The architectural north star

The single most important thing to preserve while building is this:

```text
                 ┌───────────────┐
                 │      AI       │
                 └───────┬───────┘
                         │
                         ▼
                  Document Ops
                         │
                         ▼
┌──────────────┐   ┌──────────────┐
│ Editor UI    │──▶│ EmailDocument│
└──────────────┘   └──────┬───────┘
                          │
                          ▼
                     Compiler
                          │
                          ▼
                       MJML
                          │
                          ▼
                   Email-safe HTML
                          │
                          ▼
                    Send Provider
```

**Never let this become:**

```text
Prompt → HTML → Send
```

or:

```text
Editor → HTML → Database
```

or:

```text
AI → arbitrary React state
```

The structured `EmailDocument` is the center of the entire product.
The structured `EmailDocument` is the center of the entire product.

That one decision gives you the foundation for the Canva-like editor, AI generation, templates, versioning, reliable email rendering, future collaboration, and multiple sending providers without rebuilding the product around raw HTML later.

[1]: https://mjml.io/components?utm_source=chatgpt.com "Components - MJML"
[2]: https://lexical.dev/?utm_source=chatgpt.com "Lexical"
[3]: https://dndkit.com/react/quickstart/?utm_source=chatgpt.com "React Quickstart - dnd kit"
[4]: https://github.com/cure53/DOMPurify/blob/main/website/index.html?utm_source=chatgpt.com "DOMPurify/website/index.html at main · cure53/DOMPurify · GitHub"
