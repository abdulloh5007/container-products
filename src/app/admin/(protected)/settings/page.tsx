
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SessionRole, Session } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, writeBatch, collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Hourglass, Trash2, User, UserCheck, Settings2, Monitor, LogOut, Eye, EyeOff, Smartphone, ShieldAlert, Archive } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, formatPhoneNumber, deformatPhoneNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import UAParser from 'ua-parser-js';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface AlertDialogState {
  type: 'makeSenior' | 'deleteSession' | 'deleteAccount';
  targetSession?: Session;
}

interface ConfirmAccessDialogState {
    isOpen: boolean;
    session: Session | null;
    name: string;
    role: 'junior' | 'worker';
}

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

export default function SettingsPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { user: currentUser, logout, isAuthLoading, updateUserProfile, setPendingRequests, isManagementModeEnabled, toggleManagementMode, isLoadingSettings, approveSession, deleteSession, makeSenior, updateUserPassword, deleteUserAccount, translateFirebaseError } = useAuth();
    const router = useRouter();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);
    const [alertDialogState, setAlertDialogState] = useState<AlertDialogState | null>(null);
    const [confirmAccessDialogState, setConfirmAccessDialogState] = useState<ConfirmAccessDialogState>({ isOpen: false, session: null, name: '', role: 'junior' });
    const [showPassword, setShowPassword] = useState(false);

    // Profile tab state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    const isSenior = currentUser?.currentSession?.role === 'senior';
    const dateLocale = language === 'uz' ? uz : ru;

    useEffect(() => {
        if (currentUser) {
            const pending = currentUser.sessions.filter(s => s.role === 'pending').length;
            setPendingRequests(pending);
        }
    }, [currentUser, setPendingRequests])

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
        
        let passwordUpdated = false;
        if (isSenior && password) {
          if (password.length < 6) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('firebase_error_auth_weak-password') });
            setIsSubmitting(false);
            return;
          }
          await updateUserPassword(password);
          passwordUpdated = true;
          setPassword('');
          toast({ title: t('admin_password_update_success_title'), description: t('admin_password_update_success_desc') });
        }
        
        if (!passwordUpdated) {
          toast({ title: t('admin_settings_update_success_title'), description: t('admin_settings_update_success_desc') });
        }
        
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

    const handleMakeSenior = async (sessionToPromote: Session) => {
        setIsSubmitting(true);
        try {
            await makeSenior(sessionToPromote);
            toast({ title: t('admin_session_promote_success_title'), description: t('admin_session_promote_success_desc', { deviceName: sessionToPromote.deviceName }) });
        } catch (error) {
            console.error("Error making senior:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_promote_error_desc') });
        } finally {
            setIsSubmitting(false);
            setAlertDialogState(null);
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
        }
    };
    
    const handleDeleteAccount = async () => {
        setIsSubmitting(true);
        try {
            await deleteUserAccount();
            toast({ title: t('admin_account_delete_success_title'), description: t('admin_account_delete_success_desc') });
            router.push('/admin/login');
        } catch (error) {
            console.error("Error deleting account:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
            setAlertDialogState(null);
        }
    }
    
    const renderAlertDialog = () => {
        if (!alertDialogState) return null;
        const { type, targetSession } = alertDialogState;
        
        const titles: Record<string, string> = {
            makeSenior: t('admin_session_dialog_promote_title'),
            deleteSession: t('admin_session_dialog_delete_title'),
            deleteAccount: t('admin_account_delete_confirm_title'),
        };
        const descriptions: Record<string, string> = {
            makeSenior: t('admin_session_dialog_promote_desc', { deviceName: targetSession?.deviceName || '' }),
            deleteSession: t('admin_session_dialog_delete_desc', { deviceName: targetSession?.deviceName || '' }),
            deleteAccount: t('admin_account_delete_confirm_desc'),
        };
        const actions: Record<string, () => void> = {
            makeSenior: () => handleMakeSenior(targetSession!),
            deleteSession: () => handleDeleteSession(targetSession!),
            deleteAccount: () => handleDeleteAccount(),
        };
        const actionButtonText: Record<string, string> = {
            makeSenior: t('admin_session_promote_button'),
            deleteSession: t('admin_delete_button'),
            deleteAccount: t('admin_delete_button'),
        }

        return (
            <AlertDialog open={!!alertDialogState} onOpenChange={() => setAlertDialogState(null)}>
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
                          className={type === 'deleteSession' || type === 'deleteAccount' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        >
                            {isSubmitting ? t('admin_saving_text') : actionButtonText[type]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    const totalLoading = isAuthLoading;

    if (totalLoading && !currentUser) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                 <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 shrink-0" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
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
                             {role === 'pending' && (
                                <Button onClick={() => openConfirmAccessDialog(session)} disabled={isSubmitting} className="h-9 w-full sm:w-auto">
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    <span>{t('admin_session_confirm_button')}</span>
                                </Button>
                             )}
                             {(role === 'junior' || role === 'worker') && (
                                <Button variant="outline" onClick={() => setAlertDialogState({ type: 'makeSenior', targetSession: session })} disabled={isSubmitting} className="h-9 w-full sm:w-auto">
                                    <Crown className="mr-2 h-4 w-4" />
                                    {t('admin_session_promote_button')}
                                </Button>
                             )}
                              <Button variant="destructive" size="icon" onClick={() => setAlertDialogState({ type: 'deleteSession', targetSession: session })} disabled={isSubmitting}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                        </>
                    )}
                </div>
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
      <>
        <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">{t('admin_back_button')}</span>
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>
                    </div>
                </div>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">{t('admin_settings_tab_profile')}</TabsTrigger>
                        <TabsTrigger value="devices">{t('admin_settings_tab_users')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="profile">
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
                                    
                                     {isSenior && (
                                      <>
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
                                      </>
                                    )}
                                    
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isSubmitting || isAuthLoading}>
                                            {isSubmitting ? t('admin_saving_text') : t('admin_save_changes_button')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                         {isSenior && (
                            <Card className="mt-8">
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
                    </TabsContent>
                    <TabsContent value="devices">
                        <Card>
                             <CardHeader>
                                <CardTitle>{t('admin_session_active_title')}</CardTitle>
                                <CardDescription>{t('admin_session_active_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {totalLoading ? (
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
                                    {totalLoading ? (
                                        <Skeleton className="h-20 w-full" />
                                     ) : (
                                        pendingSessions.map(renderSessionCard)
                                     )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
        
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
      </>
    );
}

    
