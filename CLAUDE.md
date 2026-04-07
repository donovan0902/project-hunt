# CLAUDE.md — Garden (project-hunt)

## What This Is

**Garden** is an internal tool-sharing platform for the workplace. Employees can share scripts, dashboards, and automations they've built, upvote and comment on others' work, and adopt tools they find useful. There is also an AI-powered chat assistant for discovering tools via natural language.

The app title in `app/layout.tsx` is "Garden"; the repo is named `project-hunt`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI, Lucide React |
| Backend/DB | Convex (real-time backend-as-a-service) |
| Auth | AWS Cognito via AWS Amplify, bridged to Convex via OIDC |
| AI / RAG | `@convex-dev/agent`, `@convex-dev/rag`, Amazon Bedrock (Claude Haiku + Amazon Titan Embed v2) |
| Analytics | PostHog (proxied via Next.js rewrites; initialized in `instrumentation-client.ts`) |
| Animation | Motion (Framer Motion v12) |
| Rich Text | `react-quill-new` (editor), `quill-resize-image` (image resizing), `dompurify` (sanitizer), `react-markdown` (renderer) |
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable` (media reordering) |
| Carousel | `embla-carousel-react` (media carousel) |
| Email | AWS SES v2 (`@aws-sdk/client-sesv2`) for transactional email delivery |
| Toasts | Sonner (replaces `alert()` and silent failures throughout) |
| Workpool | `@convex-dev/workpool` — concurrency-limited background task execution |
| Mentions | `QuillMentionModule.ts` (custom Quill blot) + `convex/mentions.ts` + `hooks/use-mention-search.ts` |
| Webhooks | `svix` — webhook delivery management |

---

## Project Structure

```
project-hunt/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout — sets up fonts, ConvexClientProvider, Header, Sonner Toaster
│   ├── globals.css             # Global styles (Tailwind entry)
│   ├── (app)/                  # Route group: authenticated/main app
│   │   ├── layout.tsx          # Protected layout — OnboardingGuard, Sidebar, auth gating
│   │   ├── OnboardingGuard.tsx # Redirects to /onboarding if not completed
│   │   ├── page.tsx            # Home feed (paginated project list)
│   │   ├── about/page.tsx
│   │   ├── create-team/page.tsx
│   │   ├── create-thread/page.tsx  # Standalone thread creation page
│   │   ├── guidelines/page.tsx         # Platform guidelines page
│   │   ├── profile/[id]/page.tsx   # User profile — tabs for Built/Uses; shows department
│   │   ├── project/[id]/page.tsx       # Project detail
│   │   ├── project/[id]/edit/page.tsx  # Project edit form
│   │   ├── project/[id]/versions/      # Project version history
│   │   │   ├── page.tsx                # Versions list
│   │   │   ├── new/page.tsx            # Create new version
│   │   │   └── [versionId]/edit/page.tsx  # Edit existing version
│   │   ├── space/[id]/page.tsx         # Focus area/space feed (tabs: Projects + Threads)
│   │   ├── thread/[id]/page.tsx        # Thread detail + comments
│   │   └── submit/                     # Multi-step project submission
│   │       ├── page.tsx
│   │       └── confirm/page.tsx
│   ├── callback/page.tsx       # OAuth callback
│   ├── onboarding/page.tsx     # New user onboarding (collects userIntent)
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   └── useCurrentUser.ts       # Hook: returns { isAuthenticated, user }
│
├── components/
│   ├── ui/                     # shadcn/ui base components (do not modify manually)
│   │   └── sonner.tsx          # Custom Sonner toaster wrapper with Lucide icons
│   ├── chat/                   # AI chat components
│   │   ├── ProjectCardsDisplay.tsx  # Project card grid for search results
│   │   ├── SearchingIndicator.tsx   # Loading indicator for search
│   │   └── ThreadCardsDisplay.tsx   # Thread card display for search results
│   ├── AdditionalSpacesPicker.tsx # Multi-select combobox for secondary spaces
│   ├── ConvexClientProvider.tsx # Convex + Cognito auth bridge
│   ├── EmailPreferencesSection.tsx # Email notification preferences UI
│   ├── app-sidebar.tsx         # Main navigation sidebar
│   ├── header.tsx              # Top navigation bar (includes SearchBar)
│   ├── LandingPage.tsx         # Public landing page component
│   ├── ProjectRow.tsx          # Project list item card (ArrowBigUp upvote icon)
│   ├── ProjectMediaCarousel.tsx # Media carousel with expandable/zoomed media support
│   ├── ProjectFileDownload.tsx # File download section on project detail
│   ├── SearchBar.tsx           # Header search bar (hybrid full-text + semantic search)
│   ├── SimilarProjectsPreview.tsx # Similar projects shown on /submit
│   ├── Facepile.tsx            # Adopter avatar group
│   ├── ReadinessBadge.tsx      # Readiness status badge
│   ├── SpaceIcon.tsx           # Renders a space's emoji icon or initial fallback
│   ├── SpacePicker.tsx         # Combobox for selecting a primary focus area (space)
│   ├── CreateThreadForm.tsx    # Inline form for creating a thread in a space
│   ├── ThreadRow.tsx           # Thread list item card
│   ├── VersionsList.tsx        # Project version history display
│   ├── CommentThread.tsx / CommentForm.tsx  # Shared comment UI for both projects and threads (rich text + mentions)
│   ├── ChatInterface.tsx / MessageList.tsx  # AI chat UI
│   ├── LinksEditor.tsx         # Links editing UI for project forms
│   ├── RichTextEditor.tsx / RichTextContent.tsx
│   ├── QuillMentionModule.ts   # Custom Quill Embed blot for @-mentions
│   ├── MediaUploadField.tsx / FileUploadField.tsx
│   ├── ViewsIcon.tsx               # Custom composite SVG icon (eye inside rounded rect) for view counts
│   └── ...
│
├── convex/                     # Convex backend (functions + schema)
│   ├── schema.ts               # Database schema (source of truth)
│   ├── convex.config.ts        # Convex component registration (rag, agent, migrations)
│   ├── auth.config.ts          # OIDC provider config (Cognito)
│   ├── auth.ts                 # Convex auth helpers
│   ├── functions.ts            # Shared internal mutation helper
│   ├── http.ts                 # HTTP router (currently empty)
│   ├── crons.ts                # Scheduled jobs (hot scores, weekly digests, email queue drainer, affinity refresh)
│   ├── projects.ts             # Proxy re-exporter for convex/projects/*
│   ├── projects/               # Project domain — split by responsibility
│   │   ├── lifecycle.ts        # create, update, delete, confirm, backfill
│   │   ├── listing.ts          # list, getById, paginated queries, getTopProjectsBySpace
│   │   ├── engagement.ts       # upvotes, adoptions, views, hot score refresh
│   │   ├── search.ts           # full-text and semantic search
│   │   ├── media.ts            # file/media upload/delete/reorder
│   │   ├── versions.ts         # version CRUD + file management
│   │   ├── spaces.ts           # projectSpaces sync + hotScore propagation
│   │   ├── migrations.ts       # data migrations
│   │   ├── personalizedFeed.ts # listPersonalizedFeed query (uses userFeedEntries, falls back to hotScore)
│   │   └── helpers.ts          # calculateHotScore, enrichProjects
│   ├── emails.ts               # Email sending (SES v2), queue drainer, user preferences
│   ├── emailRenderer.ts        # HTML + plain-text email templates (weekly digest, notifications)
│   ├── digests.ts              # Weekly digest orchestrator, per-user data gathering, enqueuing
│   ├── notificationEngine.ts   # Centralized notification engine — all in-app + email side effects flow through here
│   ├── userAffinities.ts       # User affinity scoring + personalized feed precomputation
│   ├── threads.ts              # Threads feature: CRUD, upvotes, comments, hot score
│   ├── ragbot.ts               # AI agent (ProjectFinder) + thread management
│   ├── rag.ts                  # RAG component init
│   ├── tools.ts                # Agent tools: searchCatalog, showProjects, showThreads
│   ├── users.ts                # User management (ensureUser, getCurrentUser, getEmailRecipient, department sync)
│   ├── teams.ts
│   ├── comments.ts             # Project comments
│   ├── mentions.ts             # Mention detection in rich text + in-app notification dispatch
│   ├── notifications.ts
│   ├── focusAreas.ts           # Focus area CRUD + follow/unfollow, member count
│   ├── admin.ts
│   ├── seed.ts
│   ├── playground.ts
│   └── _generated/             # Auto-generated by Convex CLI — never edit manually
│
├── lib/
│   ├── types.ts                # Centralized shared TypeScript types
│   ├── utils.ts                # Utility functions (cn, etc.)
│   ├── amplify-config.ts       # AWS Amplify configuration (Cognito)
│   ├── fileSize.ts
│   └── upload.ts               # File upload helpers (generate upload URLs, etc.)
│
├── hooks/
│   ├── use-mobile.ts
│   ├── use-mention-search.ts       # Autocomplete search for @-mention suggestions
│   └── use-thread-image-upload.ts  # Manages inline image uploads for thread rich-text editors
│
├── .github/
│   └── workflows/
│       └── verifyNextBuild.yml # CI: verifies Next.js builds on every push
├── AGENTS.md                   # Agent/automation-specific documentation
├── instrumentation-client.ts   # PostHog client initialization (Next.js instrumentation)
├── public/                     # Static assets
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── components.json             # shadcn/ui config
└── package.json
```

---

## Development Commands

```bash
# Frontend (Next.js)
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # Run ESLint
npm run lint:fix   # Run ESLint with auto-fix

