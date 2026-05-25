export type ProcessingMode = 'catalog' | 'staged';

export const MODE_LABELS: Record<
  ProcessingMode,
  { title: string; short: string; description: string }
> = {
  catalog: {
    title: 'کاتالوگ',
    short: 'پس‌زمینه سفید',
    description: 'پس‌زمینه سفید · روبرو · کیفیت بالا · محصول بزرگ در قاب',
  },
  staged: {
    title: 'استیج شده',
    short: 'فضای lifestyle',
    description: 'کیفیت بالا · محصول همان اصل · صحنهٔ جدید و مرتبط',
  },
};
