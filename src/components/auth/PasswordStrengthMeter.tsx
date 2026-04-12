import { PASSWORD_RULES, getPasswordStrength, STRENGTH_LABELS, STRENGTH_COLORS } from '@/utils/passwordValidation';

type Props = {
  password: string;
};

/**
 * Password strength meter + requirements checklist. Extracted from the
 * duplicated blocks in SignupClient and UpdatePasswordClient. Renders nothing
 * when the password field is empty.
 */
export function PasswordStrengthMeter({ password }: Props) {
  if (password.length === 0) return null;
  const strength = getPasswordStrength(password);

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bars */}
      <div className="flex gap-1">
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i < strength ? STRENGTH_COLORS[strength] : 'var(--border)' }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: STRENGTH_COLORS[strength] }}>
        {STRENGTH_LABELS[strength]}
      </p>

      {/* Requirements checklist */}
      <ul className="space-y-1 mt-2">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-2 text-xs">
              <span className={passed ? 'text-green-500' : 'text-muted-foreground'} aria-hidden="true">
                {passed ? '✓' : '○'}
              </span>
              <span className={passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
