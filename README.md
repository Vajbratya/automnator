# automnator

LinkedIn AI post drafting, scoring, scheduling, and (mock) publishing.

This repo is intentionally usable without external services:

- Auth: mock session cookie (email-only sign-in)
- Storage: local file-backed JSON DB (`.data/automnator.db.json`)
- Publishing: mock LinkedIn client (returns fake post URLs)
- AI: mock generator + heuristic “virality” score

## Quick Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

1. Sign in with any email
2. Create a draft, generate variants, and save content
3. Schedule a post (it will be `pending` until approved)
4. Approve in `/app/approvals`

Run the worker in a second terminal to “publish” due, approved schedules:

```bash
pnpm worker
```

## Quality Gates

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

## Environment

Copy `.env.example` to `.env.local` and tweak as needed.

Key vars:

- `APP_SESSION_SECRET`: required in production; dev fallback exists but is insecure
- `AUTOMNATOR_DB_PATH`: optional; defaults to `.data/automnator.db.json`
- `MOCK_LINKEDIN`: defaults to `true`
- `MOCK_AI`: defaults to `true`

## Notes On LinkedIn Integration

The current implementation ships with a mock LinkedIn adapter. A real adapter
should be added behind an explicit opt-in flag (and you should ensure your usage
complies with LinkedIn’s platform policies and your local laws).
