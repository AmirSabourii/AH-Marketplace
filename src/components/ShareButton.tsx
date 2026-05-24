import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '../lib/cn';
import { buildShareUrl, sharePageLink, type ShareTarget } from '../lib/share';

interface ShareButtonProps {
  target:     ShareTarget;
  className?: string;
}

export default function ShareButton({ target, className }: ShareButtonProps) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'shared'>('idle');

  const handleShare = async () => {
    const url    = buildShareUrl(target);
    const result = await sharePageLink(url);
    if (result === 'cancelled') return;
    setFeedback(result === 'copied' ? 'copied' : 'shared');
    window.setTimeout(() => setFeedback('idle'), 2200);
  };

  const isDone = feedback !== 'idle';

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        'pointer-events-auto flex items-center gap-1.5 rounded-full glass-dark px-3 py-2',
        'text-xs font-medium text-cream/90 shadow-sm transition-all duration-200 active:scale-[0.97] hover:opacity-90',
        className
      )}
      aria-label="Share this room"
    >
      {isDone ? (
        <>
          <Check className="h-3.5 w-3.5 text-[#8BC98A]" strokeWidth={2} />
          <span>{feedback === 'copied' ? 'Link copied' : 'Shared'}</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
