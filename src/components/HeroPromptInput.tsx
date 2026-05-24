import { useState } from 'react';
import { ArrowUp, Mic, Paperclip } from 'lucide-react';
import { cn } from '../lib/cn';

interface HeroPromptInputProps {
  onSubmit: (query: string) => void;
  onUpload?: () => void;
  className?: string;
}

export default function HeroPromptInput({ onSubmit, onUpload, className }: HeroPromptInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative flex w-full items-center gap-2 rounded-[2rem] border border-white/60 bg-cream/95 py-2 pl-4 pr-2 shadow-[0_8px_32px_rgba(28,26,23,0.1)] backdrop-blur-sm',
        'focus-within:border-bronze/30 focus-within:shadow-[0_8px_40px_rgba(184,114,58,0.12)]',
        className
      )}
    >
      <button
        type="button"
        onClick={onUpload}
        className="-ml-1 rounded-full p-2 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
        aria-label="Upload reference"
      >
        <Paperclip className="h-5 w-5" />
      </button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Explain what you want to find in the home..."
        className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/50 sm:text-base"
      />
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="hidden rounded-full p-2 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink sm:flex"
          aria-label="Voice input"
        >
          <Mic className="h-5 w-5" />
        </button>
        <button
          type="submit"
          disabled={!value.trim()}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full bg-ink text-cream shadow-sm transition-all',
            value.trim() ? 'hover:scale-105 active:scale-95' : 'opacity-40'
          )}
          aria-label="Send"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
