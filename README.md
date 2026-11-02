# Mokabla Web

React + Vite + TypeScript + Tailwind CSS client for **Mokabla**, a free, anonymous bank of interview questions. It is bilingual (English / Arabic with full RTL), dark by default, and the theme is customisable.

This project is self-contained. It talks to the API (the separate `server/` repository) over HTTP and shares no code with it. The permission keys, catalog constants, Zod schemas and DTO types are deliberately duplicated in `src/shared/`. Each file says which server file to keep it in sync with.

## Setup

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5180 (proxies /api to the server)
```

Start the API first (`cd ../server && npm run dev`). Accounts are a username + password only (no email): open `/register`. The username must be 3+ characters (letters, numbers, `_`, `-`) and not start with a number; the password must be 6+ characters. Each rule is checked live as you type, along with availability.

| Script                                                  | What it does                                           |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                                           | Vite dev server with `/api` proxied to `DEV_API_PROXY` |
| `npm run build`                                         | Type-check and build to `dist/`                        |
| `npm run preview`                                       | Serve the production build                             |
| `npm test`                                              | Component tests (Vitest + Testing Library + jsdom)     |
| `npm run lint` / `npm run typecheck` / `npm run format` | Code quality                                           |

### Environment variables

| Variable        | Description                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`  | API origin for production builds. Leave empty when the API is served from the same origin under `/api` (recommended). |
| `DEV_API_PROXY` | Where the dev server proxies `/api` (default `http://localhost:4100`)                                                 |

If the API is on a different site, set `VITE_API_URL` and set `COOKIE_SAMESITE=none` on the server (HTTPS required).

## Structure

```
src/
  components/ui        Button, Card, Tabs, Modal, Field, Stars, ProgressRing, Markdown, Skeleton, Toast…
  components/layout    AppShell, Header, CommandPalette (Ctrl/⌘+K), NotFoundPage
  features/auth        useMe, <Can/>, useCan(), RequireAuth / RequirePermission, sign in / create account
  features/companies   grid, company page (Questions | Feedback | Ratings)
  features/questions   filter bar (URL state), virtualized list, question study page
  features/threads     shared answers/feedback thread, VoteButtons, reply tree, reports
  features/ratings     rating summary and anonymous reviews
  features/editor      CodeMirror solution editor (write-only)
  features/study       bookmarks, studied, study lists
  features/profile     own/public profile, badges, activity heatmap
  features/admin       review queues (questions, companies), reports, roles, role assignment, users, companies
  features/settings    theme and language
  i18n                 en / ar dictionaries (typed: a missing Arabic key fails the build)
  theme                preferences provider and theme tokens
  lib                  typed API client, query-key factory, hooks, lazy loaders
  shared               copies of server constants, permissions, schemas and DTO types
```

## Permissions in the UI

`GET /api/me` returns the user's effective permissions.

- `<Can permission="…">` and `useCan()` hide every button and link the user can't use. Nothing is shown disabled.
- `RequirePermission` renders a 404 for routes the user lacks.
- `/me` is refetched every 60 s and on window focus, so role changes apply without signing in again.
- The server enforces the same rules (403) regardless of what the client shows.
- Members ask for a role, with a reason, at `/request-role` (account menu). Staff with `users.assign_roles` handle requests at `/admin/role-requests`.

## Engagement & study features

- Question of the day, "Continue where you left off", a daily study streak, and per-company progress rings.
- On the question page:
  - "Mark studied" brings in the **next question**; finishing a company plays a small confetti burst.
  - Keyboard shortcuts: **J/K** next/previous, **B** bookmark, **S** studied, **F** focus mode (hides everything except the problem and the editor).
- Related questions, study lists, badges, reputation, an activity heatmap (only visible to its owner) and in-app notifications.
- **Solution editor**: CodeMirror with syntax highlighting, bracket matching and per-question drafts saved on the device. **No code is executed.** "Post as answer" publishes your code and notes to the thread, where the community votes.

## Messages, bans and safety

- **Inbox** (`/inbox`): email-style messages (subject + body). Anyone can write to the team; after sending, they're told a reply will come as soon as possible. Team members (`messages.team_inbox`) get a team inbox, see who answered each thread, and reply as "Mokabla" or with their own name. `messages.send_any` can start a message to any user (sender shown with their role).
- **Bans** require a reason (optional link). A banned account only sees the ban notice and can message the team. Signed in through a VPN/proxy: a banner explains that posting is off until it's turned off.
- **Profanity**: obscene text is refused; for mild insults the API client shows a warning ("a reviewer may ban you permanently") and resends only if the author confirms. This is handled once in `lib/api.ts` + `ApiBridge`, so every form gets it.
- **Reports** on answers, feedback, reviews, questions, messages and users, with an optional reason. Reviewers can delete the content or ban the author from the Reports page.
- **Four-eyes review**: your own question or company shows "waiting for another reviewer" unless you're the only reviewer.
- **Avatars**: an anonymous icon + color picked at sign-up, changeable from your profile.

## Drafts

- Unfinished questions and company suggestions can be saved as drafts (on this device, per account). A draft is named after its title, or `draft_` + 5 random characters.
- Leaving a page with unsaved work asks: save as draft, keep editing, or discard. Refreshing or closing the tab can only show the browser's own prompt, so the work is saved as a draft first.
- Drafts are listed on the Contribute page, in the suggest-company dialog and under Profile → Drafts.

## Theme

- Dark by default, with light and system modes.
- Neutral near-black surfaces with a **violet** accent (`#7c6cf6`), the Outfit font, and a top header on desktop (bottom navigation on phones). Settings has presets plus custom background, card and text colors for each mode, with a contrast warning and a one-click reset.
- Preferences are saved to the account when signed in (and to the device otherwise), and applied by an inline script before first paint, so there is no flash.
- Four base colors are CSS variables; every other color is derived with `color-mix()`.

## Performance

- Route-level code splitting; the home page is in the main chunk.
- Data is prefetched on hover/focus for company and question links, and for the previous/next questions.
- TanStack Query caching. Votes, bookmarks, studied, list membership and role toggles are optimistic, with rollback.
- Every list loads 20 at a time and fetches the next page as you scroll (`usePaged` + `<LoadMore>` in `lib/paged.tsx`); question lists are also window-virtualized.
- Skeletons with reserved space instead of spinners.
- Lazy chunks:
  - The CodeMirror editor (~100 KB gz) loads only when the panel nears the viewport, and only the chosen language pack.
  - highlight.js, marked and DOMPurify load on first use.
  - Framer Motion runs through `LazyMotion`, so animation features load after first paint.
- Initial JS is about **155 KB gzip** (React + Router 95 KB, app 47 KB, Query 14 KB).
- Animations respect `prefers-reduced-motion`.

## Accessibility

- Skip link and visible focus rings.
- Proper roles: tablist, radiogroup, switch, dialog (with focus trap and Escape to close), combobox and listbox in the command palette.
- `aria-live` on vote counts and toasts.
- Logical CSS properties for RTL, and Latin digits in Arabic so code and counts read consistently.

## Contributing

Source: [mokabla-client](https://github.com/diaaelawdy/mokabla-client) · [mokabla-server](https://github.com/diaaelawdy/mokabla-server). Issues and pull requests are welcome.

Please contribute from a separate GitHub account that doesn't reveal who you are. People share their real interviews here, and nobody should be traceable back to one.
