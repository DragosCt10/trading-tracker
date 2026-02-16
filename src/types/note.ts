export interface Note {
  id: string;
  user_id: string;
  strategy_id: string | null; // Keep for backward compatibility
  strategy_ids?: string[]; // Array of strategy IDs for multiple strategies
  title: string;
  content: string; // Markdown content
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  tags?: string[];
  // Joined data (optional, when fetched with strategy/strategies)
  strategy?: {
    id: string;
    name: string;
    slug: string;
  };
  strategies?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}
