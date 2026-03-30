/**
 * Generates a CSS box-shadow string of randomly positioned dots.
 * Used by ParticleBackground and PricingHeroBackground for CSS-only particle layers.
 */
export function generateBoxShadow(count: number, spread: number, alpha: number): string {
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(Math.random() * 2560);
    const y = Math.round(Math.random() * 2560);
    shadows.push(`${x}px ${y}px 0 ${spread}px rgba(255,255,255,${alpha})`);
  }
  return shadows.join(',');
}
