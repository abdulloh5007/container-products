
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, Session, ViewMode } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Hourglass, Trash2, User, UserCheck, Settings2, LogOut, Eye, EyeOff, Smartphone, Archive, Edit, History, ListCollapse, ChevronRight, Package, Box, Languages, Palette, UserCircle, Users, LayoutTemplate } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPhoneNumber, deformatPhoneNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';

// --- Components for MODERN view ---

function NavButton({ icon: Icon, title, href }: { icon: React.ElementType, title: string, href: string }) {
    return (
        <Link href={href} className="flex flex-col items-center justify-center gap-2 rounded-lg p-4 text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80 aspect-square text-center">
            <Icon className="h-8 w-8" />
            <span>{title}</span>
        </Link>
    )
}

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

function ViewModeSwitcherCard({ viewMode, setViewMode }: { viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }) {
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

function ModernSettingsView() {
    const { t } = useLanguage();
    const { logout, isManagementModeEnabled, toggleManagementMode, isLoadingSettings, viewMode, setViewMode } = useAuth();
    const router = useRouter();
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);
    const role = useAuth().user?.currentSession?.role;
    const isSenior = role === 'senior';

    const handleToggleManagementMode = async () => {
        setIsUpdatingMode(true);
        try {
            await toggleManagementMode();
        } catch (error) {
            // Toast is handled in context now
        } finally {
            setIsUpdatingMode(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <SettingsItem title={t('admin_settings_tab_users')} icon={Users} onClick={() => router.push('/admin/settings/devices')} />
                </CardContent>
            </Card>

            <ViewModeSwitcherCard viewMode={viewMode} setViewMode={setViewMode} />
            
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

// --- Components for CLASSIC view ---

function ProfileTab() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user: currentUser, isAuthLoading, updateUserProfile, updateUserPassword, isManagementModeEnabled, toggleManagementMode, isLoadingSettings, viewMode, setViewMode } = useAuth();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    
    const role = currentUser?.currentSession?.role;
    const isSenior = role === 'senior';

    useEffect(() => {
        if (!isAuthLoading && currentUser) {
            setName(currentUser.name || '');
            setPhone(formatPhoneNumber(currentUser.phone || ''));
        }
    }, [currentUser, isAuthLoading]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        
        setIsSubmitting(true);
        try {
            await updateUserProfile({ name, phone: deformatPhoneNumber(phone) });
            
            if (password) {
                if (password.length < 6) {
                    toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('firebase_error_auth_weak-password') });
                    setIsSubmitting(false);
                    return;
                }
                await updateUserPassword(password);
                setPassword('');
            }
            toast({ title: t('admin_settings_update_success_title'), description: t('admin_settings_update_success_desc') });
        } catch (error) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleToggleManagementMode = async () => {
        setIsUpdatingMode(true);
        try {
            await toggleManagementMode();
        } catch (error) {
             // Toast is handled in context
        } finally {
            setIsUpdatingMode(false);
        }
    }

    if (isAuthLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_settings_profile_title')}</CardTitle>
                    <CardDescription>{t('admin_settings_profile_desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('admin_settings_name')}</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting || isAuthLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('admin_phone')}</Label>
                            <Input 
                              id="phone" 
                              value={phone} 
                              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} 
                              disabled={isSubmitting || isAuthLoading} 
                              placeholder="+998 (XX) XXX-XX-XX" />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('admin_settings_new_password')}</Label>
                            <div className="relative">
                            <Input 
                                id="password" 
                                type={showPassword ? 'text' : 'password'} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isSubmitting || isAuthLoading} 
                                placeholder={t('admin_settings_password_placeholder')}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                            </div>
                            <p className="text-xs text-muted-foreground">{t('admin_settings_password_min_chars')}</p>
                        </div>
                        
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting || isAuthLoading}>
                                {isSubmitting ? t('admin_saving_text') : t('admin_save_changes_button')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <ViewModeSwitcherCard viewMode={viewMode} setViewMode={setViewMode} />

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
        </div>
    );
}

function DevicesTab() {
    const router = useRouter();
    return <div className="mt-4"><Button onClick={() => router.push('/admin/settings/devices')}>{useLanguage().t('admin_settings_tab_users')}</Button></div>
}

function ClassicSettingsView() {
    const { t } = useLanguage();
    const { user, isAuthLoading } = useAuth();
    const role = user?.currentSession?.role;
    const isSenior = role === 'senior';
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="profile">{t('admin_settings_tab_profile')}</TabsTrigger>
                    {isSenior && <TabsTrigger value="devices">{t('admin_users_title')}</TabsTrigger>}
                </TabsList>
                <TabsContent value="profile" className="mt-6">
                    <ProfileTab />
                </TabsContent>
                {isSenior && (
                    <TabsContent value="devices" className="mt-6">
                        <DevicesTab />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

// --- Main Page Component ---
export default function SettingsPage() {
    const { viewMode, isAuthLoading, user } = useAuth();
    const router = useRouter();

    const isWorker = user?.currentSession?.role === 'worker';
    
    useEffect(() => {
        if (!isAuthLoading && isWorker) {
            router.replace('/admin/stock');
        }
    }, [isAuthLoading, isWorker, router]);

    if (isAuthLoading || isWorker) {
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
    
    return viewMode === 'classic' ? <ClassicSettingsView /> : <ModernSettingsView />;
}