# Backend (Convex) — run in parallel with Next.js
npx convex dev     # Start Convex dev server (watches convex/ directory)
npx convex deploy  # Deploy Convex backend to production
```

Both `npm run dev` and `npx convex dev` must be running simultaneously during local development.

---

## Environment Variables

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_CONVEX_URL=          # Convex deployment URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_COGNITO_DOMAIN=
NEXT_PUBLIC_COGNITO_REDIRECT_URI=
NEXT_PUBLIC_COGNITO_SIGN_OUT_URI= # Optional; falls back to origin of REDIRECT_URI
NEXT_PUBLIC_POSTHOG_KEY=         # PostHog project API key
NEXT_PUBLIC_CONVEX_SITE=         # Convex site URL (used for storage URL generation)
```

**Convex backend** (set via Convex dashboard or `convex env set`):
```
COGNITO_REGION=
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
AWS_REGION=                     # AWS region (shared by Bedrock, SES, etc.)
AWS_ACCESS_KEY_ID=              # IAM access key (shared by Bedrock, SES, etc.)
AWS_SECRET_ACCESS_KEY=          # IAM secret key (shared by Bedrock, SES, etc.)
SES_FROM_EMAIL=                 # Verified SES sender address (e.g., garden@company.com)
```

---

## Database Schema (convex/schema.ts)

