'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Eye } from 'lucide-react';
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

interface UserSwitcherProps {
  users: User[];
  selectedUserId: string;
  onChange: (userId: string) => void;
}

export function UserSwitcher({ users, selectedUserId, onChange }: UserSwitcherProps) {
  const [open, setOpen] = useState(false);

  const selectedUser = selectedUserId === 'all' ? null : users.find((u) => u.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-slate-400 shrink-0" />
            <span className="text-sm">
              {selectedUser
                ? selectedUser.name
                : 'Viewing: All Staff'}
            </span>
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
              <CommandItem
                value="all-users"
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedUserId === 'all' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span>All Staff</span>
                <span className="ml-auto text-xs text-slate-400">
                  Global View
                </span>
              </CommandItem>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedUserId === user.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{user.name}</span>
                  <span className="ml-auto text-xs text-slate-400">
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
