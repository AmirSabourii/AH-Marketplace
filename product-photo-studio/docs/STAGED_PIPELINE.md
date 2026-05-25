# Staged Lifestyle Product Image Pipeline

Specification for transforming a source product photograph into a **high-quality staged lifestyle image**: the **same physical product** (color, structure, components preserved) placed in a **new, beautiful, category-relevant interior** — not a white catalog background. Implementation-agnostic; suitable for handoff to any engineering team.

---

## 1. Purpose

| Goal | Description |
|------|-------------|
| Product identification | Isolate the hero item matching `productName` from catalog shots, old staging, or cluttered scenes |
| Quality enhancement | Sharper materials, cleaner edges, reduced compression artifacts |
| New environment | Generate a fresh, tidy, aspirational room — do not reuse the source room |
| Fidelity | Same product as reference — no redesign, recolor, or variant swap |
| Downstream use | Structured `raw` + `final` artifacts for marketing, social, PDP lifestyle slots, and further compositing |

---

## 2. Pipeline Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Input bundle   │ ──► │  Gemini image gen    │ ──► │  Post-process resize │ ──► │  Output bundle   │
│  (image + meta) │     │  (prompt + image)    │     │  (aspect preserved)  │     │  (raw + final)   │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘     └──────────────────┘
```

**Stage A — Model generation:** One multimodal request; model returns one lifestyle image.

**Stage B — Post-process:** Scale so the **longest side** equals `maxSize` (default 2048px); **preserve aspect ratio** — no square crop, no forced white background.

---

## 3. Inputs

### 3.1 Required

| Field | Type | Constraints | Role |
|-------|------|-------------|------|
| `sourceImage` | Binary image | JPEG, PNG, or WebP | Reference; may be white-background catalog, existing staging, or multi-item photo |
| `productName` | string | Non-empty recommended | Identifies hero product for isolation and scene relevance (e.g. sofa → living room) |

### 3.2 Optional (generation)

| Field | Type | Default | Role |
|-------|------|---------|------|
| `jobId` | string (UUID) | generated | Correlation ID for storage and downstream jobs |
| `aspectRatioHint` | enum | derived from source; see §5.2 | Gemini `imageConfig.aspectRatio` |

### 3.3 Optional (post-process / Stage B)

| Field | Type | Default | Role |
|-------|------|---------|------|
| `maxSize` | integer (px) | `2048` | Longest edge of output image |
| `outputFormat` | `jpeg` \| `png` | `jpeg` | Final encoding |
| `jpegQuality` | float `0–1` | `0.95` | JPEG only |

**Note:** There is no `productFill` or `backgroundColor` in staged post-process — composition is owned by the model.

### 3.4 Input bundle (recommended contract)

```json
{
  "pipeline": "staged",
  "version": "1.0",
  "jobId": "660e8400-e29b-41d4-a716-446655440001",
  "productName": "Linen three-seater sofa grey",
  "sourceImage": {
    "mimeType": "image/jpeg",
    "width": 2400,
    "height": 1600
  },
  "options": {
    "aspectRatioHint": "16:9",
    "postProcess": {
      "maxSize": 2048,
      "outputFormat": "jpeg",
      "jpegQuality": 0.95
    }
  }
}
```

---

## 4. Model Configuration

| Setting | Value |
|---------|--------|
| Provider | Google Generative Language API |
| Endpoint | `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent` |
| Auth | Header `x-goog-api-key: <API_KEY>` |
| Response modalities | `TEXT`, `IMAGE` |
| Image selection | Largest `inlineData.data` among image parts |

### 4.1 Request body structure

Same shape as catalog pipeline (§4.1 in `CATALOG_PIPELINE.md`): one text part (prompt) + one inline image part (`sourceImage`), with `generationConfig.imageConfig.aspectRatio`.

### 4.2 Aspect ratio selection (staged)

Derive from source dimensions `ratio = width / height`:

| Condition | `aspectRatio` label |
|-----------|---------------------|
| `ratio >= 1.2` (landscape) | `16:9` |
| `ratio <= 0.85` (portrait) | `4:5` |
| otherwise | `4:3` |

Default before measuring source: `16:9`.

Store chosen label in `generation.aspectRatio`.

---

## 5. Engineered Prompt (Staged)

**Template variable:** `{PRODUCT_NAME}` — replace with trimmed `productName`. Fallback: `the furniture product`.

**Full prompt (copy as-is, substitute `{PRODUCT_NAME}`):**

```
You are an elite lifestyle product photographer and interior visualizer for a premium furniture retailer.