Key tables and their purpose:

| Table | Purpose |
|---|---|
| `projects` | Core project records; `status: "pending" \| "active"` |
| `mediaFiles` | Images/videos attached to projects (ordered) |
| `projectFiles` | Downloadable files attached to projects |
| `projectVersions` | Version snapshots: tag, title, body, links; ordered by `by_project_createdAt` |
| `versionFiles` | Files attached to a specific version |
| `projectSpaces` | Denormalized project ↔ space memberships with `isPrimary` flag and cached `hotScore` |
| `upvotes` | Per-user upvotes on projects |
| `adoptions` | Per-user "I'm using this" signals |
| `projectViews` | Unique view tracking per viewer ID |
| `comments` | Threaded comments on projects (soft delete; retained if replies exist); `editedAt` timestamp set on edit |
| `commentUpvotes` | Per-user upvotes on project comments |
| `linkClickCounts` | Tracks click counts per link or file on a project; `resourceType: "link" \| "file"` |
| `emailQueue` | Outbound email queue (pending → sent/failed); drained by cron |
| `notifications` | Aggregated activity notifications |
| `users` | User profiles; `onboardingCompleted` gates access; `department` from Cognito |
| `userFocusAreas` | User ↔ focus area interest associations (follow/join) |
| `teams` | Team/group records |
| `focusAreas` | Taxonomy spaces (like subreddits); shown in sidebar |
| `threads` | Discussion threads within a space; has hot score like projects; `imageStorageIds` tracks embedded images |
| `threadUpvotes` | Per-user upvotes on threads |
| `threadComments` | Threaded comments on threads (soft delete); `editedAt` timestamp set on edit |
| `threadCommentUpvotes` | Per-user upvotes on thread comments |
| `userAffinities` | Per-user affinity profile: followed spaces, engaged creators/projects, department, recency timestamps. Indexed by `by_userId`. |
| `userFeedEntries` | Precomputed personalized feed entries per user: `projectId` + `personalizedScore`. Indexes: `by_userId_personalizedScore`, `by_userId_projectId`. |

All tables have relevant indexes — always use `.withIndex()` for queries, never `.filter()` alone on large collections.

---

## Authentication Flow

1. User signs in via AWS Cognito (OAuth/OIDC)
2. AWS Amplify obtains the Cognito ID token
3. `ConvexClientProvider` (`components/ConvexClientProvider.tsx`) bridges the token to Convex via `ConvexProviderWithAuth`
4. `EnsureUser` component calls `api.users.ensureUser` once per session to create/sync the user record
5. `OnboardingGuard` checks `user.onboardingCompleted`; redirects to `/onboarding` if false
6. `useCurrentUser` hook (`app/useCurrentUser.ts`) provides `{ isAuthenticated, user }` throughout the app

**Never bypass `OnboardingGuard`** — all authenticated app pages live under `app/(app)/`.

### Cognito Attribute Sync

`ensureUser` extracts attributes from the Cognito identity token using an internal helper:

```ts
function extractCognitoAttributes(identity: Record<string, unknown>) {
  const department = identity["custom:department"] as string | undefined;
  const avatarUrlId = identity["picture"] as string | undefined;
  return {
    ...(department !== undefined ? { department } : {}),
    ...(avatarUrlId !== undefined ? { avatarUrlId } : {}),
  };
}
```

The `department` field comes from the `custom:department` Cognito attribute and is stored on the `users` table. It is displayed on the user profile page.

---

## Convex Backend Conventions

