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

- Node.js 18+
- MongoDB database (e.g., MongoDB Atlas)
- Supabase project
- Cloudflare account (for Worker + Sandbox)

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

2. Login to Cloudflare:

```bash
npx wrangler login
```

3. Set secrets:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put AGENT_WORKER_SHARED_SECRET
```

4. Deploy:

```bash
npm run deploy
```

5. Update your `.env.local` with the worker URL.

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
