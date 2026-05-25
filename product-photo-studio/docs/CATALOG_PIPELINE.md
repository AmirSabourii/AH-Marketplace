# Catalog Product Image Pipeline

Specification for transforming a source product photograph into a **high-quality, front-facing catalog image** on a **pure white background**. This document is implementation-agnostic: a developer can rebuild the pipeline from inputs, prompts, API contract, post-processing rules, and output artifacts alone.

---

## 1. Purpose

| Goal | Description |
|------|-------------|
| Product isolation | Extract the sellable item from cluttered or pre-staged source photos |
| Catalog framing | Front or 3/4-front merchandising angle; product dominates the frame |
| Background | Pure white `RGB(255,255,255)` — e-commerce ready |
| Fidelity | Preserve exact shape, color, materials, and components — no redesign |
| Downstream use | Deliver structured outputs so later steps (CDN upload, thumbnails, AI room composite, etc.) can run without re-calling the model |

---

## 2. Pipeline Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Input bundle   │ ──► │  Gemini image gen    │ ──► │  Post-process resize │ ──► │  Output bundle   │
│  (image + meta) │     │  (prompt + image)    │     │  (square white canvas)│     │  (raw + final)   │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘     └──────────────────┘
```

**Stage A — Model generation:** One multimodal request; model returns a single image (may include incidental text parts — ignore text, use image part only).

**Stage B — Post-process:** Normalize to a square catalog canvas (white fill, centered product, configurable size and fill ratio). This stage is deterministic and does not call the model.

---

## 3. Inputs

### 3.1 Required

| Field | Type | Constraints | Role |
|-------|------|-------------|------|
| `sourceImage` | Binary image | JPEG, PNG, or WebP; readable dimensions | Reference photo; may be lifestyle/staged, white-background, or multi-item scene |
| `productName` | string | Non-empty recommended; trimmed before use | Tells the model which item to isolate when the scene contains multiple objects |

### 3.2 Optional (generation)

| Field | Type | Default | Role |
|-------|------|---------|------|
| `jobId` | string (UUID) | generated | Correlates logs, storage paths, and downstream jobs |
| `aspectRatioHint` | enum | derived from source dimensions | Passed to Gemini `imageConfig.aspectRatio`; see §5.2 |

### 3.3 Optional (post-process / Stage B)

| Field | Type | Default | Role |
|-------|------|---------|------|
| `outputSize` | integer (px) | `2048` | Square canvas width and height |
| `productFill` | float `0–1` | `0.90` | Fraction of canvas used by product bounding box (larger = bigger product) |
| `backgroundColor` | hex | `#FFFFFF` | Canvas fill behind product |
| `outputFormat` | `jpeg` \| `png` | `jpeg` | Final file encoding |
| `jpegQuality` | float `0–1` | `0.95` | Only when `outputFormat` is `jpeg` |

### 3.4 Input bundle (recommended contract)

```json
{
  "pipeline": "catalog",
  "version": "1.0",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "productName": "Linen three-seater sofa grey",
  "sourceImage": {
    "mimeType": "image/jpeg",
    "width": 2400,
    "height": 1600,
    "bytesBase64": "<optional for transport>"
  },
  "options": {
    "aspectRatioHint": "3:2",
    "postProcess": {
      "outputSize": 2048,
      "productFill": 0.9,
      "backgroundColor": "#FFFFFF",
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
| Image selection | If multiple image parts are returned, use the part with the **largest** `inlineData.data` payload |

### 4.1 Request body structure

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "<ENGINEERED_PROMPT>" },
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": "<base64-encoded source image>"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "<ASPECT_RATIO>"
    }
  }
}
```

### 4.2 Aspect ratio selection (catalog)

Pick the Gemini `aspectRatio` label whose numeric ratio is **closest** to `sourceWidth / sourceHeight`.

Supported labels and values:

| Label | Ratio |
|-------|-------|
| `1:1` | 1.0 |
| `4:3` | 1.333… |
| `3:4` | 0.75 |
| `16:9` | 1.777… |
| `9:16` | 0.5625 |
| `3:2` | 1.5 |
| `2:3` | 0.666… |
| `4:5` | 0.8 |
| `5:4` | 1.25 |
| `21:9` | 2.333… |