### Function types
- `query` — read-only, reactive (use for data fetching)
- `mutation` — read-write database operations
- `action` — can call external APIs and run queries/mutations; used for RAG, AI, and multi-step operations
- `internalQuery` / `internalMutation` — server-only, not callable from the client

### Projects module pattern
The `convex/projects/` directory organizes functions by responsibility. `convex/projects.ts` is a proxy that re-exports everything — this keeps `api.projects.*` and `internal.projects.*` stable.

When adding new project-related functions, place them in the appropriate file under `convex/projects/` and re-export from `convex/projects.ts`.

### Auth in Convex functions
```ts
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

// In a query — returns null if unauthenticated
const user = await getCurrentUser(ctx);

// In a mutation — throws if unauthenticated
const user = await getCurrentUserOrThrow(ctx);
```

### Internal mutations from functions.ts
```ts
import { internalMutation as internalMutationFromFunctions } from "../functions";
```
Use this import (not the direct `_generated` one) for internal mutations within the projects domain.

---

## Frontend Conventions

### Client vs Server Components
- All interactive components use `'use client'` at the top
- Pages under `app/(app)/` are client components (the layout is `'use client'`)
- Static/metadata-only pages can be server components

### Path Alias
`@/*` maps to the project root. Always use `@/` for imports:
```ts
import { api } from "@/convex/_generated/api";
import { ProjectRow } from "@/components/ProjectRow";
import type { ProjectRowData } from "@/lib/types";
```

### Convex data access in React
```ts
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const projects = useQuery(api.projects.listPaginated, { ... });
const toggleUpvote = useMutation(api.projects.toggleUpvote);
const { results, status, loadMore } = usePaginatedQuery(api.projects.listPaginated, {}, { initialNumItems: 15 });
```

### Shared Types
All shared TypeScript types live in `lib/types.ts`. Key types:
- `ProjectRowData` — enriched project for list/card display
- `ThreadRowData` — enriched thread for list/card display
- `ReadinessStatus` — union of project maturity levels
- `UserRef` — `{ _id, name, avatarUrl }`
- `FocusArea` — `{ _id, name, group, icon }`
- `OptimisticMessage` — for AI chat optimistic UI
- `LinkItem`, `ExistingFileItem`, `NewProjectFileItem`, `ExistingMediaItem`, `NewFileItem`

Add new shared types here rather than defining them inline or in component files.

### UI Components
- `components/ui/` contains shadcn/ui components — add new ones with `npx shadcn add <component>`
- Do not edit `components/ui/` files directly unless patching a bug
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes

### Toast Notifications (Sonner)
Use Sonner for all user-facing feedback. Never use `alert()` or silently swallow errors.

```ts
import { toast } from "sonner";

toast.success("Project saved!");
toast.error("Something went wrong.");
toast.loading("Saving…");
```

The `<Toaster />` is mounted in `app/layout.tsx`. The custom wrapper at `components/ui/sonner.tsx` adds Lucide icons and theme awareness.

---

## Project Ranking / Hot Score

Projects and threads are ranked using a Hacker News-style hot score:

```
hotScore = (engagementScore + 1) / (ageHours + 2)^1.0
```

**Projects**:
- `engagementScore` = upvote count + comment count
- Updated on every upvote/comment
- Also refreshed hourly via cron job (`convex/crons.ts` → `internal.projects.refreshHotScores`)
- Pinned projects always appear first regardless of score
- Feed index: `by_status_hotScore`; space feed uses `projectSpaces.by_focusArea_hotScore` (denormalized)

**Threads**:
- Same formula; `engagementScore` = upvote count + comment count
- Updated inline on every upvote/comment in `convex/threads.ts`
- Feed index: `by_focusArea_hotScore`; global trending index: `by_hotScore`

`calculateHotScore` lives in `convex/projects/helpers.ts` and is shared by both projects and threads.

---

## Threads Feature

Threads are lightweight Reddit-style discussions tied to a Focus Area (Space). Each thread belongs to exactly one space and participates in hot-score ranking separately from projects.

### Backend (`convex/threads.ts`)

Key exported mutations:
- `createThread({ title, body?, focusAreaId })` — requires auth
- `updateThread({ threadId, title, body? })` — owner only
- `deleteThread({ threadId })` — owner only; cascades to comments + upvotes
- `toggleUpvote({ threadId })` — toggles upvote, updates hot score
- `addComment({ threadId, content, parentCommentId? })` — requires auth
- `deleteComment({ commentId })` — soft delete (sets `isDeleted: true`)
- `toggleCommentUpvote({ commentId })` — toggles comment upvote

Key exported queries:
- `getById({ threadId })` — returns thread enriched with creator info, focusArea, hasUpvoted
- `listPaginatedBySpace({ focusAreaId, paginationOpts })` — paginated, sorted by hot score
- `getTopThreadsBySpace({ focusAreaId, limit? })` — top N by hot score (used in sidebar)
- `getTrendingThreads({ limit? })` — top N across all spaces
- `getComments({ threadId })` — all non-deleted comments enriched with user info + hasUpvoted

