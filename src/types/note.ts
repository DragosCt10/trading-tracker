export interface Note {
  id: string;
  user_id: string;
  strategy_id: string | null;
  title: string;
  content: string; // Markdown content
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  tags?: string[];
  // Joined data (optional, when fetched with strategy)
  strategy?: {
    id: string;
    name: string;
    slug: string;
  };
}
