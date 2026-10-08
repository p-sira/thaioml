'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  Link as LinkIcon,
  ExternalLink,
  Pencil,
  Unlink,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

interface LinkHoverPopupProps {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onEditLink: (href: string, pos: number) => void;
  editable?: boolean;
}

interface HoveredLinkInfo {
  href: string;
  text: string;
  pos: number;
  top: number;
  left: number;
  element: HTMLAnchorElement;
}

export default function LinkHoverPopup({
  editor,
  containerRef,
  onEditLink,
  editable = true,
}: LinkHoverPopupProps) {
  const [activeLink, setActiveLink] = useState<HoveredLinkInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const activeLinkElRef = useRef<HTMLAnchorElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const isMouseInsidePopupRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      if (!isMouseInsidePopupRef.current) {
        setActiveLink(null);
        activeLinkElRef.current = null;
      }
    }, 250);
  }, [clearHideTimeout]);

  const dismissImmediately = useCallback(() => {
    clearHideTimeout();
    setActiveLink(null);
    activeLinkElRef.current = null;
    isMouseInsidePopupRef.current = false;
  }, [clearHideTimeout]);

  const updatePopupPosition = useCallback(
    (linkEl: HTMLAnchorElement) => {
      if (!editor || !containerRef.current) return;

      const href = linkEl.getAttribute('href') || '';
      if (!href) {
        dismissImmediately();
        return;
      }

      const rect = linkEl.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // Check if link is visible within container scroll bounds
      if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) {
        dismissImmediately();
        return;
      }

      // Calculate ProseMirror position safely
      let pos = 0;
      try {
        const domPos = editor.view.posAtDOM(linkEl, 0);
        // Find safe position inside the link mark
        const testPos = Math.min(domPos + 1, editor.state.doc.content.size);
        const marks = editor.state.doc.resolve(testPos).marks();
        if (marks.some(m => m.type.name === 'link')) {
          pos = testPos;
        } else {
          pos = domPos;
        }
      } catch {
        pos = editor.state.selection.from;
      }

      const popupHeight = 44;
      const popupWidth = 320;

      // Vertical positioning: prefer right below the link, flip above if overflowing bottom
      let top = rect.bottom + 6;
      if (
        top + popupHeight > window.innerHeight &&
        rect.top - popupHeight - 6 > 0
      ) {
        top = rect.top - popupHeight - 6;
      }

      // Horizontal positioning: align left with link, clamp inside viewport margins
      let left = rect.left;
      if (left + popupWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popupWidth - 16);
      }
      if (left < 16) {
        left = 16;
      }

      setActiveLink({
        href,
        text: linkEl.textContent || '',
        pos,
        top,
        left,
        element: linkEl,
      });
    },
    [editor, containerRef, dismissImmediately]
  );

  // Monitor mouse movements and scrolling inside container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !editor) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Don't interrupt if mouse is inside the popup
      if (isMouseInsidePopupRef.current) return;

      const target = e.target as HTMLElement | null;
      const linkEl = target?.closest('a') as HTMLAnchorElement | null;

      if (linkEl && container.contains(linkEl)) {
        clearHideTimeout();
        if (activeLinkElRef.current === linkEl) {
          return;
        }
        activeLinkElRef.current = linkEl;
        updatePopupPosition(linkEl);
      } else {
        if (activeLinkElRef.current) {
          scheduleHide();
        }
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (popupRef.current?.contains(related)) return;
      scheduleHide();
    };

    const handleScroll = () => {
      if (activeLinkElRef.current) {
        updatePopupPosition(activeLinkElRef.current);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (popupRef.current?.contains(target)) return;
      if (target?.closest('a')) return;
      dismissImmediately();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissImmediately();
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      clearHideTimeout();
    };
  }, [
    containerRef,
    editor,
    clearHideTimeout,
    scheduleHide,
    dismissImmediately,
    updatePopupPosition,
  ]);

  if (!activeLink) return null;

  const isSnomed = activeLink.href.toLowerCase().startsWith('snomed:');
  const snomedId = isSnomed ? activeLink.href.replace(/^snomed:/i, '') : '';
  const isWebUrl =
    activeLink.href.startsWith('http://') ||
    activeLink.href.startsWith('https://') ||
    activeLink.href.startsWith('/');

  const externalUrl = isSnomed
    ? `https://browser.ihtsdotools.org/?perspective=full&conceptId1=${snomedId}`
    : activeLink.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeLink.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  const handleEdit = () => {
    const { href, pos } = activeLink;
    dismissImmediately();
    onEditLink(href, pos);
  };

  const handleRemove = () => {
    if (!editor) return;
    try {
      editor
        .chain()
        .setTextSelection(activeLink.pos)
        .extendMarkRange('link')
        .unsetLink()
        .focus()
        .run();
    } catch (err) {
      console.error('Failed to unlink mark:', err);
    }
    dismissImmediately();
  };

  return (
    <div
      ref={popupRef}
      style={{
        top: `${activeLink.top}px`,
        left: `${activeLink.left}px`,
      }}
      onMouseEnter={() => {
        isMouseInsidePopupRef.current = true;
        clearHideTimeout();
      }}
      onMouseLeave={e => {
        isMouseInsidePopupRef.current = false;
        const related = e.relatedTarget as HTMLElement | null;
        if (activeLinkElRef.current?.contains(related)) {
          return;
        }
        scheduleHide();
      }}
      className="fixed z-50 flex items-center gap-1.5 p-1.5 bg-surface border border-border rounded-lg shadow-xl text-foreground text-xs animate-in fade-in-0 zoom-in-95 duration-150 select-none max-w-fit"
    >
      {/* Target URL Preview Badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-background border border-border/80 rounded-md max-w-[210px] sm:max-w-[260px]">
        {isSnomed ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-mono text-accent hover:underline truncate transition-colors"
            title={`View SNOMED CT Concept ${snomedId} in browser`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-accent" />
            <span className="font-semibold shrink-0">SNOMED:</span>
            <span className="truncate">{snomedId}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-70 hover:opacity-100 ml-0.5" />
          </a>
        ) : (
          <a
            href={isWebUrl ? externalUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-[11px] font-mono truncate transition-colors ${
              isWebUrl
                ? 'text-foreground hover:text-accent hover:underline'
                : 'text-foreground'
            }`}
            title={`Open ${activeLink.href}`}
          >
            <LinkIcon className="w-3 h-3 shrink-0 text-foreground-muted" />
            <span className="truncate">{activeLink.href}</span>
            {isWebUrl && (
              <ExternalLink className="w-3 h-3 shrink-0 text-foreground-muted hover:text-accent ml-0.5" />
            )}
          </a>
        )}
      </div>

      {/* Copy Link Button */}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-border/60 transition"
        title={copied ? 'Copied to clipboard!' : 'Copy URL'}
        aria-label="Copy URL"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>

      {editable && (
        <>
          <div className="w-px h-4 bg-border my-auto mx-0.5" />

          {/* Edit Action */}
          <button
            type="button"
            onClick={handleEdit}
            className="px-2 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-border/60 transition flex items-center gap-1 font-medium"
            title="Edit link URL"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Remove Action */}
          <button
            type="button"
            onClick={handleRemove}
            className="px-2 py-1 rounded-md text-foreground-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition flex items-center gap-1 font-medium"
            title="Remove link"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        </>
      )}
    </div>
  );
}