### Routes
- `app/(app)/space/[id]/page.tsx` — Space page with "Projects" and "Threads" tabs
- `app/(app)/thread/[id]/page.tsx` — Thread detail with inline edit/delete and comments
- `app/(app)/create-thread/page.tsx` — Standalone thread creation (uses `SpacePicker`)

### Components
- `ThreadRow` — compact thread card (title, upvote count, comment count, creator, timestamp)
- `CreateThreadForm` — inline form for creating a thread within a space page
- `CommentForm` — shared comment input used for both projects and threads
- `CommentThread` — shared recursive threaded comment display used for both projects and threads

---

## Focus Areas (Spaces)

Focus areas are taxonomy tags rendered as "Spaces" in the sidebar (styled like `g/name`). Each project can belong to **one primary focus area** plus optional secondary spaces (multi-space support via `projectSpaces` table). Each thread *must* belong to exactly one space. Users can follow/join spaces.

Key backend functions in `convex/focusAreas.ts`:
- `listActive` — all active spaces
- `getById({ id })` — single space by ID
- `toggleFollowSpace({ focusAreaId })` — follow/unfollow (requires auth)
- `isFollowingSpace({ focusAreaId })` — boolean, current user
- `getMemberCount({ focusAreaId })` — count of followers

The space page (`app/(app)/space/[id]/page.tsx`) shows member count, a Join button, and two tabs (Projects, Threads). A context-aware sidebar cross-promotes the other content type.

New spaces are created via `CreateFocusAreaDialog`.

---

## AI / RAG System

The AI chat assistant lives in `convex/ragbot.ts`:

- **Agent**: `projectAgent` using `@convex-dev/agent`
- **LLM**: Amazon Bedrock (`us.anthropic.claude-haiku-4-5-20251001-v1:0`)
- **Embeddings**: Amazon Bedrock (Amazon Titan Embed v2)
- **Tools**: `searchCatalog` (hybrid RAG search across projects + threads), `showProjects` (renders project results), `showThreads` (renders thread results)
- **RAG namespace**: `"projects"` — project names + summaries are indexed; `"threads"` — thread titles + bodies are indexed

When a project or thread is created or updated, `rag.add()` upserts its embedding. On deletion, `rag.delete()` removes it. Search results include both projects and threads, distinguished by emoji indicators in the UI.

---

## Weekly Digest & Email Pipeline

The app sends weekly digest emails summarizing platform activity. The pipeline uses a **3-tier architecture** with a cron-based queue drainer for delivery.

### Pipeline Flow

```
Cron (Friday 12pm EST / 17:00 UTC) → generateWeeklyDigests (action, convex/digests.ts)
  └─ loop: getEligibleUserBatch (50 users/batch, cursor-based)
       └─ generateDigestBatch (action)
            └─ per user: gatherUserDigestData (query) → enqueueDigestEmail (mutation)
                 └─ inserts into emailQueue { status: "pending" }

Cron (every 5 min) → drainEmailQueue (action, convex/emails.ts)
  └─ fetches up to 14 pending emails (matching SES rate limits)
  └─ per email: sendEmail → renders HTML via emailRenderer.ts → sends via SES v2
  └─ marks each row "sent" or "failed" with reason

Cron (every 6 hours) → refreshAllFeeds (mutation, convex/userAffinities.ts)
  └─ loop: all onboarded users (staggered 5s apart)
       └─ recomputeAffinitiesAndFeed per user
            └─ updates userAffinities doc + rebuilds userFeedEntries (delete-all + reinsert)
```

### Key Files

| File | Responsibility |
|---|---|
| `convex/digests.ts` | Orchestrator action, per-user data gathering, email enqueuing with deduplication |
| `convex/emails.ts` | `sendEmail` (SES v2 integration), queue drainer, email preference queries/mutations |
| `convex/emailRenderer.ts` | `renderWeeklyDigestEmail` — typed HTML + plain-text templates with `escapeHtml` |
| `convex/notificationEngine.ts` | Centralized notification hub — all in-app + transactional email side effects |
| `convex/users.ts` | `getEmailRecipient` — internal query returning `{ name, email }` for a user |

### Digest Data Shape

Each digest email payload contains:
- `ownProjectActivity` — per-project stats (new upvotes, comments, adoptions, views)
- `ownProjectTotals` — aggregated totals across all owned projects
- `followedSpaceActivity` — top projects and new threads in followed spaces
- `platformHighlights` — trending projects and threads across all spaces
- `periodStart` / `periodEnd` — timestamps defining the digest window

### Email Queue

The `emailQueue` table tracks every outbound email with status transitions: `pending → sent | failed`. Key indexes:
- `by_status_createdAt` — used by the queue drainer to fetch oldest pending emails first
- `by_userId_type_createdAt` — used for deduplication (1-hour window prevents duplicate digests)

