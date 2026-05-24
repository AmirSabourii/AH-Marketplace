import { motion } from 'framer-motion';

/* Split into two parts for editorial styling:
   "The" — light serif italic
   "Home" — regular serif, "H" bronze-tinted */
const theLetters  = 'The'.split('');
const homeLetters = 'Home'.split('');

export default function TheHomeWordmark() {
  return (
    <h1
      className="flex flex-col items-start leading-none"
      aria-label="TheHome"
    >
      {/* "The" — italic, muted weight */}
      <span className="flex items-baseline gap-0">
        {theLetters.map((char, i) => (
          <motion.span
            key={`the-${i}`}
            initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              type: 'spring',
              stiffness: 220,
              damping: 24,
              delay: 0.04 + i * 0.055,
            }}
            className="font-display text-[clamp(2.6rem,8.5vw,5.5rem)] font-light italic tracking-[-0.01em] text-ink-muted"
          >
            {char}
          </motion.span>
        ))}
      </span>

      {/* "Home" — upright, heavier, "H" in bronze */}
      <span className="flex items-baseline gap-0 -mt-2 sm:-mt-2.5">
        {homeLetters.map((char, i) => (
          <motion.span
            key={`home-${i}`}
            initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 22,
              delay: 0.18 + i * 0.065,
            }}
            className={
              char === 'H'
                ? 'font-display text-[clamp(4.2rem,15vw,10rem)] font-medium tracking-[-0.03em] text-bronze'
                : 'font-display text-[clamp(4.2rem,15vw,10rem)] font-medium tracking-[-0.03em] text-ink'
            }
          >
            {char}
          </motion.span>
        ))}
      </span>
    </h1>
  );
}
