'use client';

import { motion } from 'framer-motion';
import { authItemVariants } from '@/components/auth/authAnimations';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface NewsletterCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function NewsletterCheckbox({ checked, onCheckedChange }: NewsletterCheckboxProps) {
  return (
    <motion.div variants={authItemVariants} className="flex items-center space-x-2">
      <Checkbox
        id="newsletter-subscribe"
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
      />
      <Label
        htmlFor="newsletter-subscribe"
        className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300 select-none"
      >
        Subscribe to newsletter
      </Label>
    </motion.div>
  );
}
