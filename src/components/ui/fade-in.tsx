import { motion, useReducedMotion } from 'framer-motion';
import { FADE_UP, DURATION, EASE } from '../../lib/animation';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  const reduced = useReducedMotion();

  if (reduced) {
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