### Email Preferences

Users can opt out of email categories via `emailPreferences` on the `users` table. Categories: `weeklyDigest`, `spaceActivity`, `projectActivity`, `followedProjectComment`, `followedProjectUpdate`, `mentions`. All default to opt-in (enabled if undefined). Preferences are checked during digest generation, not at send time. The `EmailPreferencesSection` component renders toggle switches for each category.

---

## Personalized Feed & User Affinities

The home feed (`app/(app)/page.tsx`) uses `api.projects.listPersonalizedFeed` to show users a personalized ranking of projects. For users without precomputed data, it falls back to the global hot-score feed.

### Architecture

- **`convex/userAffinities.ts`** — computes per-user affinity profiles and precomputes feed entries
- **`convex/projects/personalizedFeed.ts`** — the `listPersonalizedFeed` query reads from `userFeedEntries`
- **`userAffinities` table** — stores the affinity profile (followed spaces, engaged creators/projects, recency timestamps)
- **`userFeedEntries` table** — precomputed scored entries indexed by `by_userId_personalizedScore`

### Affinity Refresh Cadence

Full recompute runs every 6 hours via cron (`internal.userAffinities.refreshAllFeeds`). Each user's job is staggered 5 seconds apart to avoid thundering herd. Incremental helpers update the in-memory affinity doc on engagement events (upvote, adoption, comment, space follow) — call these from engagement mutations so the profile stays fresh between cron cycles:

- `incrementalAddEngagedProject(ctx, userId, projectId, creatorId)`
- `incrementalRemoveEngagedProject(ctx, userId, projectId)`
- `incrementalToggleFollowedSpace(ctx, userId, focusAreaId, isFollowing)`

### Score Formula

```
personalizedScore = hotScore × (1 + clamp(boost, -0.3, 2.0))
```

Boost contributions:
- `+0.5` per followed space match (max 2 spaces), weighted by recency decay
- `+0.25` per implicit space engagement (not followed, but engaged), weighted by recency decay
- `+0.4` if user has engaged with the project's creator, weighted by recency decay
- `+0.2` if the project creator is in the same department
- `−0.3` if the user has already upvoted/adopted/commented on the project

---

## Notifications

All notification side effects (in-app + transactional email) are routed through `convex/notificationEngine.ts`. Call `emitNotificationEvent(ctx, event)` from any mutation — the engine handles recipient resolution, preference checking, dedup, and fan-out. Weekly digest is excluded (different batch/cron pattern).

### Event types

| Event | Description |
|---|---|
| `"comment"` | New project comment — notifies owner (in-app + email) and parent author for replies |
| `"thread_comment"` | New thread comment — notifies thread owner (email only) |
| `"mention"` | @-mention in a comment or thread — notifies each mentioned user (in-app + email) |
| `"upvote"` | Project upvote toggled — aggregated in-app notification for owner |
| `"follow"` | User adopted a project — in-app notification for owner |
| `"project_update"` | Project updated — fan-out email to adopters (scheduled via `processProjectUpdate`) |
| `"thread_created"` | New thread in a space — fan-out email to space followers (scheduled via `processSpaceNotification`) |
| `"project_added_to_space"` | Project added to a space — fan-out email to space followers (scheduled via `processSpaceNotification`) |

### In-app notification types (stored in `notifications` table)

Notifications are aggregated (upserted) per `(recipient, project, type)` tuple. In-app types:
- `"comment"` — someone commented on your project
- `"reply"` — someone replied to your comment
- `"upvote"` — upvote count notification (aggregated, with `count` field)
- `"follow"` — someone adopted/followed your project
- `"project_update"` — a project you adopted was updated
- `"followed_project_comment"` — a project you follow received a new comment (aggregated)
- `"mention"` — you were @-mentioned in a comment or thread

In-app notifications are pruned to the 50 most recent per user (`NOTIFICATION_HISTORY_LIMIT`).

---

## CI/CD

- **Push to `main`** → GitHub Actions runs `npx convex deploy` to production (self-hosted Convex)
- **All branch pushes** → Next.js build verification runs (`verifyNextBuild.yml`); also mirrored to a separate work repo (`project-garden-mirror`)

Secrets required:
- `CONVEX_SELF_HOSTED_URL`
- `CONVEX_SELF_HOSTED_ADMIN_KEY`
- `MIRROR_TOKEN`

---

## Key Patterns and Things to Know

1. **Project submission is two-step**: `/submit` creates a `pending` project + shows similar projects. `/submit/confirm` activates it (`confirmProject` mutation sets `status: "active"`).

2. **Readiness status** has a legacy value (`"in_progress"`) kept for migration compatibility. New projects use: `just_an_idea | early_prototype | mostly_working | ready_to_use`.

