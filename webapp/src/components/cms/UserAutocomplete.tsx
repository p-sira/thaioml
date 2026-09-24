'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, User as UserIcon } from 'lucide-react';

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
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
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      
      <div 
        className={`w-full min-h-[38px] p-1.5 border border-slate-300 rounded-md shadow-sm bg-white flex flex-wrap gap-1.5 items-center ${disabled ? 'bg-slate-100' : 'focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500'}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {currentValues.map(username => (
          <span key={username} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            @{username}
            {!disabled && (
              <button type="button" onClick={(e) => handleRemove(username, e)} className="text-blue-400 hover:text-blue-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        
        {(!disabled && (multiple || currentValues.length === 0)) && (
          <div className="flex-1 min-w-[120px] flex items-center px-1">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={currentValues.length === 0 ? placeholder : ''}
              disabled={disabled}
            />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm">
          {results.length === 0 && !loading ? (
            <div className="relative cursor-default select-none py-2 px-4 text-slate-500">
              No users found.
            </div>
          ) : (
            results.map((user) => (
              <div
                key={user.username}
                onClick={() => handleSelect(user.username)}
                className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-slate-50 flex items-center gap-3"
              >
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover bg-slate-200" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900 truncate">{user.name}</span>
                  <span className="text-slate-500 text-xs truncate">@{user.username}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
