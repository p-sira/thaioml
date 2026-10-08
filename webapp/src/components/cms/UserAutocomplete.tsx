'use client';

import { useState, useEffect, useId, useRef } from 'react';
import { X, Loader2, User as UserIcon } from 'lucide-react';
import { FormField } from '@/components/ui/FormField';

interface UserData {
  username: string;
  name: string;
  imageUrl?: string;
}

interface UserAutocompleteProps {
  label: string;
  value: string | string[];
  onChange: (val: string | string[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  placeholder?: string;
}

export default function UserAutocomplete({ label, value, onChange, disabled, multiple, placeholder }: UserAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // Parse value into array format for unified rendering
  const currentValues = Array.isArray(value) ? value : (value ? [value] : []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || !isOpen) {
      return;
    }

    const controller = new AbortController();
    
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?query=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    const timer = setTimeout(fetchUsers, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen]);

  const handleSelect = (username: string) => {
    if (multiple) {
      if (!currentValues.includes(username)) {
        onChange([...currentValues, username]);
      }
      setQuery('');
    } else {
      onChange(username);
      setQuery('');
      setIsOpen(false);
    }
  };

  const handleRemove = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    
    if (multiple) {
      onChange(currentValues.filter(u => u !== username));
    } else {
      onChange('');
    }
  };

  return (
    <FormField label={label} htmlFor={inputId} className="relative">
      <div ref={wrapperRef}>
      <div 
        className={`w-full min-h-[38px] p-1.5 border border-border rounded-md shadow-sm bg-background flex flex-wrap gap-1.5 items-center ${disabled ? 'bg-surface' : 'focus-within:ring-1 focus-within:ring-accent focus-within:border-accent'}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {currentValues.map(username => (
          <span key={username} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-surface text-accent border border-border">
            @{username}
            {!disabled && (
              <button type="button" aria-label={`Remove ${username}`} onClick={(e) => handleRemove(username, e)} className="text-foreground-muted hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        
        {(!disabled && (multiple || currentValues.length === 0)) && (
          <div className="flex-1 min-w-[120px] flex items-center px-1">
            <input
              id={inputId}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-foreground-muted"
              placeholder={currentValues.length === 0 ? placeholder : ''}
              disabled={disabled}
            />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute z-10 w-full mt-1 bg-background shadow-lg max-h-60 rounded-md py-1 text-base border border-border overflow-auto sm:text-sm">
          {results.length === 0 && !loading ? (
            <div className="relative cursor-default select-none py-2 px-4 text-foreground-muted">
              No users found.
            </div>
          ) : (
            results.map((user) => (
              <div
                key={user.username}
                onClick={() => handleSelect(user.username)}
                className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-surface flex items-center gap-3"
              >
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover bg-slate-200" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-foreground-muted">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-foreground truncate">{user.name}</span>
                  <span className="text-foreground-muted text-xs truncate">@{user.username}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </div>
    </FormField>
  );
}
