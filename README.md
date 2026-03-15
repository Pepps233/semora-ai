# Semora AI

## Project Description:

This project is an AI-powered web application for students at Purdue University that enables one-click PDF resume uploads,
automatically parses and structures resume data (skills, coursework, research, projects), and semantically matches students
to relevant research labs and professors based on their experience and desired roles. The system includes a Purdue-specific
research lab database, an embeddings-based recommendation engine powered by vector similarity search, and an AI email
personalization generator that produces tailored outreach openings referencing each lab’s research focus. The application
does **not require user login**; instead, it enforces daily usage limits (e.g., match generations per IP/device) through
backend rate limiting and request tracking within the stack.

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

## Environment Variables

See `frontend/.env.example` and `backend/.env.example` for required keys.

# Project Structure
```
semora/
├── PLAN.md                          ← 9-step implementation plan
├── .gitignore
├── README.md
├── .github/workflows/ci.yml         ← GitHub Actions (lint + build)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                  ← FastAPI app + CORS
│   │   ├── core/
│   │   │   ├── config.py            ← Pydantic settings
│   │   │   ├── redis.py             ← Async Redis client
│   │   │   └── rate_limit.py        ← IP-based daily limits
│   │   ├── api/v1/endpoints/
│   │   │   ├── resume.py            ← POST /resume/upload
│   │   │   ├── match.py             ← POST /match/
│   │   │   └── email.py             ← POST /email/generate
│   │   ├── schemas/                 ← Pydantic request/response models
│   │   └── services/
│   │       ├── pdf_parser.py        ← pdfplumber text extraction
│   │       ├── resume_parser.py     ← GPT-4o structuring
│   │       ├── embeddings.py        ← OpenAI embed + Pinecone query
│   │       └── email_generator.py   ← GPT-4o email openings
│   └── scripts/
│       ├── seed_labs.py             ← Seed Supabase + Pinecone
│       └── labs_data.json           ← Purdue lab starter data
├── frontend/                        ← (to be scaffolded in Step 1)
└── infra/docker-compose.yml
```