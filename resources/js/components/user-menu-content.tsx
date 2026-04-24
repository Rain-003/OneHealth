import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { router } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';

interface UserMenuContentProps {
  user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
  const cleanup = useMobileNavigation();

  const goSettings = () => {
    cleanup();
    router.visit('/settings'); // or '/settings/profile' if you want that page directly
  };

  const doLogout = () => {
    cleanup();
    router.post('/logout'); // POST /logout (Inertia)
  };

  return (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <UserInfo user={user} showEmail />
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <button
            type="button"
            className="block w-full text-left"
            onClick={goSettings}
          >
            <Settings className="mr-2" />
            Settings
          </button>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      <DropdownMenuItem asChild>
        <button
          type="button"
          className="block w-full text-left"
          onClick={doLogout}
        >
          <LogOut className="mr-2" />
          Log out
        </button>
      </DropdownMenuItem>
    </>
  );
}
