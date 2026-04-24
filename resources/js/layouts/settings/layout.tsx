import { ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';

type SettingsLayoutProps = {
    children: ReactNode;
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const { url } = usePage();

    const links = [
        {
            name: 'Profile',
            href: '/settings/profile',
        },
        {
            name: 'Password',
            href: '/settings/password',
        },
    ];

    return (
        <div className="grid gap-8 md:grid-cols-[220px,1fr]">
            <aside className="space-y-2">
                <h2 className="text-sm font-semibold text-neutral-500">
                    Settings
                </h2>

                <nav className="mt-2 space-y-1">
                    {links.map((link) => {
                        const active = url.startsWith(link.href);

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={
                                    'block rounded-md px-3 py-2 text-sm ' +
                                    (active
                                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800')
                                }
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <section>{children}</section>
        </div>
    );
}
