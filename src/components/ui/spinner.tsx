import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
} as const;

export function Spinner({
  size = 'md',
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-border border-t-secondary',
        SIZES[size],
        className
      )}
    />
  );
}

/**
 * The four route files each hand-rolled their own spinner markup. They all use
 * this now, so loading states are identical everywhere.
 */
export function PageLoader({
  label = 'Loading',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[50vh] flex-col items-center justify-center gap-3',
        className
      )}
    >
      <Spinner size="lg" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
