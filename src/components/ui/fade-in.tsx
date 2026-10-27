import { motion, useReducedMotion } from 'framer-motion';
import { FADE_UP, DURATION, EASE } from '../../lib/animation';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/** The build-time render (src/lib/prerenderBody.tsx) has no viewport: the copy is written visible, as under reduced motion. */
const isServer = typeof window === 'undefined';

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  const reduced = useReducedMotion();

  if (reduced || isServer) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={{
        hidden: FADE_UP.hidden,
        visible: {
          ...FADE_UP.visible,
          transition: { duration: DURATION.base, ease: EASE.out, delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
