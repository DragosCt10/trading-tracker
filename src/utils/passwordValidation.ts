export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter (A\u2013Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a\u2013z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number (0\u20139)', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character (!@#$%\u2026)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordStrength(password: string): number {
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}

export function isPasswordStrong(password: string): boolean {
  return getPasswordStrength(password) === PASSWORD_RULES.length;
}

export const STRENGTH_LABELS = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
export const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
