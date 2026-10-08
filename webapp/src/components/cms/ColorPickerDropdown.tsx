'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Highlighter,
  Baseline,
  Check,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { HighlightColor } from './extensions/HighlightMark';
import { TextColor } from './extensions/TextColorMark';

export interface ColorOption<T extends string> {
  id: T;
  label: string;
  swatchClass: string;
  previewClass?: string;
}

export const HIGHLIGHT_OPTIONS: ColorOption<HighlightColor>[] = [
  {
    id: 'amber',
    label: 'Yellow / Amber',
    swatchClass: 'bg-amber-400 border-amber-500/40',
  },
  {
    id: 'emerald',
    label: 'Green / Emerald',
    swatchClass: 'bg-emerald-400 border-emerald-500/40',
  },
  {
    id: 'sky',
    label: 'Blue / Sky',
    swatchClass: 'bg-sky-400 border-sky-500/40',
  },
  {
    id: 'purple',
    label: 'Purple',
    swatchClass: 'bg-purple-400 border-purple-500/40',
  },
  {
    id: 'rose',
    label: 'Red / Rose',
    swatchClass: 'bg-rose-400 border-rose-500/40',
  },
  {
    id: 'accent',
    label: 'Theme Accent',
    swatchClass: 'bg-accent border-accent/40',
  },
];

export const TEXT_COLOR_OPTIONS: ColorOption<TextColor>[] = [
  {
    id: 'default',
    label: 'Default',
    swatchClass: 'bg-foreground border-border',
    previewClass: 'text-foreground',
  },
  {
    id: 'muted',
    label: 'Muted Gray',
    swatchClass: 'bg-foreground-muted border-border',
    previewClass: 'text-foreground-muted',
  },
  {
    id: 'accent',
    label: 'Theme Accent',
    swatchClass: 'bg-accent border-accent/40',
    previewClass: 'text-accent',
  },
  {
    id: 'blue',
    label: 'Blue',
    swatchClass: 'bg-sky-500 border-sky-600/40',
    previewClass: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'green',
    label: 'Green',
    swatchClass: 'bg-emerald-500 border-emerald-600/40',
    previewClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'amber',
    label: 'Amber',
    swatchClass: 'bg-amber-500 border-amber-600/40',
    previewClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'red',
    label: 'Red',
    swatchClass: 'bg-rose-500 border-rose-600/40',
    previewClass: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'purple',
    label: 'Purple',
    swatchClass: 'bg-purple-500 border-purple-600/40',
    previewClass: 'text-purple-600 dark:text-purple-400',
  },
];

interface HighlightPickerProps {
  currentColor?: string | null;
  onSelect: (color: HighlightColor) => void;
  onClear: () => void;
  compact?: boolean;
}

export function HighlightPickerDropdown({
  currentColor,
  onSelect,
  onClear,
  compact = false,
}: HighlightPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeOption = HIGHLIGHT_OPTIONS.find(o => o.id === currentColor);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`p-1.5 rounded transition flex items-center gap-0.5 ${
          currentColor
            ? 'bg-border text-foreground-strong'
            : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
        } ${compact ? 'text-xs' : 'text-xs'}`}
        title="Highlight Color (Adapts with theme)"
        aria-label="Highlight Color"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Highlighter className="w-3.5 h-3.5" />
        <span
          className={`w-2 h-2 rounded-full border border-border/80 ${
            activeOption ? activeOption.swatchClass : 'bg-transparent'
          }`}
        />
        {!compact && <ChevronDown className="w-2.5 h-2.5 opacity-60" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 p-2.5 bg-surface border border-border rounded-xl shadow-xl w-48 text-foreground animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="text-[11px] font-semibold text-foreground-muted mb-2 px-1 flex items-center justify-between">
            <span>Adaptive Highlight</span>
            {currentColor && (
              <span className="text-[10px] text-accent font-normal capitalize">
                {currentColor}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {HIGHLIGHT_OPTIONS.map(option => {
              const isSelected = currentColor === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option.id);
                    setIsOpen(false);
                  }}
                  className={`relative flex flex-col items-center justify-center p-2 rounded-lg border transition hover:scale-105 ${
                    isSelected
                      ? 'border-accent ring-2 ring-accent/20 bg-background'
                      : 'border-border/60 hover:border-border hover:bg-background/60'
                  }`}
                  title={option.label}
                >
                  <span
                    className={`w-4 h-4 rounded-full border shadow-2xs ${option.swatchClass}`}
                  />
                  <span className="text-[10px] mt-1 text-foreground-muted truncate w-full text-center">
                    {option.id}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 text-accent">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onClear();
              setIsOpen(false);
            }}
            className="w-full py-1 px-2 text-[11px] font-medium text-foreground-muted hover:text-foreground hover:bg-border/60 rounded-md transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Remove highlight</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface TextColorPickerProps {
  currentColor?: string | null;
  onSelect: (color: TextColor) => void;
  onClear: () => void;
  compact?: boolean;
}

export function TextColorPickerDropdown({
  currentColor,
  onSelect,
  onClear,
  compact = false,
}: TextColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeOption = TEXT_COLOR_OPTIONS.find(
    o => o.id === (currentColor || 'default')
  );

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`p-1.5 rounded transition flex items-center gap-0.5 ${
          currentColor && currentColor !== 'default'
            ? 'bg-border text-foreground-strong'
            : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
        } ${compact ? 'text-xs' : 'text-xs'}`}
        title="Text Color (Adapts with theme)"
        aria-label="Text Color"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Baseline className="w-3.5 h-3.5" />
        <span
          className={`w-2 h-2 rounded-full border border-border/80 ${
            activeOption ? activeOption.swatchClass : 'bg-foreground'
          }`}
        />
        {!compact && <ChevronDown className="w-2.5 h-2.5 opacity-60" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 p-2.5 bg-surface border border-border rounded-xl shadow-xl w-52 text-foreground animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="text-[11px] font-semibold text-foreground-muted mb-2 px-1 flex items-center justify-between">
            <span>Adaptive Text Color</span>
            {currentColor && currentColor !== 'default' && (
              <span className="text-[10px] text-accent font-normal capitalize">
                {currentColor}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {TEXT_COLOR_OPTIONS.map(option => {
              const isSelected =
                (currentColor || 'default') === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option.id);
                    setIsOpen(false);
                  }}
                  className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border transition hover:scale-105 ${
                    isSelected
                      ? 'border-accent ring-2 ring-accent/20 bg-background'
                      : 'border-border/60 hover:border-border hover:bg-background/60'
                  }`}
                  title={option.label}
                >
                  <span
                    className={`w-4 h-4 rounded-full border shadow-2xs ${option.swatchClass}`}
                  />
                  <span
                    className={`text-[10px] mt-1 font-semibold truncate ${
                      option.previewClass || 'text-foreground'
                    }`}
                  >
                    A
                  </span>
                  {isSelected && (
                    <span className="absolute top-0.5 right-0.5 text-accent">
                      <Check className="w-2 h-2" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onClear();
              setIsOpen(false);
            }}
            className="w-full py-1 px-2 text-[11px] font-medium text-foreground-muted hover:text-foreground hover:bg-border/60 rounded-md transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset text color</span>
          </button>
        </div>
      )}
    </div>
  );
}
