import { cn } from '@/lib/utils';

/**
 * A small, deterministic initials avatar.
 *
 * Every avatar in the app used to be a red or grey circle, which made lists of
 * people impossible to scan. The tone is derived from the name, so the same
 * person keeps the same colour everywhere without storing anything.
 */

const TONES = [
  'bg-[#fdecee] text-[#a2101f]',
  'bg-[#ebe9fb] text-[#2a1aae]',
  'bg-[#e2f6ef] text-[#0a6b4c]',
  'bg-[#fdf3e0] text-[#8a5400]',
  'bg-[#e0fbf9] text-[#0a6f69]',
  'bg-[#eef1f7] text-[#41506a]',
] as const;

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-11 text-base',
} as const;

export type UserAvatarSize = keyof typeof SIZES;

function toneFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return TONES[Math.abs(hash) % TONES.length];
}

export function initials(name?: string | null) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

interface UserAvatarProps {
  name?: string | null;
  size?: UserAvatarSize;
  /** Force the brand treatment instead of the derived tone. */
  tone?: 'derived' | 'primary' | 'secondary';
  className?: string;
  title?: string;
}

export function UserAvatar({
  name,
  size = 'md',
  tone = 'derived',
  className,
  title,
}: UserAvatarProps) {
  const toneClass =
    tone === 'primary'
      ? 'bg-primary text-primary-foreground'
      : tone === 'secondary'
        ? 'bg-secondary text-secondary-foreground'
        : toneFor(name ?? '?');

  return (
    <span
      title={title ?? name ?? undefined}
      aria-hidden={title ? undefined : true}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none',
        SIZES[size],
        toneClass,
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping stack of avatars with a "+N" overflow chip. */
export function AvatarStack({
  names,
  max = 3,
  size = 'xs',
  className,
}: {
  names: string[];
  max?: number;
  size?: UserAvatarSize;
  className?: string;
}) {
  if (names.length === 0) return null;
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;

  return (
    <div className={cn('flex -space-x-1.5', className)}>
      {shown.map((name, i) => (
        <UserAvatar
          key={`${name}-${i}`}
          name={name}
          size={size}
          title={name}
          className="ring-2 ring-card"
        />
      ))}
      {overflow > 0 && (
        <span
          title={names.slice(max).join(', ')}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold leading-none text-muted-foreground ring-2 ring-card',
            SIZES[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
