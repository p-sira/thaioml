'use client';

import { useState } from 'react';
import { citationErrors, numberReferences, referenceErrors, type ArticleReference } from '@/lib/citations';

interface ReferencesPanelProps {
  value: unknown;
  groups: string[][];
  editable: boolean;
  onChange: (value: unknown) => void;
  onInsert: (ids: string[]) => void;
  editingIds: string[] | null;
  onCancelEdit: () => void;
}

export default function ReferencesPanel({ value, groups, editable, onChange, onInsert, editingIds, onCancelEdit }: ReferencesPanelProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [id, setId] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [repair, setRepair] = useState<string | null>(null);
  const references: ArticleReference[] = Array.isArray(value) && value.every(item => item && typeof item === 'object' && typeof item.id === 'string') ? value : [];
  const errors = citationErrors(value, groups);
  const used = new Set(groups.flat());
  const numbers = numberReferences(references, groups);
  const chosen = editingIds ?? selected;
  const [editingSelection, setEditingSelection] = useState<string[] | null>(null);
  const activeSelection = editingSelection ?? chosen;
  const inputClass = 'w-full rounded border border-border bg-background p-2 text-sm';

  function update(index: number, changes: Partial<ArticleReference>) {
    const next = [...(value as ArticleReference[])];
    next[index] = { ...next[index], ...changes };
    if (!next[index].url) delete next[index].url;
    onChange(next);
  }

  function add() {
    const entry: ArticleReference = { id: id.trim(), text: text.trim(), ...(url.trim() ? { url: url.trim() } : {}) };
    const next = [...(Array.isArray(value) ? value : []), entry];
    const issues = referenceErrors(next);
    if (issues.length) { setFormError(issues.join(' ')); return; }
    onChange(next);
    setId(''); setText(''); setUrl(''); setFormError('');
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
      <p>Enter complete Vancouver references. Numbers follow first citation; uncited sources appear last.</p>
      {errors.length > 0 && <div role="alert" className="text-red-600"><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
      <fieldset disabled={!editable} className="space-y-4">
        {references.map((reference, index) => (
          <div key={`${reference.id}-${index}`} className="space-y-2 border-b border-border pb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={activeSelection.includes(reference.id)} onChange={event => {
                const next = event.target.checked ? [...activeSelection, reference.id] : activeSelection.filter(key => key !== reference.id);
                if (editingIds) setEditingSelection(next); else setSelected(next);
              }} />
              <span>{numbers.get(reference.id)}. {reference.id}{!used.has(reference.id) && ' (uncited)'}</span>
            </label>
            <label className="block">Reference text
              <textarea className={inputClass} value={typeof reference.text === 'string' ? reference.text : ''} onChange={event => update(index, { text: event.target.value })} />
            </label>
            <label className="block">Source URL (optional)
              <input className={inputClass} value={typeof reference.url === 'string' ? reference.url : ''} onChange={event => update(index, { url: event.target.value })} />
            </label>
            <button type="button" disabled={used.has(reference.id)} title={used.has(reference.id) ? 'Remove this source from all citations before deleting it.' : undefined} className="underline disabled:opacity-50" onClick={() => {
              onChange((value as ArticleReference[]).filter((_, entryIndex) => entryIndex !== index));
              setSelected(selected.filter(key => key !== reference.id));
            }}>Delete {reference.id}</button>
          </div>
        ))}
        <button type="button" className="rounded border border-border p-2 disabled:opacity-50" disabled={!activeSelection.length || activeSelection.some(key => !references.some(reference => reference.id === key))} onClick={() => {
          onInsert(activeSelection);
          setSelected([]); setEditingSelection(null);
        }}>{editingIds ? 'Update citation' : 'Insert citation'}</button>
        {editingIds && <button type="button" className="ml-2 underline" onClick={() => { setEditingSelection(null); onCancelEdit(); }}>Cancel editing</button>}
        <div className="space-y-2">
          <h3 className="font-semibold">Add reference</h3>
          <label className="block">Reference ID<input className={inputClass} value={id} onChange={event => setId(event.target.value)} placeholder="ada-2026" /></label>
          <label className="block">New reference text<textarea className={inputClass} value={text} onChange={event => setText(event.target.value)} /></label>
          <label className="block">New source URL (optional)<input className={inputClass} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://doi.org/..." /></label>
          {formError && <p role="alert">{formError}</p>}
          <button type="button" className="rounded border border-border p-2" onClick={add}>Add reference</button>
        </div>
        {errors.length > 0 && <details>
          <summary>Repair reference data</summary>
          <p>Correct malformed entries or duplicate IDs below. Keep IDs used by existing citations.</p>
          <textarea aria-label="Reference data JSON" className={inputClass} value={repair ?? JSON.stringify(value ?? [], null, 2)} onChange={event => setRepair(event.target.value)} />
          <button type="button" onClick={() => {
            try { onChange(JSON.parse(repair ?? JSON.stringify(value ?? []))); setRepair(null); setFormError(''); }
            catch { setFormError('Reference data must be valid JSON.'); }
          }}>Apply repaired data</button>
        </details>}
      </fieldset>
    </div>
  );
}
