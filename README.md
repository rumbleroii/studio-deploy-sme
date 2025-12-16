# Studio

End to end research platform for research managers

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Cloudflare     │────▶│    Claude       │
│   (Frontend +   │     │  Worker +       │     │  Agent SDK      │
│    API Routes)  │     │  Sandbox        │     │                 │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│    Supabase     │     │    MongoDB      │
│    (Auth)       │     │    (Data)       │
└─────────────────┘     └─────────────────┘
```

## Getting Started

### Prerequisites

- Node.js >= 20.9.0 (required for Next.js and Wrangler v4)
- MongoDB database (e.g., MongoDB Atlas)
- Supabase project
- Cloudflare account (for Worker + Sandbox)
- Docker Desktop / Docker Engine (required to build + deploy the Sandbox container image)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
cd agent-worker && npm install && cd ..
```

2. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# MongoDB (database name: autonomous_poc)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/autonomous_poc?retryWrites=true&w=majority

# Optional: Bootstrap admin users
INITIAL_ADMIN_EMAILS=admin@example.com

# Agent Worker (optional - app works without this)
AGENT_WORKER_URL=https://your-worker.workers.dev
AGENT_WORKER_SHARED_SECRET=your-secret
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Push database schema:

```bash
npm run db:push
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploying the Cloudflare Worker

1. Navigate to the worker directory:

```bash
cd agent-worker
```

2. Make sure Docker is running (required for container builds/push during deploy).

3. Login to Cloudflare (you must grant OAuth scopes that include `containers:write`):

```bash
npx wrangler login
```

4. Set secrets:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put AGENT_WORKER_SHARED_SECRET
```

5. Deploy (this repo uses `wrangler.jsonc` for container syntax; pass it explicitly):

```bash
npx wrangler deploy --config wrangler.jsonc
```

6. Update your `.env.local` with the worker URL.

## Cloudflare Worker + Sandbox (agent-worker)

### Mental model (for humans)

Think of this as **two layers**:

- **Cloudflare Worker (control plane)**: Lightweight orchestration + HTTP routing. This is `agent-worker/src/index.ts`.
- **Sandbox container (data plane)**: A Linux container where “real work” runs (our Claude runner, tools, etc). This container is attached to a Durable Object class.

The Worker does _not_ “run inside the container”. It **starts/addresses** sandbox instances and executes commands inside them.

### What runs where (concretely)

- **Next.js app** (`src/`): Your product UI + API routes. It calls the Worker for sandbox-related actions.
- **Cloudflare Worker** (`agent-worker/src/index.ts`): Receives `/ensure` + `/chat`, picks a sandbox instance, streams back output.
- **Sandbox instance (Durable Object instance)**: One per project id (we use `sandboxId = project-${projectId}`), with persistent storage.
- **Sandbox container image** (`agent-worker/Dockerfile`): Built locally and pushed at deploy time; Cloudflare starts it when a DO instance needs it.

### “Creating a sandbox” vs “creating instances”

- **Creating the sandbox image** (one-time per deploy): Happens on _your machine_ via Docker when you deploy. Wrangler builds the image and pushes it.
- **Creating sandbox instances** (runtime): Happens on Cloudflare. When the Worker addresses a DO id, Cloudflare creates/starts that Durable Object + container as needed.

### Runner packaging (no embedded script strings)

- The runner lives in `agent-worker/runner/run_chat.ts`.
- During container build, it is compiled to `/runner/run_chat.js` using `esbuild` in `agent-worker/Dockerfile`.
- The Worker executes it inside the project workspace via `node /runner/run_chat.js`.

### working_directory/ and .claude skills

- The container image bakes your Cursor/Claude skills from `agent-worker/runner/.claude` into `/runner/working_directory/.claude`.
- At runtime, the runner creates `<projectDir>/working_directory/` and copies the baked `.claude` into `<projectDir>/working_directory/.claude` (first run only).
- The runner then `chdir()`s into `<projectDir>/working_directory/` before starting the Agent SDK session.
  - **Note**: Agent SDK TypeScript v2 does not expose a `cwd` session option; it uses the Node process’ `process.cwd()`.

### Local smoke tests (curl)

The Worker expects `X-Shared-Secret: $AGENT_WORKER_SHARED_SECRET` and provides:

- `POST /v1/projects/:projectId/ensure`
- `POST /v1/projects/:projectId/chat` (streams SSE)

Cold starts can exceed 45s; use a higher timeout:

```bash
curl --max-time 140 -sN \
  -H "X-Shared-Secret: $AGENT_WORKER_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi","history":[],"researchObjectiveText":""}' \
  "$AGENT_WORKER_URL/v1/projects/test/chat"
```

### Common gotchas we hit

- **Wrangler v4 requires Node 20+**: If you’re on Node 18, deploy will fail.
- **Docker must be running**: Deploy builds/pushes the container image locally.
- **Missing container OAuth scope**: If deploy errors about `containers:write`, re-run `npx wrangler login` and grant scopes.
- **Container not “listening on 3000”**: Use a recent Sandbox base image and ensure the Dockerfile includes `EXPOSE 3000`.
- **DO resets on deploy**: You may see `Durable Object reset because its code was updated.` Just call `/ensure` again.
- **Local Docker can run out of disk**: `docker system prune -af --volumes` to free space.

## Project Structure

```
studio/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (authed)/          # Authenticated routes
│   │   │   ├── projects/      # Projects pages
│   │   │   └── users/         # Users management
│   │   ├── api/               # API routes
│   │   ├── auth/              # Auth callback
│   │   └── login/             # Login page
│   ├── components/            # React components
│   │   ├── layout/            # App shell
│   │   ├── projects/          # Project components
│   │   ├── users/             # User components
│   │   └── ui/                # UI primitives
│   ├── hooks/                 # Custom hooks
│   └── lib/                   # Utilities
│       ├── supabase/          # Supabase clients
│       ├── auth.ts            # Auth helpers
│       ├── db.ts              # Prisma client
│       └── utils.ts           # General utilities
├── prisma/
│   └── schema.prisma          # Database schema
└── agent-worker/              # Cloudflare Worker
    └── src/
        └── index.ts           # Worker entry point
```

## User Roles

| Role   | Projects | Users Page | Edit Roles |
| ------ | -------- | ---------- | ---------- |
| Viewer | ✅       | ❌         | ❌         |
| Editor | ✅       | ✅ (view)  | ❌         |
| Admin  | ✅       | ✅         | ✅         |

The first user to sign up becomes an admin automatically. You can also specify admin emails via the `INITIAL_ADMIN_EMAILS` environment variable.

## Development

### Running locally without the Worker

The app works without the Cloudflare Worker configured. Chat will return a placeholder message indicating the Worker needs to be set up.

### Database migrations

After modifying `prisma/schema.prisma`:

```bash
npm run db:push
```

## License

MIT
