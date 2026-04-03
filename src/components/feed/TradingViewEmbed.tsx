'use client';

import { memo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, BarChart3 } from 'lucide-react';
import {
  extractTradingViewUrls,
  resolveTradingViewImageUrl,
  type TradingViewLink,
} from '@/utils/tradingViewUrl';

interface TradingViewEmbedProps {
  content: string;
}

function TradingViewEmbedComponent({ content }: TradingViewEmbedProps) {
  const links = extractTradingViewUrls(content);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((id: string) => {
    setFailedImages((prev) => new Set(prev).add(id));
  }, []);

  if (links.length === 0) return null;

  // Separate resolvable images from link-only cards
  const imageLinks = links.filter(
    (l) => resolveTradingViewImageUrl(l) !== null && !failedImages.has(l.id),
  );
  const ideaLinks = links.filter((l) => resolveTradingViewImageUrl(l) === null);

  // Nothing to render if all images failed and no idea links
  if (imageLinks.length === 0 && ideaLinks.length === 0) return null;

  const currentImage = imageLinks[activeIndex] ?? null;
  const currentImageUrl = currentImage ? resolveTradingViewImageUrl(currentImage) : null;

  return (
    <div className="mt-3 space-y-3">
      {/* Snapshot image carousel */}
      {imageLinks.length > 0 && currentImageUrl && (
        <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 overflow-hidden">
          {/* TradingView label */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200/70 dark:border-slate-700/40">
            <BarChart3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
              TradingView Chart
            </span>
          </div>

          {/* Image area */}
          <div className="relative group h-52 overflow-hidden">
            <a
              href={currentImage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImageUrl}
                alt={`TradingView chart ${activeIndex + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={() => handleImageError(currentImage.id)}
              />
            </a>

            {/* Counter */}
            {imageLinks.length > 1 && (
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium select-none">
                {activeIndex + 1}/{imageLinks.length}
              </span>
            )}

            {/* Navigation arrows */}
            {imageLinks.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(0, i - 1));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white disabled:opacity-30"
                  disabled={activeIndex === 0}
                  aria-label="Previous chart"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(imageLinks.length - 1, i + 1));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white disabled:opacity-30"
                  disabled={activeIndex === imageLinks.length - 1}
                  aria-label="Next chart"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Idea link cards (no client-derivable image) */}
      {ideaLinks.map((link) => (
        <IdeaLinkCard key={link.id} link={link} />
      ))}
    </div>
  );
}

/** Styled link card for chart ideas / published ideas without a derivable image. */
function IdeaLinkCard({ link }: { link: TradingViewLink }) {
  const label =
    link.type === 'chart_idea' && link.symbol
      ? `TradingView Idea — ${link.symbol}`
      : 'TradingView Idea';

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-slate-300/40 dark:border-slate-700/55 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
        <BarChart3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
          {label}
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
          {link.url}
        </span>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
    </a>
  );
}

const TradingViewEmbed = memo(TradingViewEmbedComponent);
export default TradingViewEmbed;
