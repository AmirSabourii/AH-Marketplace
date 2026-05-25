# Product Extraction Pipeline

Generic, fault-tolerant pipeline: pick a category from the discovered list → extract 5 products.

## Flow

```
Categories[]  →  categorySelector  →  ONE category
                                         ↓
                              runCategoryProductPipeline
                                         ↓
                    ┌────────────────────┴────────────────────┐
                    │ 1. Navigate to category URL              │
                    │ 2. extractProductListing (5 links)       │
                    │ 3. For each link:                        │
                    │    - Navigate to product page            │
                    │    - scrapePageImages (DOM fallback)     │
                    │    - extractProductDetail (Stagehand)    │
                    │    - emit SSE `product` event            │
                    └──────────────────────────────────────────┘
```

## Module layout

| File | Role |
|------|------|
| `products/config.ts` | Limits, timeouts, keyword defaults |
| `products/categorySelector.ts` | Pick category from list (query / keywords / heuristics) |
| `products/extractors.ts` | Listing + detail extraction, image scrape |
| `products/pipeline.ts` | Orchestrates one category; errors never abort whole run |

## Category selection priority

1. **User query** (`categoryQuery` in API/UI) — e.g. `"living room"`, `"مبل"`
2. **Default keywords** — sofa, living room, مبل, …
3. **First valid product category** — excludes contact/about/login URLs

Default: **1 category**, **5 products**.

## API

```json
POST /api/discover
{
  "apiKey": "...",
  "projectId": "...",
  "url": "https://shop.example.com",
  "categoryQuery": "living room",
  "productsPerCategory": 5
}
```

## Error handling

- Each step returns `{ ok: true, data } | { ok: false, error }`
- Product-level failures are logged; pipeline continues with remaining products
- Session WebSocket drops trigger live-view refresh, not full abort
- `CategoryExtractionReport.errors` collects all failures for debugging
