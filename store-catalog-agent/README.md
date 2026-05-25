# Store Catalog Agent

Agentic service to discover store name, contact info, and product categories from any e-commerce URL using [Browserbase](https://docs.browserbase.com/welcome/introduction) + Stagehand.

## Setup

```bash
cd store-catalog-agent
npm install
npm run dev
```

Open **http://localhost:5181**

## Usage

1. Enter your **Browserbase API Key** and **Project ID** ([Dashboard → Settings](https://www.browserbase.com/settings))
2. Paste the store URL
3. Click **شروع کشف**
4. Watch the **Live Browser** iframe and **Event Stream** logs
5. Results appear on the left: store info + category list + raw JSON
6. Optionally set **دسته برای استخراج** (e.g. `living room`, `مبل`) — otherwise auto-selects best category
7. Agent extracts **5 products** from that category with full details

## Architecture

```
POST /api/discover  →  SSE stream
  ├─ try Fetch API (cheap, static pages)
  └─ Stagehand on Browserbase (JS-heavy sites)
       ├─ extract store contact info
       ├─ expand category menus
       └─ agent fallback for hidden categories
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API (3456) + UI (5181) |
| `npm run dev:server` | API only |
| `npm run dev:web` | UI only |
| `npm run build` | Production build |

## API

```bash
curl -N -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"bb_...","projectId":"...","url":"https://example.com"}'
```

SSE events: `log`, `progress`, `browser`, `result`, `error`, `done`
