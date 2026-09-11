import { statusConfig } from '@/lib/status';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  level: string | null | undefined;
  size?: 'sm' | 'md';
  /** Show the coloured dot in front of the label. */
  withDot?: boolean;
  className?: string;
}

export function StatusBadge({
  level,
  size = 'sm',
  withDot = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig(level);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        config.chip,
        className
      )}
    >
      {withDot && (
        <span className={cn('size-1.5 shrink-0 rounded-full', config.dot)} />
      )}
      {config.label}
    </span>
  );
}

export function OverdueBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-destructive/20 bg-destructive-soft px-2 py-0.5 text-[11px] font-semibold text-destructive',
        className
      )}
    >
      Overdue
    </span>
  );
}

export function MetaChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap',
        className
      )}
    >
      {children}
    </span>
  );
}
