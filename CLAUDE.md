# CLAUDE.md — Garden (Project Hunt)

This file provides guidance for AI assistants working in this codebase.

## Project Overview

**Garden** is an internal Product Hunt-style platform. Teams share project progress, upvote each other's work, comment, and celebrate momentum. Think "internal launch showcase" — projects have readiness statuses, focus areas, media, and social engagement.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 |
| Backend / DB / Realtime | Convex |
| Auth | AWS Cognito + AWS Amplify (client) |
| UI Components | shadcn/ui (Radix UI primitives) + Lucide icons |
| AI | Vercel AI SDK (`@ai-sdk/openai`), Convex RAG, Convex Agent |
| Analytics | PostHog |
| Animations | Framer Motion (`motion`) |
| Drag & Drop | dnd-kit |

---

## Directory Structure

```
/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Authenticated app shell
│   │   ├── layout.tsx            # Auth guard + sidebar wrapper
│   │   ├── page.tsx              # Home / project feed
│   │   ├── OnboardingGuard.tsx   # Redirects to onboarding if incomplete
│   │   ├── project/[id]/         # Project detail page
│   │   ├── space/[id]/           # Space (focus area) page
│   │   ├── submit/               # Submit a project
│   │   ├── profile/              # User profile
│   │   ├── about/
│   │   └── create-team/
│   ├── sign-in/                  # Auth pages
│   ├── sign-up/
│   ├── callback/                 # Cognito OAuth callback
│   ├── onboarding/               # First-run onboarding flow
│   ├── layout.tsx                # Root layout (ConvexClientProvider, PostHog)
│   ├── globals.css               # Global Tailwind styles + CSS variables
│   └── useCurrentUser.ts         # Hook for current user
│
├── components/
│   ├── ui/                       # shadcn/ui base components (do not modify directly)
│   ├── app-sidebar.tsx           # Main navigation sidebar
│   ├── header.tsx                # Page header
│   ├── ProjectRow.tsx            # Project card in feed
│   ├── CommentForm.tsx           # Comment input
│   ├── CommentThread.tsx         # Nested comment display
│   ├── Facepile.tsx              # User avatar group
│   ├── FileUploadField.tsx       # File attachment uploader
│   ├── MediaUploadField.tsx      # Image/video uploader
│   ├── ReadinessBadge.tsx        # Readiness status chip
│   ├── RichTextEditor.tsx        # Rich text (react-quill-new)
│   ├── RichTextContent.tsx       # Render rich text HTML safely
│   ├── SimilarProjectsPreview.tsx# AI-powered similar projects
│   ├── ChatInterface.tsx         # AI chat UI
│   ├── LandingPage.tsx           # Shown to unauthenticated visitors
│   └── auth/                     # Auth-specific components
│
├── convex/                       # Convex backend
│   ├── schema.ts                 # Database schema (source of truth)
│   ├── projects.ts               # Re-export facade for projects/*
│   ├── projects/
│   │   ├── lifecycle.ts          # create, update, delete, confirm
│   │   ├── listing.ts            # list, paginate, search by various axes
│   │   ├── engagement.ts         # upvotes, adoptions, views, hot scores
│   │   ├── media.ts              # file/media upload, delete, reorder
│   │   ├── search.ts             # full-text + semantic/RAG search
│   │   ├── helpers.ts            # enrichProjects, calculateHotScore
│   │   └── migrations.ts         # One-off data migrations
│   ├── users.ts                  # User CRUD, onboarding, profiles
│   ├── teams.ts                  # Team management
│   ├── comments.ts               # Comment CRUD + upvotes
│   ├── focusAreas.ts             # Focus area (space) management
│   ├── notifications.ts          # In-app notification system
│   ├── rag.ts                    # RAG / semantic search config
│   ├── ragbot.ts                 # AI agent / chatbot
│   ├── tools.ts                  # AI tool definitions
│   ├── auth.ts / auth.config.ts  # Convex auth integration
│   ├── http.ts                   # HTTP router (currently empty)
│   ├── crons.ts                  # Scheduled jobs
│   ├── functions.ts              # Misc shared functions
│   └── _generated/               # Auto-generated — never edit manually
│
├── lib/
│   ├── types.ts                  # Shared TypeScript types (ProjectRowData, etc.)
│   ├── utils.ts                  # cn() and other small utilities
│   ├── amplify-config.ts         # AWS Amplify/Cognito config
│   └── fileSize.ts               # File size formatting helper
│
├── hooks/                        # Custom React hooks
├── public/                       # Static assets
├── next.config.ts                # Next.js config (image domains, PostHog rewrites)
├── tsconfig.json                 # TypeScript config
└── components.json               # shadcn/ui config
```

---

## Development Workflow

### Prerequisites
- Node.js 20+
- A running Convex deployment (dev or prod)

### Start Development

Two servers must run simultaneously:

