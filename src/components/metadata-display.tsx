'use client';

import { CheckCircle2, FileText, Hash, XCircle } from 'lucide-react';

import { MetadataEntry } from '@/types/task';
import { cn } from '@/lib/utils';

interface MetadataDisplayProps {
  entries: MetadataEntry[];
  compact?: boolean;
  className?: string;
}

function iconFor(entry: MetadataEntry) {
  if (typeof entry.value === 'boolean') return entry.value ? CheckCircle2 : XCircle;
  if (typeof entry.value === 'number') return Hash;
  return FileText;
}

function displayValue(entry: MetadataEntry): string {
  if (typeof entry.value === 'boolean') return entry.value ? 'Yes' : 'No';
  return String(entry.value);
}

/**
 * Tones come from the shared status scale rather than raw palette classes, so
 * metadata pills sit in the same colour world as the rest of the board.
 */
function toneFor(entry: MetadataEntry): string {
  if (typeof entry.value === 'boolean') {
    return entry.value
      ? 'border-status-done/20 bg-status-done-soft text-status-done-fg'
      : 'border-border bg-muted text-muted-foreground';
  }
  if (typeof entry.value === 'number') {
    return 'border-status-progress/20 bg-status-progress-soft text-status-progress-fg';
  }
  return 'border-border bg-muted text-foreground';
}

export function MetadataDisplay({ entries, compact = false, className }: MetadataDisplayProps) {
  if (!entries || entries.length === 0) return null;

  if (compact) {
    return (
      <ul className={cn('flex flex-wrap gap-1.5', className)}>
        {entries.map((entry, i) => {
          const Icon = iconFor(entry);
          return (
            <li
              key={`${entry.key}-${i}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold',
                toneFor(entry)
              )}
            >
              <Icon size={11} className="shrink-0 opacity-70" />
              <span className="opacity-70">{entry.key}</span>
              <span className="opacity-40">·</span>
              <span>{displayValue(entry)}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <dl className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
      {entries.map((entry, i) => {
        const Icon = iconFor(entry);
        return (
          <div
            key={`${entry.key}-${i}`}
            className={cn('flex items-start gap-2.5 rounded-lg border p-3', toneFor(entry))}
          >
            <Icon size={15} className="mt-0.5 shrink-0 opacity-60" />
            <div className="min-w-0">
              <dt className="text-[0.7rem] font-bold uppercase tracking-[0.08em] opacity-60">
                {entry.key}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold break-words">
                {displayValue(entry)}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