TASK
Create a new, beautiful staged lifestyle photograph featuring the exact product from the input image.

PRODUCT TO FEATURE (CRITICAL)
The hero product is: "{PRODUCT_NAME}"
- The input may already be catalog-style, white-background, or an existing staged/default stock photo with clutter.
- Identify ONLY the item matching "{PRODUCT_NAME}" and use it as the sole hero piece in the new scene.
- Ignore other furniture or props from the input unless they are part of this same product.

PRODUCT FIDELITY (HIGHEST PRIORITY — NON-NEGOTIABLE)
The product in the output MUST be the SAME physical item as in the reference — not a similar substitute.
- Same exact shape, proportions, silhouette, and component count.
- Same exact colors, finishes, upholstery pattern, grain, stitching, tufting, seams, and hardware.
- Do not recolor, redesign, simplify geometry, or swap variants.
- If uncertain, copy from the reference — never invent.

QUALITY ENHANCEMENT
- Upscale perceived detail: sharper textures, cleaner edges, photorealistic materials.
- Fix compression artifacts and muddy cutouts from the source when present.
- Professional editorial lighting on the product.

NEW STAGED ENVIRONMENT (MANDATORY — NOT WHITE BACKGROUND)
- Replace the entire background with a NEW, cohesive, premium interior scene highly relevant to "{PRODUCT_NAME}".
  Examples: sofa → elegant living room; dining table → refined dining area; bed → serene bedroom; desk → modern home office; outdoor chair → tasteful patio/terrace.
- The room must feel intentional, tidy, aspirational, and magazine-quality — never messy or cluttered.
- Complementary decor only (subtle rug, wall art, plant, side table) that supports the product category — do not steal focus from the hero product.
- Do NOT reuse the original room architecture, walls, floor, or layout from the input photo.

COMPOSITION & CAMERA
- Place the product as the clear hero (roughly 40–55% visual weight) with realistic scale and perspective.
- Camera: lifestyle 3/4 or front angle that best showcases the product; eye-level or slight elevation; no dutch angle.
- Perfect grounding: accurate contact shadows; product must not float.
- Lighting: soft natural or studio-window light with consistent direction across product and room.

PROHIBITIONS
- No pure white catalog background, no gray sweep, no cutout floating on empty void.
- No people, pets, text, logos, or watermarks.
- No extra hero furniture competing with "{PRODUCT_NAME}".

