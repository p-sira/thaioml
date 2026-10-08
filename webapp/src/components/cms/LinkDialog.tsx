'use client';

import { useState, useEffect, useRef } from 'react';
import { Link as LinkIcon, Unlink, X, Sparkles, Globe } from 'lucide-react';

interface LinkDialogProps {
  isOpen: boolean;
  initialUrl?: string;
  selectedText?: string;
  onSave: (url: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export default function LinkDialog({
  isOpen,
  initialUrl = '',
  selectedText = '',
  onSave,
  onRemove,
  onClose,
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      if (onRemove) {
        onRemove();
      } else {
        onClose();
      }
      return;
    }

    let finalUrl = trimmed;
    // Prepend https:// if missing scheme and not relative or anchor
    if (
      !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(finalUrl) &&
      !finalUrl.startsWith('/') &&
      !finalUrl.startsWith('#')
    ) {
      finalUrl = `https://${finalUrl}`;
    }

    onSave(finalUrl);
  };

  const isSnomed = url.trim().toLowerCase().startsWith('snomed:');
  const isEditing = Boolean(initialUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-2xs animate-in fade-in-0 duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
              <LinkIcon className="w-4 h-4" />
            </div>
            <h3
              id="link-dialog-title"
              className="text-sm font-semibold text-foreground-strong"
            >
              {isEditing ? 'Edit Link' : 'Insert Link'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-border/60 transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {selectedText && (
            <div className="text-xs text-foreground-muted flex items-center gap-1.5 truncate">
              <span className="font-medium text-foreground shrink-0">Selected text:</span>
              <span className="italic truncate font-sans text-foreground">
                &ldquo;{selectedText}&rdquo;
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="link-url-input"
                className="text-xs font-medium text-foreground"
              >
                Destination URL
              </label>
              {isSnomed ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  SNOMED CT Concept
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-foreground-muted">
                  <Globe className="w-2.5 h-2.5" />
                  Web URL
                </span>
              )}
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                id="link-url-input"
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com or snomed:38341003"
                className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition font-mono"
              />
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Accepts standard web URLs (<span className="font-mono">https://</span>) or medical entities (<span className="font-mono">snomed:ID</span>).
            </p>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-foreground-muted">Quick prefix:</span>
            <button
              type="button"
              onClick={() => {
                const cleaned = url.replace(/^(https?:\/\/|snomed:)/i, '');
                setUrl('https://' + cleaned);
                inputRef.current?.focus();
              }}
              className="text-[10px] px-2 py-0.5 rounded-md bg-border/40 hover:bg-border text-foreground-muted hover:text-foreground transition font-mono"
            >
              https://
            </button>
            <button
              type="button"
              onClick={() => {
                const cleaned = url.replace(/^(https?:\/\/|snomed:)/i, '');
                setUrl('snomed:' + cleaned);
                inputRef.current?.focus();
              }}
              className="text-[10px] px-2 py-0.5 rounded-md bg-border/40 hover:bg-border text-foreground-muted hover:text-foreground transition font-mono"
            >
              snomed:
            </button>
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {isEditing && onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition flex items-center gap-1.5"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Remove Link</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-border/60 rounded-md transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 rounded-md shadow-xs transition"
              >
                {isEditing ? 'Save Changes' : 'Insert Link'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
