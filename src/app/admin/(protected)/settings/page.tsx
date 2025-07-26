
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, SessionRole, Session, ViewMode } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Hourglass, Trash2, User, UserCheck, Settings2, Monitor, LogOut, Eye, EyeOff, Smartphone, ShieldAlert, Archive, Edit, History, ListCollapse, ChevronRight, Package, Box, Languages, Palette, UserCircle, Devices, LayoutTemplate } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


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

function NavButton({ icon: Icon, title, href }: { icon: React.ElementType, title: string, href: string }) {
    return (
        <Link href={href} className="flex flex-col items-center justify-center gap-2 rounded-lg p-4 text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80 aspect-square text-center">
            <Icon className="h-8 w-8" />
            <span>{title}</span>
        </Link>
    )
}

function ViewModeSwitcher({ viewMode, setViewMode }: { viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }) {
    const { t } = useLanguage();

    const PhoneMockup = ({ isModern, isActive }: { isModern?: boolean, isActive?: boolean }) => (
        <div className={cn(
            "relative w-full h-full bg-card border-2 rounded-xl p-1.5 transition-all",
            isActive ? "border-primary shadow-lg" : "border-border"
        )}>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1 w-8 bg-border rounded-full" />
            <div className="h-full w-full rounded-lg bg-background p-2 flex flex-col gap-1.5">
                {isModern ? (
                    <>
                        {/* Modern View Mock */}
                        <div className="h-4 bg-muted rounded-sm" />
                        <div className="h-4 bg-muted rounded-sm w-3/4" />
                        <div className="flex-grow" />
                        <div className="grid grid-cols-4 gap-1.5 h-6">
                            <div className="bg-muted rounded-sm" />
                            <div className="bg-muted rounded-sm" />
                            <div className="bg-muted rounded-sm" />
                            <div className="bg-muted rounded-sm" />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Classic View Mock */}
                        <div className="h-4 bg-muted rounded-sm flex items-center justify-between px-1">
                             <div className="h-2 w-2 bg-background rounded-full" />
                             <div className="h-2 w-6 bg-background rounded-sm" />
                        </div>
                         <div className="flex-grow" />
                         <div className="grid grid-cols-2 gap-1.5 h-6">
                            <div className="bg-muted rounded-sm" />
                            <div className="bg-muted rounded-sm" />
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('admin_view_mode_title')}</CardTitle>
                <CardDescription>{t('admin_view_mode_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center gap-2">
                        <button className="h-48 w-full p-2" onClick={() => setViewMode('classic')}>
                            <PhoneMockup isActive={viewMode === 'classic'} />
                        </button>
                        <p className={cn("text-sm font-medium", viewMode === 'classic' ? "text-primary" : "text-muted-foreground")}>{t('admin_view_mode_classic')}</p>
                    </div>
                     <div className="flex flex-col items-center gap-2">
                        <button className="h-48 w-full p-2" onClick={() => setViewMode('modern')}>
                            <PhoneMockup isModern isActive={viewMode === 'modern'} />
                        </button>
                        <p className={cn("text-sm font-medium", viewMode === 'modern' ? "text-primary" : "text-muted-foreground")}>{t('admin_view_mode_modern')}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function SettingsPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user: currentUser, logout, isAuthLoading, setPendingRequests, isManagementModeEnabled, toggleManagementMode, isLoadingSettings, viewMode, setViewMode } = useAuth();
    const router = useRouter();
    
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);
    
    const role = currentUser?.currentSession?.role;
    const isSenior = role === 'senior';
    const isWorker = role === 'worker';

     useEffect(() => {
        if (!isAuthLoading && isWorker) {
            router.replace('/admin/stock');
        }
    }, [isAuthLoading, isWorker, router]);

    useEffect(() => {
        if (currentUser) {
            const pending = currentUser.sessions.filter(s => s.role === 'pending').length;
            setPendingRequests(pending);
        }
    }, [currentUser, setPendingRequests])

    const handleToggleManagementMode = async () => {
        setIsUpdatingMode(true);
        try {
            await toggleManagementMode();
            toast({
                title: t('admin_settings_management_mode_title'),
                description: !isManagementModeEnabled ? t('admin_settings_management_mode_on_desc') : t('admin_settings_management_mode_off_desc')
            })
        } catch (error) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: (error as Error).message });
        } finally {
            setIsUpdatingMode(false);
        }
    }

     if (isWorker && !isAuthLoading) {
        return null;
    }
    
    if (isAuthLoading) {
        return (
             <div className="max-w-4xl mx-auto space-y-8">
                 <Skeleton className="h-8 w-64" />
                <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>

            <div className="grid grid-cols-2 gap-4">
                <NavButton href="/admin/history" icon={History} title={t('admin_sidebar_history')} />
                <NavButton href="/admin/stock-history" icon={ListCollapse} title={t('admin_sidebar_stock_history')} />
                {isManagementModeEnabled && isSenior && (
                    <>
                        <NavButton href="/admin/products" icon={Package} title={t('admin_sidebar_products')} />
                        <NavButton href="/admin/containers" icon={Box} title={t('admin_sidebar_containers')} />
                    </>
                )}
            </div>

            <Card>
                <CardContent className="p-0 divide-y">
                     <SettingsItem title={t('language')} icon={Languages}>
                        <LanguageSwitcher />
                    </SettingsItem>
                     <SettingsItem title={t('toggle_theme')} icon={Palette}>
                        <ThemeSwitcher />
                    </SettingsItem>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0 divide-y">
                    <SettingsItem title={t('admin_settings_profile_title')} icon={UserCircle} onClick={() => router.push('/admin/settings/profile')} />
                    <SettingsItem title={t('admin_settings_tab_users')} icon={Devices} onClick={() => router.push('/admin/settings/devices')} />
                </CardContent>
            </Card>

            <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} />
            
             {isSenior && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin_settings_management_mode_title')}</CardTitle>
                        <CardDescription>{t('admin_settings_management_mode_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-4 rounded-lg border p-4">
                            <Settings2 className="h-6 w-6" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {t('admin_settings_management_mode_label')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {isManagementModeEnabled ? t('admin_settings_management_mode_status_on') : t('admin_settings_management_mode_status_off')}
                                </p>
                            </div>
                            {isLoadingSettings || isUpdatingMode ? (
                                <Skeleton className="h-6 w-11 rounded-full" />
                            ) : (
                                <Switch
                                    checked={isManagementModeEnabled}
                                    onCheckedChange={handleToggleManagementMode}
                                    aria-label="Toggle management mode"
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Button variant="outline" className="w-full justify-center gap-3 text-base text-destructive hover:text-destructive" onClick={logout}>
                <LogOut className="h-5 w-5" />
                {t('admin_logout')}
            </Button>

        </div>
    );
}
