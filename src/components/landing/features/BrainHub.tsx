'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Logo from '@/components/shared/Logo';

/* ---- Brain hub: Logo + orbital rings + glow ---- */

export function BrainHub() {
  const hubRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(hubRef, { once: false, amount: 0.4 });

  return (
    <motion.div
      ref={hubRef}
      className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.55 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Outermost slow pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 180, height: 180,
          background: 'radial-gradient(circle, color-mix(in oklch, var(--tc-primary) 16%, transparent) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary pulse (offset phase) */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 130, height: 130,
          background: 'radial-gradient(circle, color-mix(in oklch, var(--tc-accent) 12%, transparent) 0%, transparent 70%)',
        }}
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />

      {/* Orbital ring 1 -- spins clockwise */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 108, height: 108,
          border: '1px solid color-mix(in oklch, var(--tc-primary) 38%, transparent)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: 7, height: 7,
            background: 'var(--tc-primary)',
            boxShadow: '0 0 10px 3px var(--tc-primary)',
            top: -3.5, left: 'calc(50% - 3.5px)',
          }}
        />
        <span
          className="absolute rounded-full"
          style={{
            width: 4, height: 4,
            background: 'color-mix(in oklch, var(--tc-primary) 60%, white)',
            boxShadow: '0 0 6px 1px var(--tc-primary)',
            bottom: -2, left: 'calc(50% - 2px)',
          }}
        />
      </motion.div>

      {/* Orbital ring 2 -- counter-spins, tilted in 3D */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 132, height: 132,
          border: '1px solid color-mix(in oklch, var(--tc-accent) 28%, transparent)',
          rotateX: 58,
          transformPerspective: 300,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: 5, height: 5,
            background: 'var(--tc-accent)',
            boxShadow: '0 0 7px 2px var(--tc-accent)',
            top: -2.5, left: 'calc(50% - 2.5px)',
          }}
        />
      </motion.div>

      {/* Orbital ring 3 -- slow, large, barely visible */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 152, height: 152,
          border: '0.5px solid color-mix(in oklch, var(--tc-primary) 15%, transparent)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: 4, height: 4,
            background: 'color-mix(in oklch, var(--tc-primary) 80%, white)',
            boxShadow: '0 0 6px 1px var(--tc-primary)',
            right: -2, top: 'calc(50% - 2px)',
          }}
        />
      </motion.div>

      {/* Logo brain center */}
      <motion.div
        className="relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: 74, height: 74,
          background:
            'radial-gradient(ellipse at 45% 45%, color-mix(in oklch, var(--tc-primary) 55%, oklch(0.28 0 0)) 0%, color-mix(in oklch, var(--tc-primary) 22%, oklch(0.1 0 0)) 55%, oklch(0.06 0 0) 100%)',
          border: '1.5px solid color-mix(in oklch, var(--tc-primary) 55%, transparent)',
          boxShadow: [
            '0 0 0 8px color-mix(in oklch, var(--tc-primary) 8%, transparent)',
            '0 0 36px color-mix(in oklch, var(--tc-primary) 24%, transparent)',
            'inset 0 1px 0 color-mix(in oklch, var(--tc-primary) 30%, transparent)',
          ].join(', '),
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Logo width={42} height={42} />
      </motion.div>
    </motion.div>
  );
}
