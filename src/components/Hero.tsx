import { motion } from 'framer-motion';
import TheHomeWordmark from './TheHomeWordmark';
import CategoryImagePicker from './CategoryImagePicker';
import HeroPromptInput from './HeroPromptInput';
import { fadeUp, staggerContainer } from '../lib/motion';
import { cn } from '../lib/cn';
import type { CategoryId } from '../data/categories';

const HERO_BG = '/hero-background.png';

interface HeroProps {
  selectedCategory: CategoryId;
  onCategorySelect: (id: CategoryId) => void;
  onPromptSubmit: (query: string) => void;
  onUpload?: () => void;
  chatActive?: boolean;
}

export default function Hero({
  selectedCategory,
  onCategorySelect,
  onPromptSubmit,
  onUpload,
  chatActive = false,
}: HeroProps) {
  return (
    <section className="relative flex min-h-[85dvh] w-full flex-col items-center justify-center overflow-x-hidden px-4 pb-6 sm:px-6">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden transition-[filter,opacity] duration-500 ease-out',
          chatActive && 'blur-2xl opacity-60'
        )}
      >
        <img
          src={HERO_BG}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_35%] saturate-[1.08] contrast-[1.04]"
          fetchPriority="high"
          decoding="async"
        />
        {/* Light edge fades only — keeps photo visible */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cream/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cream/45 to-transparent" />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={cn(
          'relative z-10 flex w-full flex-col items-center text-center transition-[filter,opacity,transform] duration-500 ease-out',
          chatActive && 'pointer-events-none blur-md opacity-40 scale-[0.98]'
        )}
      >
        <motion.div
          variants={fadeUp}
          className={cn(
            'relative mb-8 w-full max-w-3xl sm:mb-10',
            chatActive && 'pointer-events-none'
          )}
        >
          <div className="relative z-0 flex justify-center">
            <div className="origin-top scale-[1.15] transform sm:scale-[1.35] md:scale-[1.5]">
              <TheHomeWordmark />
            </div>
          </div>
          <div className="relative z-20 mt-7 w-full max-w-2xl mx-auto sm:mt-8 md:mt-9">
            <HeroPromptInput onSubmit={onPromptSubmit} onUpload={onUpload} />
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="w-full max-w-[min(100%,58rem)] sm:max-w-[min(100%,64rem)]"
        >
          <CategoryImagePicker
            selectedCategory={selectedCategory}
            onSelectCategory={onCategorySelect}
            variant="hero"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
