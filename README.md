# SaaS WhatsApp Bot - README

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **Docker** (for PostgreSQL & Redis)
- **Git**

### 1. Start Database & Redis

```bash
cd infra/docker
docker-compose up -d
```

### 2. Install Dependencies

```bash
# Install all packages
npm run install:all
```

### 3. Setup Database

```bash
# Generate Prisma client
cd packages/database
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio
npx prisma studio
```

### 4. Start the API

```bash
cd apps/api
npx prisma generate
npm run dev
```

API runs at: `http://localhost:3001`

### 5. Start the Frontend

```bash
cd apps/web
npm run dev
```

Frontend runs at: `http://localhost:3000`

### 6. (Optional) Start the Worker

```bash
cd apps/worker
npm run dev
```

## 📁 Project Structure

```
saas-whatsapp/
├── apps/
│   ├── web/         → Next.js frontend dashboard
│   ├── api/         → Express.js backend API
│   └── worker/      → Background jobs processor
├── packages/
│   ├── database/    → Prisma ORM & schema
│   └── whatsapp/    → WhatsApp engine
├── infra/
│   └── docker/      → Docker configs
└── docs/            → Documentation
```

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/users/stats | Dashboard stats |
| POST | /api/whatsapp/sessions | Create WhatsApp session |
| GET | /api/whatsapp/sessions | List sessions |
| DELETE | /api/whatsapp/sessions/:id | Delete session |
| POST | /api/whatsapp/sessions/:id/send | Send message |
| GET | /api/contacts | List contacts |
| POST | /api/contacts | Create contact |
| GET | /api/messages/conversations | List conversations |
| GET | /api/messages/chat/:contactId | Chat history |
| GET | /api/automations | List automations |
| POST | /api/automations | Create automation |
| PATCH | /api/automations/:id/toggle | Toggle automation |

## 🛠 Tech Stack

- **Frontend**: Next.js, React, TailwindCSS, Zustand
- **Backend**: Express.js, Prisma, Socket.IO
- **Database**: PostgreSQL
- **Cache**: Redis
- **WhatsApp**: whatsapp-web.js
- **Auth**: JWT + bcrypt
