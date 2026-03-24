'use client';

import { useState, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useFeedSearch } from '@/hooks/useFeedSearch';
import Link from 'next/link';
import type { FeedPost, SocialProfile } from '@/types/social';

export default function SearchBar() {
  const [query, setQuery]   = useState('');
  const [type, setType]     = useState<'posts' | 'traders'>('posts');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useFeedSearch(query, type);

  const clear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const showDropdown = focused && query.length >= 2;

  return (
    <div className="relative z-[120] isolate w-full max-w-sm">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search posts or traders…"
          className="h-11 w-full rounded-xl border-0 bg-transparent py-0 pl-9 pr-8 text-sm text-slate-900 shadow-none ring-0 transition-colors placeholder:text-slate-400 focus:bg-slate-50/80 focus:outline-none focus:ring-0 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-slate-800/40"
        />
        {query && (
          <button onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Type tabs */}
      {showDropdown && (
        <div className="absolute top-full z-[100] mt-2 w-full rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-0 cursor-pointer">
          {/* Tabs */}
          <div className="flex border-b border-slate-200/80 dark:border-slate-700/40">
            {(['posts', 'traders'] as const).map((t) => (
              <button
                key={t}
                onMouseDown={(e) => { e.preventDefault(); setType(t); }}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                  type === t
                    ? 'text-slate-900 dark:text-slate-100 border-b-2 border-slate-700 dark:border-slate-400'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800/40 dark:hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {isFetching ? (
              <div className="px-4 py-5 text-center text-sm text-slate-500">Searching…</div>
            ) : !data || data.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-slate-500">No results</div>
            ) : type === 'posts' ? (
              (data as FeedPost[]).map((post) => (
                <Link
                  key={post.id}
                  href={`/feed/post/${post.id}`}
                  className="flex flex-col gap-0.5 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-100/90 dark:border-slate-800/60 dark:hover:bg-slate-800/50 last:border-0"
                >
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{post.author.display_name}</p>
                  <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{post.content}</p>
                </Link>
              ))
            ) : (
              (data as SocialProfile[]).map((profile) => (
                <Link
                  key={profile.id}
                  href={`/profile/${profile.username}`}
                  className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-100/90 dark:border-slate-800/60 dark:hover:bg-slate-800/50 last:border-0"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-semibold shrink-0">
                    {profile.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full rounded-full object-cover" />
                      : String(profile.display_name ?? '?').slice(0, 1).toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{profile.display_name}</p>
                    <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
