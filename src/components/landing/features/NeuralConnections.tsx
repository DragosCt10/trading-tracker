'use client';

import { useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

/* ---- Neural connections SVG ---- */

interface ConnPoint {
  x1: number; y1: number; // brain center
  x2: number; y2: number; // near-card end (shortened)
  id: number;
}

export function NeuralConnections({
  containerRef,
  brainRef,
  leftCardRefs,
  rightCardRefs,
  statsRefs,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  brainRef: React.RefObject<HTMLDivElement | null>;
  leftCardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  rightCardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  statsRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}) {
  const [connections, setConnections] = useState<ConnPoint[]>([]);
  const isInView = useInView(containerRef, { once: false, amount: 0.2 });

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !brainRef.current) return;
      const cont = containerRef.current.getBoundingClientRect();
      const brain = brainRef.current.getBoundingClientRect();
      if (brain.width === 0) return; // hidden on mobile

      const bx = brain.left + brain.width / 2 - cont.left;
      const by = brain.top + brain.height / 2 - cont.top;
      const GAP = 28; // px to stop before card edge

      const makeConn = (tx: number, ty: number, id: number, lengthFactor = 1): ConnPoint | null => {
        const dx = tx - bx;
        const dy = ty - by;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < GAP) return null;
        const factor = ((len - GAP) / len) * lengthFactor;
        return { x1: bx, y1: by, x2: bx + dx * factor, y2: by + dy * factor, id };
      };

      const pts: ConnPoint[] = [];
      let id = 0;

      // Left cards -> target right-edge center of each card (bottom card = id 2, cut to half)
      for (let i = 0; i < leftCardRefs.current.length; i++) {
        const el = leftCardRefs.current[i];
        if (el && el.getBoundingClientRect().width > 0) {
          const r = el.getBoundingClientRect();
          const c = makeConn(r.right - cont.left, r.top + r.height / 2 - cont.top, id, i === 2 ? 0.5 : 1);
          if (c) pts.push(c);
        }
        id++;
      }

      // Right cards -> target left-edge center of each card (bottom card = id 5, cut to half)
      for (let i = 0; i < rightCardRefs.current.length; i++) {
        const el = rightCardRefs.current[i];
        if (el && el.getBoundingClientRect().width > 0) {
          const r = el.getBoundingClientRect();
          const c = makeConn(r.left - cont.left, r.top + r.height / 2 - cont.top, id, i === 2 ? 0.5 : 1);
          if (c) pts.push(c);
        }
        id++;
      }

      // Stats cards -> target top-center (outer 2 cut to half, inner 2 full)
      for (let i = 0; i < statsRefs.current.length; i++) {
        const el = statsRefs.current[i];
        if (el && el.getBoundingClientRect().width > 0) {
          const r = el.getBoundingClientRect();
          const isOuter = i === 0 || i === statsRefs.current.length - 1;
          const c = makeConn(r.left + r.width / 2 - cont.left, r.top - cont.top, id, isOuter ? 0.5 : 1);
          if (c) pts.push(c);
        }
        id++;
      }

      setConnections(pts);
    };

    const t = setTimeout(measure, 400);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [containerRef, brainRef, leftCardRefs, rightCardRefs, statsRefs]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} aria-hidden>
      <svg className="w-full h-full">
        <defs>
          {connections.map((conn) => (
            <linearGradient
              key={`grad-def-${conn.id}`}
              id={`lf-grad-${conn.id}`}
              gradientUnits="userSpaceOnUse"
              x1={conn.x1} y1={conn.y1}
              x2={conn.x2} y2={conn.y2}
            >
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0.35" />
              <stop offset="55%" stopColor="var(--tc-primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--tc-primary)" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {connections.map((conn) => (
          <motion.path
            key={`line-${conn.id}`}
            d={`M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y2}`}
            stroke={`url(#lf-grad-${conn.id})`}
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{
              duration: 1.4,
              delay: 0.6 + (conn.id % 10) * 0.1,
              ease: 'easeOut',
            }}
          />
        ))}
      </svg>
    </div>
  );
}
