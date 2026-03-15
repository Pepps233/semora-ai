<p align="center">
  <img src="frontend/logo.png" alt="Opiral AI" width="80" />
</p>

<h1 align="center">Opiral AI</h1>

<p align="center">
  AI-powered research lab matching for Purdue University students.<br />
  Upload your resume. Get matched to labs. Send a personalized email — no account required.
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#contributing">Contributing</a> ·
  <a href="#reporting-issues">Reporting Issues</a>
</p>

---

## Overview

Opiral AI lets Purdue students discover research labs that match their background in seconds. It parses a PDF resume using GPT-4o, performs vector similarity search against a curated database of 35+ Purdue research labs, and generates a personalized outreach email opening for each match — all without requiring a login.

**Key features:**
- PDF resume upload with AI parsing (skills, coursework, research, projects)
- Semantic lab matching via OpenAI embeddings + Pinecone vector search
- Personalized email draft generation per lab
- No authentication required
- Per-session rate limiting (5 matches, 3 emails per upload)

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | FastAPI, Uvicorn, Python 3.13 |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Vector DB | Pinecone (serverless, cosine, dim=512) |
| Cache / Rate Limiting | Upstash Redis (REST API) |
| AI | OpenAI GPT-4o (parsing + email), text-embedding-3-small (embeddings) |
| Deployment | Vercel (frontend), Render / Railway (backend) |

---

## Project Structure

```
opiral/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                  # FastAPI app + CORS
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic settings
│   │   │   ├── redis.py             # Upstash Redis REST client
│   │   │   ├── supabase.py          # Supabase singleton client
│   │   │   └── rate_limit.py        # Per-session rate limiting
│   │   ├── api/v1/endpoints/
│   │   │   ├── resume.py            # POST /resume/upload, GET /resume/{id}
│   │   │   ├── match.py             # POST /match/, GET /match/stats
│   │   │   └── email.py             # POST /email/generate
│   │   ├── schemas/                 # Pydantic request/response models
│   │   └── services/
│   │       ├── pdf_parser.py        # pdfplumber text extraction
│   │       ├── resume_parser.py     # GPT-4o resume structuring
│   │       ├── embeddings.py        # OpenAI embed + Pinecone query
│   │       └── email_generator.py   # GPT-4o email openings
│   └── scripts/
│       ├── seed_labs.py             # Seed Supabase + Pinecone with lab data
│       └── labs_data.json           # Purdue lab dataset
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Home + upload flow
│   │   ├── providers.tsx            # TanStack Query provider
│   │   └── matches/page.tsx         # Match results + email modal
│   └── components/
│       └── EmailModal.tsx
└── infra/
    └── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.13+
- Accounts: Supabase, Pinecone, Upstash, OpenAI

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Backend

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Environment Variables

Copy the example files and fill in your keys:

```
frontend/.env.example  →  frontend/.env.local
backend/.env.example   →  backend/.env
```

See each `.env.example` for the full list of required variables.

### Seeding the Lab Database

After configuring your backend `.env`, run the seed script once to populate Supabase and Pinecone:

```bash
cd backend
source .venv/bin/activate
python -m scripts.seed_labs
```

---

## Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel — set root directory to `frontend/`, add `NEXT_PUBLIC_API_URL` |
| Backend | Render or Railway — uses `backend/Dockerfile`, add all env vars |
| Domain / CDN | Cloudflare — point CNAME to Vercel deployment URL |

After deploying the backend, update the `CORS_ORIGINS` env var to include your Vercel frontend URL and redeploy.

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```

2. Make your changes. Follow the commit format used in this repo:
   ```
   type(scope): short imperative summary

   - What changed and why
   ```

3. Open a pull request against `main` with a clear description of the change and any relevant context.

**Commit types:** `feat`, `fix`, `refactor`, `docs`, `test`, `style`, `perf`, `chore`, `ci`, `build`

For large changes, open an issue first to discuss the approach before writing code.

---

## Reporting Issues

If you find a bug or have a feature request, please [open an issue](../../issues/new) and include:

- A clear description of the problem or proposal
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Relevant logs, screenshots, or error messages

For security vulnerabilities, do not open a public issue — contact the maintainers directly.

---

## License

MIT
