import type { ExtraCardKey } from '@/constants/extraCards';

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  extra_cards: ExtraCardKey[];
}
