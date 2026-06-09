'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
    const newIds = selectedIds.includes(userId)
      ? selectedIds.filter((id) => id !== userId)
      : [...selectedIds, userId];
    onChange(newIds);
  }

  function removeUser(userId: string) {
    onChange(selectedIds.filter((id) => id !== userId));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between h-auto min-h-10 px-3 py-2 border-border hover:bg-background"
          >
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.length === 0 ? (
                <span className="text-sm text-muted-foreground">Select assignees...</span>
              ) : (
                selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-secondary-foreground border border-border"
                  >
                    {u.name}
                    {!disabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUser(u.id);
                        }}
                        className="hover:text-foreground"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search staff..." />
          <CommandList>
            <CommandEmpty>No staff found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => toggleUser(user.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedIds.includes(user.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{user.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {user.role === 'admin' ? 'Admin' : 'Staff'}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
