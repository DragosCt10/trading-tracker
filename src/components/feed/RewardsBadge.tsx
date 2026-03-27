'use client';

import { Award } from 'lucide-react';
import { getMilestoneById, getBadgeInlineStyle } from '@/constants/tradeMilestones';

interface RewardsBadgeProps {
  milestoneId: string;
}

export default function RewardsBadge({ milestoneId }: RewardsBadgeProps) {
  const milestone = getMilestoneById(milestoneId);
  if (!milestone) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 select-none border"
      style={getBadgeInlineStyle(milestoneId)}
    >
      <Award className="h-3 w-3 shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {milestone.badgeName}
      </span>
    </span>
  );
}
