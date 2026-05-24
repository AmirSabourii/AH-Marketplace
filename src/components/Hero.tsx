import { motion } from 'framer-motion';
import TheHomeWordmark from './TheHomeWordmark';
import CategoryImagePicker from './CategoryImagePicker';
import HeroPromptInput from './HeroPromptInput';
import { fadeUp, staggerContainer } from '../lib/motion';
import { cn } from '../lib/cn';
import type { CategoryId } from '../data/categories';

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
    <section className="relative flex min-h-[85dvh] w-full flex-col items-center justify-center overflow-x-clip px-4 pb-6 sm:px-6">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden transition-[filter,opacity] duration-500 ease-out',
          chatActive && 'blur-2xl opacity-60'
        )}
      >
        <div className="absolute left-[50%] top-[20%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-bronze-soft/40 blur-[120px]" />
        <div className="absolute left-[20%] bottom-[10%] h-[24rem] w-[24rem] rounded-full bg-parchment/80 blur-[100px]" />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={cn(
          'relative z-10 flex w-full max-w-3xl flex-col items-center text-center transition-[filter,opacity,transform] duration-500 ease-out',
          chatActive && 'pointer-events-none blur-md opacity-40 scale-[0.98]'
        )}
      >
        <motion.p
          variants={fadeUp}
          className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-ink-muted sm:text-sm"
        >
          Welcome to
        </motion.p>

        <motion.div variants={fadeUp} className="relative mb-8 w-full max-w-2xl sm:mb-10">
          <div className="relative z-0 flex justify-center">
            <div className="origin-top scale-[1.15] transform sm:scale-[1.35] md:scale-[1.5]">
              <TheHomeWordmark />
            </div>
          </div>
          <div className="relative z-20 mt-7 w-full sm:mt-8 md:mt-9">
            <HeroPromptInput onSubmit={onPromptSubmit} onUpload={onUpload} />
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="w-full max-w-2xl">
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
