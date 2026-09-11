import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const compact = size === 'sm';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-subtle text-center',
        compact ? 'gap-1.5 px-4 py-8' : 'gap-3 px-6 py-14',
        className
      )}
    >
      {Icon && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-muted text-muted-foreground',
            compact ? 'size-9' : 'size-12'
          )}
        >
          <Icon size={compact ? 16 : 22} />
        </span>
      )}
      <p
        className={cn(
          'font-semibold text-foreground',
          compact ? 'text-xs' : 'text-sm'
        )}
      >
        {title}
      </p>
      {description && (
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className={compact ? 'mt-1' : 'mt-2'}>{action}</div>}
    </div>
  );
}