```bash
# Terminal 1 — Next.js frontend
npm run dev

# Terminal 2 — Convex backend (syncs schema + functions, regenerates types)
npx convex dev
```

The app runs at `http://localhost:3000`.

### Other Scripts

```bash
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint

npx convex codegen   # Regenerate convex/_generated types without watching
npx convex deploy    # Deploy Convex to production
npx convex run <fn>  # Run a function from CLI, e.g. npx convex run users:current
```

### After Schema Changes

Whenever `convex/schema.ts` is modified:
1. `npx convex dev` will automatically regenerate `convex/_generated/`
2. TypeScript types for `Doc<"tableName">` and `Id<"tableName">` update automatically
3. Never manually edit anything inside `convex/_generated/`

---

## Database Schema (convex/schema.ts)

Key tables and their purpose:

| Table | Purpose |
|---|---|
| `projects` | Core entity — name, summary, readiness, upvotes, links, focusArea |
| `mediaFiles` | Images/videos attached to projects (ordered) |
| `projectFiles` | Downloadable file attachments per project |
| `upvotes` | User upvotes on projects |
| `adoptions` | Users who have "adopted" (bookmarked) a project |
| `projectViews` | View tracking per project+viewer |
| `comments` | Nested comments (parentCommentId for threads) |
| `commentUpvotes` | Upvotes on individual comments |
| `notifications` | In-app notifications (comment, upvote, adoption, project_update) |
| `users` | User profiles, linked to Cognito via `externalUserId` |
| `userFocusAreas` | Many-to-many: users ↔ focus areas |
| `teams` | Team groupings |
| `focusAreas` | Spaces / topic categories (name, group, icon) |

### Readiness Status Values
```
"just_an_idea" | "early_prototype" | "mostly_working" | "ready_to_use"
```
(`"in_progress"` is a legacy value kept for migration compatibility.)

### Hot Score
Projects have `hotScore` and `engagementScore` fields updated by `crons.ts` and the `refreshHotScores` function. Use indexed queries on `by_status_hotScore` for feed ordering.

---

## Authentication Flow

1. User signs in via **AWS Cognito Hosted UI** (OAuth)
2. Redirect returns to `/callback` — Amplify exchanges the code for tokens
3. Amplify stores Cognito session in browser
4. `ConvexClientProvider` wraps the app with a Convex-Cognito JWT bridge
5. On first login, the client calls `users:ensureUser` mutation to create or link the Convex user record using `identity.subject` (Cognito sub) as `externalUserId`
6. `OnboardingGuard` checks `user.onboardingCompleted` and redirects to `/onboarding` if false

### Getting the Current User in Convex

```typescript
// In any query or mutation:
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

const user = await getCurrentUser(ctx);       // returns null if unauthenticated
const user = await getCurrentUserOrThrow(ctx); // throws if unauthenticated
```

---

## Convex Patterns

### Query (read-only, reactive)
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

### Mutation (write, transactional)
```typescript
import { mutation } from "./_generated/server";

export const createProject = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("projects", { name: args.name, userId: user._id, ... });
  },
});
```

### Action (for external APIs, AI, non-transactional side effects)
```typescript
import { action } from "./_generated/server";

export const callOpenAI = action({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    // Can call external APIs; cannot directly read/write ctx.db
    // Use ctx.runQuery / ctx.runMutation to touch the DB
  },
});
```

### Argument Validators

Always use `v` validators from `"convex/values"`:
```typescript
v.string(), v.number(), v.boolean(), v.id("tableName"),
v.optional(v.string()), v.array(v.string()),
v.union(v.literal("a"), v.literal("b")),
v.object({ url: v.string(), label: v.optional(v.string()) })
```

### Indexed Queries (always prefer over full scans)
```typescript
// Good — uses index
await ctx.db
  .query("projects")
  .withIndex("by_status", (q) => q.eq("status", "active"))
  .order("desc")
  .collect();

// Also: .first(), .unique(), .paginate(opts)
```