Store the chosen label in output metadata as `generation.aspectRatio`.

---

## 5. Engineered Prompt (Catalog)

**Template variable:** `{PRODUCT_NAME}` — replace with the trimmed `productName`. If empty, use fallback string `the furniture product`.

**Full prompt (copy as-is, substitute `{PRODUCT_NAME}`):**

```
You are a senior e-commerce product photography retoucher.

TASK
Turn the input photograph into a premium catalog product image.

PRODUCT TO ISOLATE (CRITICAL)
The sellable product is: "{PRODUCT_NAME}"
- The photo may be a staged lifestyle scene (room, props, multiple items, default stock staging).
- Locate ONLY the item that best matches "{PRODUCT_NAME}" by type, silhouette, materials, and color.
- Ignore all other furniture, decor, people, plants, and room architecture.
- If several similar items exist, choose the one that most clearly represents "{PRODUCT_NAME}".

PRODUCT FIDELITY (HIGHEST PRIORITY — NON-NEGOTIABLE)
The output product MUST be the SAME physical item as in the reference — not a similar-looking substitute.
- Same exact shape, proportions, silhouette, and component count (legs, arms, drawers, shelves, cushions, panels, handles, etc.).
- Same exact colors and finishes on every visible part (wood tone, fabric, metal, glass, stone) — do not brighten, desaturate, recolor, or "improve" hues.
- Same upholstery pattern, grain direction, stitching, tufting, seams, and hardware style/placement.
- Same visible wear level and material texture; do not simplify or stylize geometry.
- If uncertain about a detail, copy it from the reference — never guess or invent.
- Do NOT merge features from other objects in the scene into this product.

CAMERA & FRAMING
- Re-compose so the product faces the camera on its primary merchandising angle (front or clean 3/4 front).
- Do not show the back unless the reference only allows that view.
- Make the product LARGE in frame: it should dominate the image (roughly 85–92% of frame height or width — whichever is limiting).
- Use tight, catalog-style cropping with minimal white margin (~4–6% on each side).
- Center the product; straighten verticals; level the product; no dutch angle.
- Do not shrink the product to leave excessive empty white space.

BACKGROUND (MANDATORY)
- Full background must be pure solid white: RGB(255,255,255).
- No gradients, no gray sweep, no studio cyclorama color cast.
- Optional: very subtle contact shadow only directly beneath the product on the white floor.

QUALITY
- Maximum sharpness and detail on the product surfaces.
- Clean anti-aliased edges; no halos, fringing, or muddy cutouts.

PROHIBITIONS
- No text, watermarks, badges, or new props.
- No redesign, no variant swap, no added/removed parts, no dimension changes.

OUTPUT
Return ONLY one high-resolution product image on pure white background with the product shown large and faithful to the reference.
```

### 5.1 Prompt ordering in the request

1. Text part: engineered prompt (above)
2. Inline image part: `sourceImage`

---

## 6. Post-Processing (Stage B)

Applied to the **raw model image** before delivery as the canonical catalog asset.

### 6.1 Algorithm: square white canvas

1. Load raw image dimensions `(rw, rh)`.
2. Create canvas `size × size` (default 2048).
3. Fill entire canvas with `backgroundColor` (default white).
4. Compute scale:  
   `scale = min((size * productFill) / rw, (size * productFill) / rh)`
5. Draw image centered:  
   `drawWidth = rw * scale`, `drawHeight = rh * scale`  
   `x = (size - drawWidth) / 2`, `y = (size - drawHeight) / 2`
6. Use high-quality image smoothing.
7. Export as JPEG (quality 0.95) or PNG.

### 6.2 Why two images in the output bundle

| Artifact | Purpose |
|----------|---------|
| `raw` | Exact model output; useful for QA, re-cropping, or alternate post-process |
| `final` | Normalized catalog asset; safe to publish or feed into thumbnail/variant pipelines |

---

## 7. Outputs

### 7.1 Success criteria

