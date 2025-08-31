
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, ChevronRight, UserCircle, Users, Package, Box, Warehouse, History, Settings2, SwitchCamera } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function SettingsItem({ icon: Icon, title, description, onClick, children }: { icon: React.ElementType, title: string, description?: string, onClick?: () => void, children?: React.ReactNode }) {
    const content = (
        <>
            <div className="flex items-center gap-4">
                <Icon className="h-6 w-6 text-muted-foreground" />
                <div className="flex-1">
                    <p className="font-semibold">{title}</p>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
            </div>
            {children ? children : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
        </>
    );

    if (onClick) {
        return (
            <button onClick={onClick} className="w-full text-left p-4 rounded-lg hover:bg-muted transition-colors flex items-center justify-between">
                {content}
            </button>
        )
    }

    return (
        <div className="w-full p-4 flex items-center justify-between">
            {content}
        </div>
    )
}

function NavButton({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) {
    return (
        <Button
            variant="ghost"
            className="flex flex-col items-center justify-center gap-2 h-32 w-full rounded-lg shadow bg-card hover:bg-accent transition"
            asChild
        >
            <Link href={href}>
                <Icon className="h-6 w-6" />
                <span className="text-sm">{label}</span>
            </Link>
        </Button>
    )
}


export default function SettingsPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { user, isLoading: isAuthLoading, logout, toggleManagementMode } = useAuth();

    const isSenior = user?.userRole === 'junior' || user?.userRole === 'worker';

    if (isAuthLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>

            <Card>
                <CardContent className="p-2 divide-y flex">
                    <div className="flex-1 flex items-center justify-between p-2">
                        <span className="font-semibold">{t('language')}</span>
                        <LanguageSwitcher hasArrow />
                    </div>
                    <div className="flex-1 flex items-center justify-between p-2">
                        <span className="font-semibold">{t('toggle_theme')}</span>
                        <ThemeSwitcher hasArrow />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
