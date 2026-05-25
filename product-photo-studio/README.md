# استودیو عکس محصول (Product Photo Studio)

ابزار **جدا** از فروشگاه اصلی — برای تبدیل عکس‌های محصول با **Gemini**.

## Specification docs (English, implementation-agnostic)

| Pipeline | Document |
|----------|----------|
| Catalog (white background) | [docs/CATALOG_PIPELINE.md](docs/CATALOG_PIPELINE.md) |
| Staged (lifestyle scene) | [docs/STAGED_PIPELINE.md](docs/STAGED_PIPELINE.md) |

These include full engineered prompts, API contract, post-processing, and output bundles for downstream jobs.

## راه‌اندازی

```bash
cd product-photo-studio
npm install
cp .env.example .env
# VITE_GEMINI_API_KEY را در .env قرار دهید (همان کلید پروژه اصلی)
npm run dev
```

مرورگر: http://localhost:5180

## استفاده

1. **نوع خروجی** را انتخاب کنید:
   - **کاتالوگ** — پس‌زمینه سفید، روبرو، محصول بزرگ
   - **استیج شده** — همان محصول با کیفیت بالا در فضای داخلی جدید و مرتبط
2. چند عکس را **Bulk** آپلود کنید.
3. برای **هر عکس** عنوان محصول را بنویسید.
4. «پردازش» → دانلود خروجی‌ها.

## تنظیمات خروجی

- اندازه مربع (۱۲۰۰ تا ۲۵۶۰ پیکسل)
- درصد پر شدن قاب توسط محصول
- JPEG یا PNG

## جریان فنی

1. **Gemini** (`gemini-3.1-flash-image-preview`): محصول را از صحنه جدا می‌کند، پس‌زمینه سفید، زاویه روبرو.
2. **Canvas resize**: خروجی را روی بوم سفید مربع با کیفیت بالا قرار می‌دهد.

## نکات

- عنوان محصول دقیق‌تر = تشخیص بهتر در عکس‌های چندقطعه / stage شده.
- پردازش از مرورگر مستقیم به API گوگل می‌رود؛ کلید فقط در `.env` محلی باشد.
- برای صف طولانی، بین درخواست‌ها کمی صبر طبیعی است (محدودیت API).
