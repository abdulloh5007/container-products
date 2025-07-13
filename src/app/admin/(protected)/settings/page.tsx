
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, AppUser, SessionRole, Session } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, writeBatch, collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Hourglass, Trash2, User, UserCheck, Settings2, Monitor, LogOut } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';

interface AlertDialogState {
  type: 'confirmAccess' | 'makeSenior' | 'deleteSession';
  targetSession: Session;
}

export default function SettingsPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { user: currentUser, logout, isAuthLoading, updateUserProfile, setPendingRequests, isManagementModeEnabled, toggleManagementMode, isLoadingSettings, approveSession, deleteSession, makeSenior } = useAuth();
    const router = useRouter();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);
    const [alertDialogState, setAlertDialogState] = useState<AlertDialogState | null>(null);

    // Profile tab state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

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
            setPhone(currentUser.phone || '');
        }
    }, [currentUser, isAuthLoading]);
    
    const handleProfileUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      
      setIsSubmitting(true);
      try {
        await updateUserProfile({ name, phone });
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

    const handleConfirmAccess = async (sessionToConfirm: Session) => {
        setIsSubmitting(true);
        try {
            await approveSession(sessionToConfirm);
            toast({ title: t('admin_session_confirm_success_title'), description: t('admin_session_confirm_success_desc', { deviceName: sessionToConfirm.deviceName }) });
        } catch (error) {
            console.error("Error confirming access:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_confirm_error_desc') });
        } finally {
            setIsSubmitting(false);
            setAlertDialogState(null);
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
    
    const renderAlertDialog = () => {
        if (!alertDialogState) return null;
        const { type, targetSession } = alertDialogState;
        
        const titles: Record<string, string> = {
            confirmAccess: t('admin_session_dialog_confirm_title'),
            makeSenior: t('admin_session_dialog_promote_title'),
            deleteSession: t('admin_session_dialog_delete_title'),
        };
        const descriptions: Record<string, string> = {
            confirmAccess: t('admin_session_dialog_confirm_desc', { deviceName: targetSession.deviceName }),
            makeSenior: t('admin_session_dialog_promote_desc', { deviceName: targetSession.deviceName }),
            deleteSession: t('admin_session_dialog_delete_desc', { deviceName: targetSession.deviceName }),
        };
        const actions: Record<string, () => void> = {
            confirmAccess: () => handleConfirmAccess(targetSession),
            makeSenior: () => handleMakeSenior(targetSession),
            deleteSession: () => handleDeleteSession(targetSession),
        };
        const actionButtonText: Record<string, string> = {
            confirmAccess: t('admin_confirm_button'),
            makeSenior: t('admin_session_promote_button'),
            deleteSession: t('admin_delete_button'),
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
                          className={type === 'deleteSession' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
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
            case 'pending': return <Hourglass className="h-5 w-5 text-muted-foreground" />;
            default: return null;
        }
    };
    
    const renderSessionCard = (session: Session) => {
        const isCurrentSession = session.id === currentUser?.currentSession?.id;
        const role = session.role;

        return (
             <div key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    <Monitor className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="font-semibold flex items-center gap-2">
                           {session.deviceName}
                           {isCurrentSession && <span className="text-xs font-normal text-primary">({t('admin_session_current_text')})</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t('admin_session_login_time')}: {format(session.createdAt.toDate(), 'Pp', { locale: dateLocale })}
                        </p>
                    </div>
                </div>

                <div className="flex w-full sm:w-auto items-center justify-end gap-2 mt-2 sm:mt-0">
                    <div className="flex-shrink-0">{renderRoleIcon(role)}</div>
                     {isSenior && !isCurrentSession && (
                        <>
                             {role === 'pending' && (
                                <Button onClick={() => setAlertDialogState({ type: 'confirmAccess', targetSession: session })} disabled={isSubmitting} className="h-9 w-full sm:w-auto">
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    <span>{t('admin_session_confirm_button')}</span>
                                </Button>
                             )}
                             {role === 'junior' && (
                                <Button variant="outline" onClick={() => setAlertDialogState({ type: 'makeSenior', targetSession: session })} disabled={isSubmitting}>
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
    const activeSessions = sessions.filter(s => s.role !== 'pending');
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
                                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting || isAuthLoading} placeholder="+998 XX XXX XX XX" />
                                    </div>
                                    
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
                        <Card className="mt-8">
                           <CardHeader>
                               <CardTitle>{t('admin_session_logout_from_all_title')}</CardTitle>
                           </CardHeader>
                           <CardContent>
                               <Button variant="destructive" onClick={logout}>{t('admin_logout')}</Button>
                           </CardContent>
                        </Card>
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
                              ) : activeSessions.length > 0 ? (
                                   activeSessions.map(renderSessionCard)
                               ) : (
                                   <p className="text-muted-foreground text-center py-4">{t('admin_users_none')}</p>
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
      </>
    );
}

    