'use client';

import { useState } from 'react';
import { ChevronsUpDown, Eye, Users } from 'lucide-react';

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
import { User } from '@/types/task';

interface UserSwitcherProps {
  users: User[];
  selectedUserId: string;
  onChange: (userId: string) => void;
}

export function UserSwitcher({ users, selectedUserId, onChange }: UserSwitcherProps) {
  const [open, setOpen] = useState(false);

  const selectedUser =
    selectedUserId === 'all' ? null : users.find((u) => u.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-medium"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Eye size={15} className="shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selectedUser ? selectedUser.name : 'All staff'}
          </span>
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-(--anchor-width) min-w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search staff…" />
          <CommandList>
            <CommandEmpty>No staff found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all-users"
                data-checked={selectedUserId === 'all'}
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                }}
              >
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Users size={12} />
                </span>
                <span>All staff</span>
                <span className="ml-auto text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Everyone
                </span>
              </CommandItem>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  data-checked={selectedUserId === user.id}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                >
                  <UserAvatar name={user.name} size="xs" />
                  <span className="truncate">{user.name}</span>
                  <span className="ml-auto text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