### Pagination
```typescript
import { paginationOptsValidator } from "convex/server";

export const listPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_status_hotScore", (q) => q.eq("status", "active"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

### Projects Facade Pattern

`convex/projects.ts` is a re-export facade — it keeps `api.projects.*` stable while the actual implementation lives in `convex/projects/*.ts`. When adding a new function, put the implementation in the appropriate sub-file and add the export to `convex/projects.ts`.

---

## React / Next.js Patterns

### Client vs Server Components

- Default to **Server Components** (no directive needed)
- Add `"use client"` only when using hooks, browser APIs, or Convex React hooks
- The `(app)` layout is `"use client"` because it uses Convex's `<Authenticated>` / `<Unauthenticated>`

### Convex React Hooks
```typescript
"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// Reactive query — re-renders on data change
const projects = useQuery(api.projects.list);

// Mutation
const toggle = useMutation(api.projects.toggleUpvote);
await toggle({ projectId });

// Action
const search = useAction(api.projects.searchProjects);
```

### State Management Rules
- **Convex data** → `useQuery` / `useMutation` / `useAction`
- **Component-local state** → `useState` / `useEffect`
- **External (non-Convex) APIs** → TanStack Query (`useQuery` from `@tanstack/react-query`)

### Path Alias
Always use `@/` for imports from the project root:
```typescript
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import type { ProjectRowData } from "@/lib/types";
```

---

## TypeScript Conventions

- **Strict mode** is enabled — no implicit `any`
- Use `type` for object shapes, `interface` for contracts
- Avoid `any`; use `unknown` + type narrowing if needed
- Shared types live in `lib/types.ts` — add new cross-cutting types there
- Convex-generated types: `Doc<"tableName">`, `Id<"tableName">` from `@/convex/_generated/dataModel`

---

## Styling Conventions

- **Tailwind CSS 4** utility classes only — no CSS modules, no inline styles
- Color palette: **zinc-based** (`zinc-50` … `zinc-950`) with CSS variables for theming
- Use the `cn()` helper from `@/lib/utils` to conditionally combine class names:
  ```typescript
  import { cn } from "@/lib/utils";
  className={cn("base-class", condition && "conditional-class", props.className)}
  ```
- shadcn/ui components live in `components/ui/` — prefer extending over modifying
- Component files: **PascalCase** (`ProjectRow.tsx`)
- Utility/hook files: **camelCase** (`useCurrentUser.ts`)

---

## Rich Text

- **Editing**: use `<RichTextEditor>` (wraps `react-quill-new`)
- **Rendering**: use `<RichTextContent>` which sanitizes HTML via DOMPurify before rendering

---

## File & Media Uploads

All uploads go through Convex Storage:
1. Call `generateUploadUrl` mutation to get a signed upload URL
2. `PUT` the file directly to that URL
3. Call `addMediaToProject` or `addFileToProject` with the returned `storageId`
4. Retrieve URLs with `getMediaUrl` (handles cross-origin URLs via Convex file serving)

---

## AI Features

- **Semantic search**: `searchProjects` action uses Convex RAG (`@convex-dev/rag`)
- **Similar projects**: `getSimilarProjects` / `searchSimilarProjectsByText`
- **Chatbot**: `convex/ragbot.ts` + `convex/tools.ts` power the chat UI (`ChatInterface.tsx`)
- **Embeddings**: Triggered on project create/update; stored in Convex vector index

---

## Environment Variables

### Next.js (`app/` — prefix `NEXT_PUBLIC_` for client access)
```
NEXT_PUBLIC_CONVEX_URL                  # Convex deployment URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID        # Cognito pool
NEXT_PUBLIC_COGNITO_CLIENT_ID           # Cognito app client
NEXT_PUBLIC_COGNITO_DOMAIN              # Cognito hosted UI domain
NEXT_PUBLIC_COGNITO_REDIRECT_URI        # OAuth callback URL
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```

### Convex (server-side only, set via `npx convex env set`)
```
COGNITO_REGION
COGNITO_USER_POOL_ID
OPENAI_API_KEY                          # For AI features
```

---

## Key Gotchas & Conventions

1. **Never edit `convex/_generated/`** — it is regenerated automatically by `npx convex dev`.

2. **Projects facade** — add new Convex project functions to `convex/projects/<file>.ts` and re-export from `convex/projects.ts`. Do not add directly to `projects.ts`.

3. **`allFields` search field** — the `projects` table has an `allFields` text field used as a composite full-text search index. Keep it updated when creating/updating projects (`backfillProject` shows the pattern).

4. **Hot score vs engagement score** — `hotScore` decays over time (time-weighted), `engagementScore` is cumulative. Feed sorting uses `hotScore`; leaderboard sorting uses `engagementScore`.

5. **Soft-delete comments** — comments are never hard-deleted; set `isDeleted: true`. Always filter `q.neq(q.field("isDeleted"), true)` when listing.

6. **Auth identity** — `identity.subject` is the Cognito `sub` (UUID), stored as `user.externalUserId`. Use this for all identity linking.

7. **Image handling** — always use `next/image` for images. Remote patterns for `*.convex.cloud` and `*.convex.site` are already configured in `next.config.ts`.

8. **Readiness `in_progress`** — this legacy value is kept in the schema for migration compatibility only. New code should use `"mostly_working"` or another current value.

9. **Convex `internalMutation` / `internalQuery`** — use these for admin/migration operations that should not be callable from the client. Run one-off migrations via `npx convex run`.

10. **PostHog proxying** — requests to `/ingest/*` are rewritten to PostHog in `next.config.ts`. Do not change this proxy config without understanding the analytics impact.

---

## Deployment

- **Frontend**: Vercel (auto-deploy from `main` branch)
- **Backend**: Convex cloud (`npx convex deploy`)
- Environment variables are set in the Vercel dashboard and via `npx convex env set`