OUTPUT
Return ONLY one high-resolution, photorealistic staged lifestyle image with the exact product beautifully placed in a new relevant interior.
```

### 5.1 Prompt ordering in the request

1. Text part: engineered prompt (above)
2. Inline image part: `sourceImage`

### 5.2 Catalog vs staged (decision table)

| Dimension | Catalog pipeline | Staged pipeline (this doc) |
|-----------|------------------|----------------------------|
| Background | Pure white RGB(255,255,255) | New interior scene |
| Product size in frame | ~85–92% (tight catalog) | ~40–55% visual weight (lifestyle hero) |
| Post-process | Square white canvas + `productFill` | Aspect-preserving upscale (`maxSize`) |
| Typical use | PDP primary, marketplaces | Marketing, social, lifestyle PDP |

---

## 6. Post-Processing (Stage B)

Applied to **raw model image** only.

### 6.1 Algorithm: aspect-preserving upscale

1. Load raw image `(rw, rh)`.
2. `scale = maxSize / max(rw, rh)`.
3. Canvas width `w = round(rw * scale)`, height `h = round(rh * scale)`.
4. Draw image at full canvas size with high-quality smoothing.
5. Export JPEG or PNG (no background fill — scene pixels fill the frame).

### 6.2 Why two images in the output bundle

| Artifact | Purpose |
|----------|---------|
| `raw` | Unscaled model output; QA and alternate export sizes |
| `final` | Delivery-ready master at `maxSize` longest edge |

---

## 7. Outputs

### 7.1 Success criteria

- `final` shows the same product as source (visually), in a **different** room than source
- Background is **not** catalog white
- Dimensions: longest side = `maxSize`; aspect ratio ≈ model output
- Photorealistic lighting and grounding (no floating product)

### 7.2 Output bundle (recommended contract)

```json
{
  "pipeline": "staged",
  "version": "1.0",
  "jobId": "660e8400-e29b-41d4-a716-446655440001",
  "status": "completed",
  "productName": "Linen three-seater sofa grey",
  "generation": {
    "model": "gemini-3.1-flash-image-preview",
    "aspectRatio": "16:9",
    "completedAt": "2026-05-25T12:00:00.000Z"
  },
  "artifacts": {
    "raw": {
      "role": "model_output",
      "mimeType": "image/png",
      "width": 1920,
      "height": 1080,
      "uri": "gs://bucket/jobs/660e8400/raw.png",
      "sha256": "<hex>"
    },
    "final": {
      "role": "staged_master",
      "mimeType": "image/jpeg",
      "width": 2048,
      "height": 1152,
      "uri": "gs://bucket/jobs/660e8400/final.jpg",
      "sha256": "<hex>"
    }
  },
  "postProcess": {
    "maxSize": 2048,
    "outputFormat": "jpeg",
    "jpegQuality": 0.95
  },
  "downstream": {
    "suggestedFilename": "linen-three-seater-sofa-grey-staged.jpg",
    "readyFor": [
      "marketing_hero",
      "social_crop_sources",
      "pdp_lifestyle_secondary",
      "cdn_upload",
      "catalog_pipeline_input",
      "room_visualizer_mood_reference"
    ]
  }
}
```

### 7.3 File naming convention

```
{slug(productName)}-staged.{jpg|png}
```

### 7.4 Error envelope

Same structure as catalog pipeline; use `"pipeline": "staged"` and the same error codes (`MODEL_NO_IMAGE`, `API_ERROR`, `INVALID_INPUT`, `POST_PROCESS_FAILED`).

---

## 8. Downstream Processing Hooks

| Downstream job | Input | Notes |
|----------------|-------|-------|
| Social crops | `artifacts.final` | 1:1, 4:5, 9:16 from landscape master |
| PDP lifestyle slot | `artifacts.final.uri` | Secondary image alongside catalog white shot |
| Feed to catalog pipeline | `artifacts.final` + `productName` | White-background extraction if marketplace requires both |
| A/B variants | `artifacts.raw` + new `jobId` | Re-prompt or re-post-process only |
| Video / motion ads | `artifacts.final` | Ken Burns or parallax from single frame |
| Room visualizer | `artifacts.final` + `productName` | Optional mood reference (not architectural anchor) |

**Chaining example:**

```
source photo → STAGED_PIPELINE → staged_master
                              → CATALOG_PIPELINE (optional second pass on staged_master or original)
```

Persist `jobId`, both artifact URIs, checksums, and `productName` for traceability.

---

## 9. Operational Notes

- **Scene relevance:** `productName` should imply category (sofa, bed, desk) so the model picks an appropriate room type.
- **Conflicts with catalog:** Do not run catalog white-background prompt on the same job if the business goal is lifestyle; use separate `jobId`s.
- **Concurrency:** Same API limits as catalog; serialize or throttle batch jobs.
- **QA checklist:** (1) product color match, (2) component count match, (3) new walls/floor vs source, (4) no white void background, (5) no extra hero furniture.

---

## 10. Reference Implementation

Reference code in `product-photo-studio`:

- Prompt: `buildProductStagedPrompt(productName)`
- API: `processProductPhoto({ mode: 'staged', ... })`
- Post-process: `resizeStagedOutput(raw, { maxSize, format, jpegQuality })`

When behavior conflicts with code, **§5 prompt text is authoritative**.
