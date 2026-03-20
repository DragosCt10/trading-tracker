'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AfterBreakEvenSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  triggerClassName: string;
  contentClassName?: string;
}

export function AfterBreakEvenSelect({
  value,
  onChange,
  triggerClassName,
  contentClassName,
}: AfterBreakEvenSelectProps) {
  return (
    <Select value={value ?? '__none__'} onValueChange={(v) => onChange(v === '__none__' ? null : v)}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Win or Lose at close" />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <SelectItem value="__none__">—</SelectItem>
        <SelectItem value="Win">Win</SelectItem>
        <SelectItem value="Lose">Lose</SelectItem>
      </SelectContent>
    </Select>
  );
}

