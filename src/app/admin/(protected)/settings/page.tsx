
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, Session, ViewMode, SessionRole } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Hourglass, Trash2, User, UserCheck, Settings2, LogOut, Eye, EyeOff, Smartphone, Archive, Edit, History, ListCollapse, ChevronRight, Package, Box, Languages, Palette, UserCircle, Users, LayoutTemplate, Monitor, Warehouse } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogContent } from '@/components/ui/dialog';
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
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Walkthrough } from '@/components/admin/walkthrough';

// --- Components for MODERN view ---

function NavButton({ icon: Icon, title, href }: { icon: React.ElementType, title: string, href: string }) {
    return (
        <Link href={href} className="flex flex-col items-center justify-center gap-2 rounded-lg p-4 text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80 aspect-square text-center">
            <Icon className="h-8 w-8" />
            <span>{title}</span>
        </Link>
    )
}

function SettingsItem({ icon: Icon, title, description, onClick, children, 'data-intro': dataIntro }: { icon: React.ElementType, title: string, description?: string, onClick?: () => void, children?: React.ReactNode, 'data-intro'?: string }) {
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
            <button data-intro={dataIntro} onClick={onClick} className="w-full text-left p-4 rounded-lg hover:bg-muted transition-colors flex items-center justify-between">
                {content}
            </button>
        )
    }

    return (
        <div data-intro={dataIntro} className="w-full p-4 flex items-center justify-between">
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
        <Card data-intro="view-mode-switcher">
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
    const { logout, user, isManagementModeEnabled, toggleManagementMode, isLoading: isLoadingSettings, viewMode, setViewMode } = useAuth();
    const router = useRouter();
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);
    const isSenior = user?.currentSession?.role === 'senior';

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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
    const { user: currentUser, isAuthLoading, updateUserProfile, updateUserPassword, isManagementModeEnabled, toggleManagementMode, isLoading: isLoadingSettings, viewMode, setViewMode } = useAuth();
    
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

interface AlertDialogState {
  type: 'deleteSession';
  targetSession?: Session;
}
interface ConfirmAccessDialogState {
    isOpen: boolean;
    session: Session | null;
    name: string;
    role: 'junior' | 'worker';
}
interface EditSessionDialogState {
    isOpen: boolean;
    session: Session | null;
    name: string;
    role: 'junior' | 'worker';
}