- `final` is square, `outputSize × outputSize`, white background
- Product is centered and occupies ~`productFill` of the canvas
- No mandatory text/metadata embedded in pixels

### 7.2 Output bundle (recommended contract)

```json
{
  "pipeline": "catalog",
  "version": "1.0",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "productName": "Linen three-seater sofa grey",
  "generation": {
    "model": "gemini-3.1-flash-image-preview",
    "aspectRatio": "3:2",
    "completedAt": "2026-05-25T12:00:00.000Z"
  },
  "artifacts": {
    "raw": {
      "role": "model_output",
      "mimeType": "image/png",
      "width": 2048,
      "height": 1365,
      "uri": "gs://bucket/jobs/550e8400/raw.png",
      "sha256": "<hex>"
    },
    "final": {
      "role": "catalog_master",
      "mimeType": "image/jpeg",
      "width": 2048,
      "height": 2048,
      "uri": "gs://bucket/jobs/550e8400/final.jpg",
      "sha256": "<hex>"
    }
  },
  "postProcess": {
    "outputSize": 2048,
    "productFill": 0.9,
    "backgroundColor": "#FFFFFF",
    "outputFormat": "jpeg",
    "jpegQuality": 0.95
  },
  "downstream": {
    "suggestedFilename": "linen-three-seater-sofa-grey-catalog.jpg",
    "readyFor": [
      "ecommerce_pdp_primary",
      "thumbnail_generation",
      "cdn_upload",
      "background_removal_verification",
      "room_visualizer_product_reference"
    ]
  }
}
```

### 7.3 File naming convention

```
{slug(productName)}-catalog.{jpg|png}
```

Slug rules: trim, spaces → `-`, strip unsafe characters, max 80 chars.

### 7.4 Error envelope

```json
{
  "pipeline": "catalog",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": {
    "code": "MODEL_NO_IMAGE | API_ERROR | INVALID_INPUT | POST_PROCESS_FAILED",
    "message": "Human-readable detail",
    "retryable": true
  }
}
```

| Code | Typical cause |
|------|----------------|
| `MODEL_NO_IMAGE` | Model returned text only or empty image parts |
| `API_ERROR` | HTTP non-2xx or provider error message |
| `INVALID_INPUT` | Missing image or unreadable file |
| `POST_PROCESS_FAILED` | Canvas/decode failure |

---

## 8. Downstream Processing Hooks

The `final` artifact is designed as a **stable master** for later automated steps:

| Downstream job | Input field | Notes |
|----------------|-------------|-------|
| Thumbnail grid | `artifacts.final.uri` | Generate 400/800/WebP variants from square master |
| PDP image set | `artifacts.final` | Primary zoom image; white BG needs no extra matting |
| Quality gate | `artifacts.raw` vs `artifacts.final` | Compare fidelity before publish |
| Room visualizer reference | `artifacts.final.uri` + `productName` | Pass as product reference image in room-composite pipelines |
| Alt-text / SEO | `productName` | No pixel dependency |
| Re-run post-process only | `artifacts.raw.uri` | Change `productFill` or `outputSize` without new API cost |

Recommended: persist `jobId`, `productName`, `generation.aspectRatio`, and both artifact URIs + checksums for idempotent replays.

---

## 9. Operational Notes

- **Rate limits:** Process jobs sequentially or with low concurrency when using consumer API keys.
- **Product name quality:** Specific names (`Walnut extendable dining table 180cm`) outperform generic ones (`table`) in crowded staged sources.
- **Idempotency:** Same `jobId` + same inputs should overwrite or version artifacts explicitly (`final.v2`).
- **Versioning:** Bump `version` in input/output bundles when prompt or post-process defaults change.

---

## 10. Reference Implementation

Reference code (prompt builder, API call, post-process) lives in the `product-photo-studio` package:

- Prompt: `buildProductStudioPrompt(productName)`
- API: `processProductPhoto({ mode: 'catalog', ... })`
- Post-process: `resizeToCatalogSquare(raw, options)`

This document is the source of truth for product behavior; implementation may lag — prefer prompt text in §5 when in doubt.
