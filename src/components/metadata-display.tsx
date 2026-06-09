'use client';

import { Layers, Hash, CheckCircle, XCircle, FileText } from 'lucide-react';
import { MetadataEntry } from '@/types/task';
import { cn } from '@/lib/utils';

interface MetadataDisplayProps {
  entries: MetadataEntry[];
  compact?: boolean;
  className?: string;
}

const typeIcons = {
  string: FileText,
  number: Hash,
  boolean: CheckCircle,
};

function getType(v: string | number | boolean): 'string' | 'number' | 'boolean' {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  return 'string';
}

function displayValue(entry: MetadataEntry): string {
  if (typeof entry.value === 'boolean') {
    return entry.value ? 'Yes' : 'No';
  }
  return String(entry.value);
}

function valueColor(entry: MetadataEntry): string {
  if (typeof entry.value === 'boolean') {
    return entry.value
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-background text-muted-foreground border-border';
  }
  if (typeof entry.value === 'number') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return 'bg-background text-secondary border-border';
}

export function MetadataDisplay({ entries, compact = false, className }: MetadataDisplayProps) {
  if (!entries || entries.length === 0) return null;

  // Compact mode: render as inline pills
  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-1.5', className)}>
        {entries.map((entry, i) => {
          const Icon = typeIcons[getType(entry.value)];
          return (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                valueColor(entry)
              )}
            >
              <Icon size={10} />
              <span className="opacity-60">{entry.key}:</span>
              <span>{displayValue(entry)}</span>
            </span>
          );
        })}
      </div>
    );
  }

  // Full mode: render as a grid of labeled cards
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2', className)}>
      {entries.map((entry, i) => {
        const Icon = typeIcons[getType(entry.value)];
        return (
          <div
            key={i}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border p-3',
              valueColor(entry)
            )}
          >
            <Icon size={14} className="shrink-0 mt-0.5 opacity-60" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
                {entry.key}
              </p>
              <p className="text-sm font-medium mt-0.5 break-words">
                {displayValue(entry)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
