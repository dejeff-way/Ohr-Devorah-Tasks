'use client';

import { useState } from 'react';
import { ChevronsUpDown, UserPlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import { User } from '@/types/task';

interface MultiSelectProps {
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function MultiSelect({ users, selectedIds, onChange, disabled }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));

  function toggleUser(userId: string) {
    onChange(
      selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId]
    );
  }

  function removeUser(userId: string) {
    onChange(selectedIds.filter((id) => id !== userId));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        {/*
          The chips used to live *inside* the trigger, which meant a <button>
          nested in a <button> — invalid markup, and it collapsed the trigger so
          `w-full` never took effect. Chips now sit underneath.
        */}
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="w-full justify-between font-medium"
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <UserPlus size={15} className="shrink-0 text-muted-foreground" />
            <span className={cn('truncate', selectedUsers.length === 0 && 'text-muted-foreground')}>
              {selectedUsers.length === 0
                ? 'Select staff…'
                : selectedUsers.length === 1
                  ? selectedUsers[0].name
                  : `${selectedUsers.length} people selected`}
            </span>
          </span>
          <ChevronsUpDown size={15} className="shrink-0 text-muted-foreground" />
        </PopoverTrigger>

        <PopoverContent
          className="w-(--anchor-width) min-w-56 p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search staff…" />
            <CommandList>
              <CommandEmpty>No staff found.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => {
                  const checked = selectedIds.includes(user.id);
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.name}
                      data-checked={checked}
                      onSelect={() => toggleUser(user.id)}
                    >
                      <UserAvatar name={user.name} size="xs" />
                      <span className="truncate">{user.name}</span>
                      <span className="ml-auto text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {user.role === 'admin' ? 'Admin' : 'Staff'}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <li key={u.id}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted py-1 pl-1 pr-1.5 text-xs font-semibold text-foreground">
                <UserAvatar name={u.name} size="xs" />
                {u.name}
                {!disabled && (
                  <button
                    type="button"
                    aria-label={`Remove ${u.name}`}
                    onClick={() => removeUser(u.id)}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
