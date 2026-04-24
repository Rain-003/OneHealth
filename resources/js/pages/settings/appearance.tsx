import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Head } from '@inertiajs/react';

const breadcrumbs = [
  {
    title: 'Appearance settings',
    href: '/settings/appearance',
  },
];

export default function Appearance() {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Appearance settings" />

      <SettingsLayout>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Customize how your dashboard looks. (Appearance settings page placeholder.)
          </p>
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
