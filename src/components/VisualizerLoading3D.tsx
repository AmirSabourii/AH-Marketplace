import { motion } from 'framer-motion';

interface VisualizerLoading3DProps {
  label?: string;
  sublabel?: string;
  overlay?: boolean;
}

export default function VisualizerLoading3D({
  label = 'Staging your room',
  sublabel = 'Gemini is placing your pieces…',
  overlay = false,
}: VisualizerLoading3DProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-10 py-12">
      {/* 3D Scene Container */}
      <div className="relative h-32 w-32" style={{ perspective: '1000px' }}>
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{
            rotateX: [0, 360],
            rotateY: [0, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {/* Cube Faces */}
          {[
            { transform: 'rotateY(0deg) translateZ(64px)' },   // Front
            { transform: 'rotateY(180deg) translateZ(64px)' }, // Back
            { transform: 'rotateY(90deg) translateZ(64px)' },  // Right
            { transform: 'rotateY(-90deg) translateZ(64px)' }, // Left
            { transform: 'rotateX(90deg) translateZ(64px)' },  // Top
            { transform: 'rotateX(-90deg) translateZ(64px)' }, // Bottom
          ].map((face, index) => (
            <div
              key={index}
              className="absolute inset-0 border border-bronze/40 bg-gradient-to-br from-cream/90 via-parchment/80 to-bronze-soft/90 shadow-[inset_0_0_20px_rgba(184,114,58,0.2)] backdrop-blur-md"
              style={{
                transform: face.transform,
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Inner details for realism */}
              <div className="absolute inset-2 border border-bronze/20 rounded-sm opacity-50" />
            </div>
          ))}
        </motion.div>

        {/* Floor Shadow */}
        <motion.div
          className="absolute -bottom-8 left-1/2 h-4 w-24 -translate-x-1/2 rounded-[100%] bg-ink/20 blur-md"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="text-center max-w-xs z-10">
        <motion.p
          className={overlay ? 'font-medium text-cream text-base drop-shadow-md' : 'font-medium text-ink text-base'}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {label}
        </motion.p>
        <p className={overlay ? 'mt-2 text-sm text-cream/80 drop-shadow-sm' : 'mt-2 text-sm text-ink-muted'}>
          {sublabel}
        </p>
      </div>
    </div>
  );
}