3. **`convex/_generated/`** is auto-generated — never edit these files. Run `npx convex dev` to regenerate after schema or function changes.

4. **Media ordering** uses an explicit `order` field on `mediaFiles`. Use `reorderProjectMedia` to update order. Always query with `by_project_ordered` index and `.order("asc")`.

5. **View tracking** deduplicates by `viewerId` string (can be user ID or anonymous session ID). A view is only counted once per viewer per project.

6. **`allFields`** on projects is a denormalized string used for full-text search indexing (indexed via `searchIndex("allFields", ...)`).

7. **`Authenticated` / `Unauthenticated`** components from `convex/react` are used to conditionally render content based on auth state (see `app/(app)/layout.tsx`).

8. **PostHog analytics** is initialized in `instrumentation-client.ts` (Next.js client instrumentation hook) and proxied through Next.js rewrites (`/ingest/*` → PostHog endpoints) to avoid ad blockers. Requires `NEXT_PUBLIC_POSTHOG_KEY` env var.

9. **Thread in-app notifications are limited** — `notifications` table entries for threads are only generated for `"mention"` (when a user is @-mentioned). General thread/upvote/comment activity does not produce in-app badges; those exist only as email notifications (via `notificationEngine.ts` → `processSpaceNotification`). Do not add broad thread in-app notifications without discussing the aggregation strategy.

10. **`SpacePicker`** is a controlled combobox component (`components/SpacePicker.tsx`) used on the standalone `/create-thread` page to let users pick which space a thread belongs to.

11. **Thread comments share UI components with project comments** — `CommentForm` and `CommentThread` are used for both. The backend tables differ (`threadComments` / `threadCommentUpvotes` vs `comments` / `commentUpvotes`), but the frontend components are consolidated. Both use the rich-text Quill editor (not a plain textarea).

12. **Deleted comments with replies are retained** — when a comment is soft-deleted, it remains visible as `[deleted]` if it has non-deleted replies, preventing orphaned reply threads. The filter logic lives on the project detail page.

13. **Upvote icons use `ArrowBigUp`** from Lucide React — not thumbs-up or heart icons. Use `ArrowBigUp` consistently for all upvote affordances across projects, threads, and comments.

14. **Department field on users** — populated automatically from the Cognito `custom:department` attribute during `ensureUser`. Displayed on the profile page. Do not prompt users to enter it manually.

15. **User profile page** — shows `department` if populated; does not display `userIntent` labels to the user. The `userIntent` field (`"looking" | "sharing" | "both"`) is collected at onboarding and available in the backend but is not currently surfaced in the UI.

16. **Email sending uses a queue pattern** — never call SES directly from mutations. Always insert into `emailQueue` and let the cron-based drainer handle delivery. This provides rate limiting (14 emails/batch, matching SES limits), automatic retry, and full audit trail.

17. **Email templates live in `convex/emailRenderer.ts`** — all HTML must use `escapeHtml()` for user-generated content. Templates include both HTML and plain-text versions. Add new email types by adding a renderer function and a case in `sendEmail`'s type dispatch.