function DevicesTab() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { user: currentUser, isAuthLoading, approveSession, deleteSession, updateUserRole } = useAuth();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertDialogState, setAlertDialogState] = useState<AlertDialogState | null>(null);
    const [confirmAccessDialogState, setConfirmAccessDialogState] = useState<ConfirmAccessDialogState>({ isOpen: false, session: null, name: '', role: 'junior' });
    const [editSessionDialogState, setEditSessionDialogState] = useState<EditSessionDialogState>({ isOpen: false, session: null, name: '', role: 'junior' });
    
    const role = currentUser?.currentSession?.role;
    const isSenior = role === 'senior';
    const dateLocale = language === 'uz' ? uz : ru;

    const openConfirmAccessDialog = (session: Session) => {
        setConfirmAccessDialogState({
            isOpen: true,
            session: session,
            name: session.deviceName, // Pre-fill with device name
            role: 'junior'
        });
    };
    
    const closeConfirmAccessDialog = () => {
        setConfirmAccessDialogState({ isOpen: false, session: null, name: '', role: 'junior' });
    };

    const handleConfirmAccess = async () => {
        const { session, name, role } = confirmAccessDialogState;
        if (!session || !name) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_dialog_name_required') });
            return;
        }

        setIsSubmitting(true);
        try {
            await approveSession(session, name, role);
            toast({ title: t('admin_session_confirm_success_title'), description: t('admin_session_confirm_success_desc', { deviceName: name }) });
        } catch (error) {
            console.error("Error confirming access:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_confirm_error_desc') });
        } finally {
            setIsSubmitting(false);
            closeConfirmAccessDialog();
        }
    };

    const openEditSessionDialog = (session: Session) => {
        if (session.role === 'junior' || session.role === 'worker') {
            setEditSessionDialogState({
                isOpen: true,
                session: session,
                name: session.name || session.deviceName,
                role: session.role
            });
        }
    };

    const closeEditSessionDialog = () => {
        setEditSessionDialogState({ isOpen: false, session: null, name: '', role: 'junior' });
    };

    const handleUpdateSession = async () => {
        const { session, name, role } = editSessionDialogState;
        if (!session || !name) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_dialog_name_required') });
            return;
        }

        setIsSubmitting(true);
        try {
            await updateUserRole(session, name, role);
            toast({ title: t('admin_session_update_success_title'), description: t('admin_session_update_success_desc', { deviceName: name }) });
        } catch (error) {
            console.error("Error updating session:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
        } finally {
            setIsSubmitting(false);
            closeEditSessionDialog();
        }
    };

    const handleDeleteSession = async (sessionToDelete: Session) => {
         setIsSubmitting(true);
        try {
            await deleteSession(sessionToDelete);
            toast({ title: t('admin_session_delete_success_title'), description: t('admin_session_delete_success_desc', { deviceName: sessionToDelete.deviceName }) });
        } catch (error) {
            console.error("Error deleting session:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_delete_error_desc') });
        } finally {
            setIsSubmitting(false);
            setAlertDialogState(null);
            closeEditSessionDialog();
        }
    };
    
    const getDeviceIcon = (deviceName: string) => {
        if (!deviceName) return <Monitor className="h-6 w-6 text-muted-foreground" />;
        
        const lowerDeviceName = deviceName.toLowerCase();
        const mobileKeywords = ['iphone', 'android', 'mobile', 'tablet', 'ipad', 'galaxy', 'pixel', 'redmi', 'oneplus', 'ios', 'phone'];
        const isMobile = mobileKeywords.some(keyword => lowerDeviceName.includes(keyword));

        if (isMobile) {
            return <Smartphone className="h-6 w-6 text-muted-foreground" />;
        }
        return <Monitor className="h-6 w-6 text-muted-foreground" />;
    }

    const renderAlertDialog = () => {
        if (!alertDialogState) return null;
        const { type, targetSession } = alertDialogState;
        
        const titles: Record<string, string> = {
            deleteSession: t('admin_session_dialog_delete_title'),
        };
        const descriptions: Record<string, string> = {
            deleteSession: t('admin_session_dialog_delete_desc', { deviceName: targetSession?.name || targetSession?.deviceName || '' }),
        };
        const actions: Record<string, () => void> = {
            deleteSession: () => handleDeleteSession(targetSession!),
        };
        const actionButtonText: Record<string, string> = {
            deleteSession: t('admin_delete_button'),
        }

        return (
            <AlertDialog open={!!alertDialogState} onOpenChange={(open) => !open && setAlertDialogState(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{titles[type]}</AlertDialogTitle>
                        <AlertDialogDescription>{descriptions[type]}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAlertDialogState(null)}>{t('admin_cancel_button')}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={actions[type]} 
                          disabled={isSubmitting}
                          className={type === 'deleteSession' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        >
                            {isSubmitting ? t('admin_saving_text') : actionButtonText[type]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    const renderRoleIcon = (role?: SessionRole) => {
        switch (role) {
            case 'senior': return <Crown className="h-5 w-5 text-amber-500" />;
            case 'junior': return <User className="h-5 w-5 text-blue-500" />;
            case 'worker': return <Archive className="h-5 w-5 text-green-500" />;
            case 'pending': return <Hourglass className="h-5 w-5 text-muted-foreground" />;
            default: return null;
        }
    };
    
    const renderSessionCard = (session: Session) => {
        const isCurrentSession = session.id === currentUser?.currentSession?.id;
        const role = session.role;
        const displayName = session.name || session.deviceName;

        return (
             <div key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    {getDeviceIcon(session.deviceName)}
                    <div className="flex flex-col">
                        <p className="font-semibold text-sm sm:text-base">
                           {displayName}
                        </p>
                        {isCurrentSession && <span className="text-xs font-normal text-primary mt-1">({t('admin_session_current_text')})</span>}
                        <p className="text-sm text-muted-foreground mt-1 sm:mt-0">
                            {t('admin_session_login_time')}: {format(session.createdAt.toDate(), 'd MMMM, yyyy, HH:mm', { locale: dateLocale })}
                        </p>
                    </div>
                </div>

                <div className="flex w-full sm:w-auto items-center justify-end gap-2 mt-2 sm:mt-0">
                    <div className="flex-shrink-0 self-start sm:self-center">{renderRoleIcon(role)}</div>
                     {isSenior && !isCurrentSession && (
                        <>
                             {role === 'pending' ? (
                                <>
                                    <Button onClick={() => openConfirmAccessDialog(session)} disabled={isSubmitting} className="h-9">
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        <span>{t('admin_session_confirm_button')}</span>
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 text-destructive"
                                        onClick={() => setAlertDialogState({ type: 'deleteSession', targetSession: session })} 
                                        disabled={isSubmitting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                             ) : (
                                <>
                                    <Button variant="outline" onClick={() => openEditSessionDialog(session)} disabled={isSubmitting} className="h-9">
                                        <Edit className="mr-2 h-4 w-4" />
                                        {t('admin_edit_button')}
                                    </Button>
                                    <Button 
                                        variant="destructive"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => setAlertDialogState({ type: 'deleteSession', targetSession: session })} 
                                        disabled={isSubmitting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                             )}
                        </>
                    )}
                </div>
            </div>
        )
    }

    if (isAuthLoading && !currentUser) {
        return (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
        )
    }
    
    const sessions = currentUser?.sessions || [];
    const currentActiveSession = sessions.find(s => s.id === currentUser?.currentSession?.id);
    const otherActiveSessions = sessions
        .filter(s => s.role !== 'pending' && s.id !== currentUser?.currentSession?.id)
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    const pendingSessions = sessions.filter(s => s.role === 'pending');

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                <CardTitle>{t('admin_session_active_title')}</CardTitle>
                <CardDescription>{t('admin_session_active_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {isAuthLoading ? (
                    Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                ) : (
                    <>
                        {currentActiveSession && renderSessionCard(currentActiveSession)}
                        
                        {otherActiveSessions.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pt-4">
                                    <Separator className="flex-1" />
                                    <span className="text-sm text-muted-foreground">{t('admin_session_other_active_sessions')}</span>
                                    <Separator className="flex-1" />
                                </div>
                                {otherActiveSessions.map(renderSessionCard)}
                            </div>
                        )}

                        {!currentActiveSession && otherActiveSessions.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">{t('admin_users_none')}</p>
                        )}
                    </>
                    )}
                </CardContent>
            </Card>

            {isSenior && pendingSessions.length > 0 && (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>{t('admin_session_pending_title')}</CardTitle>
                        <CardDescription>{t('admin_session_pending_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isAuthLoading ? (
                            <Skeleton className="h-20 w-full" />
                            ) : (
                            pendingSessions.map(renderSessionCard)
                            )}
                    </CardContent>
                </Card>
            )}
            
            {renderAlertDialog()}

            <Dialog open={confirmAccessDialogState.isOpen} onOpenChange={(isOpen) => !isOpen && closeConfirmAccessDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin_session_dialog_confirm_title')}</DialogTitle>
                        <DialogDescription>{t('admin_session_dialog_confirm_setup_desc', { deviceName: confirmAccessDialogState.session?.deviceName || '' })}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="session-name">{t('admin_session_dialog_name_label')}</Label>
                            <Input
                                id="session-name"
                                value={confirmAccessDialogState.name}
                                onChange={(e) => setConfirmAccessDialogState(s => ({ ...s, name: e.target.value }))}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('admin_session_dialog_role_label')}</Label>
                            <RadioGroup 
                                value={confirmAccessDialogState.role} 
                                onValueChange={(value) => setConfirmAccessDialogState(s => ({ ...s, role: value as 'junior' | 'worker' }))} 
                                className="flex gap-4"
                                disabled={isSubmitting}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="junior" id="role-junior" />
                                    <Label htmlFor="role-junior">{t('admin_role_junior')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="worker" id="role-worker" />
                                    <Label htmlFor="role-worker">{t('admin_role_worker')}</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeConfirmAccessDialog} disabled={isSubmitting}>{t('admin_cancel_button')}</Button>
                        <Button onClick={handleConfirmAccess} disabled={isSubmitting}>
                            {isSubmitting ? t('admin_saving_text') : t('admin_confirm_button')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={editSessionDialogState.isOpen} onOpenChange={(isOpen) => !isOpen && closeEditSessionDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin_edit_user_title')}</DialogTitle>
                        <DialogDescription>{t('admin_edit_user_desc', { deviceName: editSessionDialogState.session?.name || editSessionDialogState.session?.deviceName || '' })}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-session-name">{t('admin_session_dialog_name_label')}</Label>
                            <Input
                                id="edit-session-name"
                                value={editSessionDialogState.name}
                                onChange={(e) => setEditSessionDialogState(s => ({ ...s, name: e.target.value }))}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('admin_session_dialog_role_label')}</Label>
                            <RadioGroup 
                                value={editSessionDialogState.role} 
                                onValueChange={(value) => setEditSessionDialogState(s => ({ ...s, role: value as 'junior' | 'worker' }))} 
                                className="flex gap-4"
                                disabled={isSubmitting}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="junior" id="edit-role-junior" />
                                    <Label htmlFor="edit-role-junior">{t('admin_role_junior')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="worker" id="edit-role-worker" />
                                    <Label htmlFor="edit-role-worker">{t('admin_role_worker')}</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditSessionDialog} disabled={isSubmitting}>{t('admin_cancel_button')}</Button>
                        <Button onClick={handleUpdateSession} disabled={isSubmitting}>
                            {isSubmitting ? t('admin_saving_text') : t('admin_save_changes_button')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ClassicSettingsView() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const role = user?.currentSession?.role;
    const isSenior = role === 'senior';
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className={cn("grid w-full", isSenior ? "grid-cols-2" : "grid-cols-1")}>
                    <TabsTrigger value="profile">{t('admin_settings_tab_profile')}</TabsTrigger>
                    {isSenior && <TabsTrigger value="devices">{t('admin_settings_tab_users')}</TabsTrigger>}
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

const WALKTHROUGH_SETTINGS_KEY = 'walkthrough-settings-seen';

// --- Main Page Component ---
export default function SettingsPage() {
    const { t } = useLanguage();
    const { user, viewMode, isAuthLoading } = useAuth();
    const router = useRouter();
    const [isWalkthroughEnabled, setWalkthroughEnabled] = useState(false);

    const role = user?.currentSession?.role;
    const isSenior = role === 'senior';
    
    useEffect(() => {
        if (!isAuthLoading && !isSenior) {
            router.replace('/admin/acceptance');
        }
    }, [isAuthLoading, isSenior, router]);
    
    useEffect(() => {
        if (isSenior) {
            const hasSeenWalkthrough = localStorage.getItem(WALKTHROUGH_SETTINGS_KEY);
            if (!hasSeenWalkthrough) {
                setTimeout(() => setWalkthroughEnabled(true), 500);
            }
        }
    }, [isSenior]);

    if (isAuthLoading || !isSenior) {
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

    const onExitWalkthrough = () => {
        setWalkthroughEnabled(false);
        localStorage.setItem(WALKTHROUGH_SETTINGS_KEY, 'true');
    };

    const settingsSteps = [
        {
            element: '[data-intro="view-mode-switcher"]',
            intro: t('admin_walkthrough_view_switcher'),
        },
    ];
    
    return (
        <>
            {viewMode === 'classic' ? <ClassicSettingsView /> : <ModernSettingsView />}
             <Walkthrough
                isOpen={isWalkthroughEnabled}
                steps={settingsSteps}
                onClose={onExitWalkthrough}
            />
        </>
    );
}
