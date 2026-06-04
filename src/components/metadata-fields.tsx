'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetadataEntry } from '@/types/task';

interface MetadataFieldsProps {
  entries: MetadataEntry[];
  onChange: (entries: MetadataEntry[]) => void;
  disabled?: boolean;
}

/**
 * Converts a raw JS value to one of the three supported storage types
 * so the value always round-trips cleanly through JSON.
 */
function normalizeValue(raw: string, type: 'string' | 'number' | 'boolean'): string | number | boolean {
  if (type === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? 0 : n;
  }
  if (type === 'boolean') return raw === 'true' || raw === '1';
  return raw;
}

/** Pretty-print a stored value for the input field so booleans/numbers round-trip */
function valueToString(v: string | number | boolean): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

export function MetadataFields({ entries, onChange, disabled }: MetadataFieldsProps) {
  function updateEntry(index: number, field: 'key' | 'value' | 'type', newVal: string) {
    const updated = entries.map((entry, i) => {
      if (i !== index) return entry;
      if (field === 'key') return { ...entry, key: newVal };
      if (field === 'type') {
        const normalized = normalizeValue(valueToString(entry.value), newVal as 'string' | 'number' | 'boolean');
        return { ...entry, value: normalized };
      }
      // Infer type from current value to normalize
      const currentType = typeof entry.value;
      if (currentType === 'boolean') {
        return { ...entry, value: newVal === 'true' };
      }
      if (currentType === 'number') {
        const n = Number(newVal);
        return { ...entry, value: Number.isNaN(n) ? 0 : n };
      }
      return { ...entry, value: newVal };
    });
    onChange(updated);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function addEntry() {
    onChange([...entries, { key: '', value: '' }]);
  }

  function getValueType(v: string | number | boolean): string {
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'number') return 'number';
    return 'string';
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Layers size={14} />
          Custom Attributes
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          disabled={disabled}
          className="h-7 gap-1 text-xs border-slate-300"
        >
          <Plus size={12} />
          Add Attribute
        </Button>
      </div>

      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-5 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <Layers size={20} className="text-slate-300 mb-1" />
          <p className="text-xs text-slate-400">No custom attributes yet</p>
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const type = getValueType(entry.value);
          return (
            <div
              key={index}
              className="group flex items-start gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
            >
              {/* Key input */}
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Attribute
                </label>
                <Input
                  value={entry.key}
                  onChange={(e) => updateEntry(index, 'key', e.target.value)}
                  placeholder="e.g. Category, Quantity, Room..."
                  disabled={disabled}
                  className="h-8 text-sm border-slate-200 focus:border-slate-900"
                />
              </div>

              {/* Type selector */}
              <div className="w-24 shrink-0 mt-[18px]">
                <Select
                  value={type}
                  onValueChange={(v) => {
                    if (v) updateEntry(index, 'type', v);
                  }}
                >
                  <SelectTrigger className="h-8 border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Yes/No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Value input */}
              <div className="flex-[1.5] min-w-0">
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Value
                </label>
                {type === 'boolean' ? (
                  <Select
                    value={valueToString(entry.value)}
                    onValueChange={(v) => {
                      if (v) updateEntry(index, 'value', v);
                    }}
                  >
                    <SelectTrigger className="h-8 border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={valueToString(entry.value)}
                    onChange={(e) => updateEntry(index, 'value', e.target.value)}
                    placeholder={type === 'number' ? '0' : 'Value...'}
                    type={type === 'number' ? 'number' : 'text'}
                    disabled={disabled}
                    className="h-8 text-sm border-slate-200 focus:border-slate-900"
                  />
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeEntry(index)}
                disabled={disabled}
                className="mt-[18px] flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Remove attribute"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {entries.length > 0 && (
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Custom attributes allow you to store task-specific data like categories, quantities, or operational parameters — no database schema changes needed.
        </p>
      )}
    </div>
  );
}