18. **SES shares AWS credentials with Bedrock** — `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are shared across all AWS services (Bedrock, SES). The IAM role must have both Bedrock and SES permissions. `SES_FROM_EMAIL` must also be set and the sender address verified in SES.

19. **`hotScore` must be propagated to `projectSpaces`** — The `projectSpaces` table denormalizes `hotScore` from `projects` to enable a single paginated index scan per space feed. Any code path that patches `hotScore` on a project must also call `propagateHotScoreToMemberships(ctx, projectId, newHotScore)` from `convex/projects/spaces.ts`. Current call sites: `toggleUpvote`, `addComment`, `deleteComment`, `createVersion`, `confirmProject`, `refreshHotScores`.

20. **Multi-space support** — Projects can belong to multiple spaces. One space is `isPrimary: true`; others are secondary. The `AdditionalSpacesPicker` component handles secondary space selection. `syncProjectSpaceMemberships()` in `convex/projects/spaces.ts` keeps the `projectSpaces` table in sync whenever a project is created/updated.

21. **Project versions** — Projects track a changelog via `projectVersions` (tag, title, body, links, files). The `versionCount` and `lastVersionAt` fields on `projects` are updated on every version create/delete. Version pages live at `/project/[id]/versions`. The `VersionsList` component renders the history with expand/collapse.

22. **Header search bar** — `SearchBar.tsx` in `header.tsx` performs hybrid search (full-text + semantic via RAG) returning both projects and threads. Projects and threads are distinguished with emoji prefixes in results. Search is powered by `convex/projects/search.ts` and threads RAG indexing.

23. **AI SDK v6** — The project uses Vercel AI SDK v6 (`ai: ^6.0.116`) with `@convex-dev/agent ^0.6.1` and `@convex-dev/rag ^0.7.2`. The file `convex/_generated/ai/guidelines.md` may not always exist (it is generated by `npx convex ai-files install`). If absent, run that command or refer to the official `@convex-dev/agent` docs for v6 API patterns.

24. **`allFields` on threads** — mirrors the same pattern as projects: a denormalized string indexed via `searchIndex("allFields", ...)` for full-text search. It is updated whenever a thread is created or edited, and is used by `fullTextSearchThreads()` in the search pipeline.

25. **RAG entry ID tracking** — both `projects` and `threads` tables have an `entryId` field that stores the RAG document ID returned by `rag.add()`. This is used to update (`rag.add()`) or remove (`rag.delete()`) entries when a project/thread changes. The `by_entryId` index enables fast lookups. Backfill functions (`backfillAllProjects`, `backfillAllThreads`) re-index records that are missing entry IDs.

26. **Thread image support** — threads support embedded images in their rich-text `body`. Uploaded images are stored in Convex storage and their IDs are tracked in `threads.imageStorageIds`. Use the `useThreadImageUpload` hook (`hooks/use-thread-image-upload.ts`) in editors: it maintains a `Map<url, storageId>` so `getStorageIdsFromHtml(html)` can resolve which storage IDs are still referenced in the final HTML before saving. Call `populateExistingImages()` when entering edit mode on an existing thread.

27. **Hot score `effectiveTime`** — `calculateHotScore()` in `convex/projects/helpers.ts` uses `effectiveTime = lastVersionAt ? Math.max(creationTime, lastVersionAt) : creationTime`. Publishing a new project version bumps `lastVersionAt`, which resets the age calculation and boosts the project's score as if it were newly created.

28. **`linkClickCounts` table** — tracks click-through counts per link or downloadable file on a project (`resourceType: "link" | "file"`). Use the `by_project_resource` index for lookups. Do not read this table with `.filter()` alone.

29. **`ViewsIcon` component** — a custom composite SVG (`components/ViewsIcon.tsx`) representing "views on this post" (eye inside a rounded rectangle). Use this instead of the standalone `Eye` icon from Lucide wherever a view count is displayed alongside a project.

30. **Mentions system** — Users can @-mention others in comments and threads. Mentions are stored as custom Quill Embed blots (`QuillMentionModule.ts`). On save, `convex/mentions.ts` parses the rich-text HTML for mention blots and dispatches `"mention"` notifications to each mentioned user. The `use-mention-search.ts` hook powers the autocomplete dropdown in the editor.

31. **Comment editing** — Both project comments and thread comments are editable by their authors. On edit, `editedAt` is set on the record and the UI displays an "(edited)" indicator. Soft-delete and reply-retention logic is unchanged.

32. **`ReadinessBadge` is a labeled badge** — The component (`components/ReadinessBadge.tsx`) renders a text badge (e.g. "ready to use", "early prototype"), not a dot indicator. Use this component wherever readiness status is displayed; do not revert to a dot style.

33. **`emailRenderer.ts` includes `stripHtml()`** — A `stripHtml()` helper strips HTML tags to produce plain-text snippets for email notifications and digest comment previews. Always use this (not a regex) when generating text-only representations of rich-text comment content.

34. **`lib/upload.ts`** — Shared helpers for generating Convex storage upload URLs and handling file uploads on the frontend. Use these helpers rather than calling Convex storage APIs ad-hoc.

35. **Centralized notification engine** — All notification side effects (in-app + email) must go through `emitNotificationEvent(ctx, event)` in `convex/notificationEngine.ts`. Do NOT directly insert into `notifications` or `emailQueue` from feature mutations — call the engine instead. The engine handles preference checks, 30-min dedup, fan-out scheduling, and notification pruning in one place.

36. **Personalized feed** — The home feed uses `api.projects.listPersonalizedFeed` (defined in `convex/projects/personalizedFeed.ts`). It reads from the `userFeedEntries` table (precomputed personalized scores) and falls back to the global `by_status_hotScore` feed for anonymous users or users without precomputed entries. Feed entries are refreshed every 6 hours via `internal.userAffinities.refreshAllFeeds` (cron). Incremental helpers in `convex/userAffinities.ts` (`incrementalAddEngagedProject`, `incrementalRemoveEngagedProject`, `incrementalToggleFollowedSpace`) can be called from engagement mutations to keep the affinity doc fresh between full recomputes.

37. **User affinity scoring** — `convex/userAffinities.ts` maintains a `userAffinities` document per user (indexed `by_userId`) tracking followed spaces, engaged creators/projects, department, and recency timestamps. The personalized score formula is: `baseHotScore × (1 + clamp(boost, -0.3, 2.0))`. Boost sources: followed-space match (+0.5/space, max 2 spaces), implicit space engagement (+0.25), creator affinity (+0.4), same department (+0.2), already-engaged penalty (−0.3). Recency decay: full weight within 7 days, linear decay to 0.3 by 90 days.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
