
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, Session } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Hourglass, Trash2, User, UserCheck, Eye, EyeOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface AlertDialogState {
  type: 'confirmAccess' | 'makeSenior' | 'deleteSession';
  session: Session;
}

export default function SettingsPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { user, logout, isLoading: isAuthLoading, updateUserProfile } = useAuth();
    const router = useRouter();
    
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertDialogState, setAlertDialogState] = useState<AlertDialogState | null>(null);

    // Security tab state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);


    const isSenior = user?.currentSession.role === 'senior';
    const dateLocale = language === 'ru' ? ru : enUS;

    const fetchSessions = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const userDocRef = doc(db, 'users', user.phone.replace(/\D/g, ''));
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const sessionsData = (userDocSnap.data().sessionTokens || []) as Session[];
                sessionsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setSessions(sessionsData);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_load_error') });
        } finally {
            setIsLoading(false);
        }
    }, [user, t, toast]);

    useEffect(() => {
        if (!isAuthLoading) {
            if (user) {
              fetchSessions();
              setName(user.Name);
              setPhone(user.phone);
              setPassword(user.password || '');
            }
        }
    }, [user, isAuthLoading, fetchSessions]);
    
    const handleProfileUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      setIsSubmitting(true);
      try {
        const updateData: { Name: string; phone: string; password?: string } = {
          Name: name,
          phone: phone,
        };
        if (password) {
          updateData.password = password;
        }

        await updateUserProfile(updateData);
        
        toast({ title: t('admin_settings_update_success_title'), description: t('admin_settings_update_success_desc') });
      } catch (error) {
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: (error as Error).message });
      } finally {
        setIsSubmitting(false);
      }
    };


    const handleConfirmAccess = async (sessionToConfirm: Session) => {
        if (!user) return;
        setIsSubmitting(true);
        const userDocRef = doc(db, 'users', user.phone.replace(/\D/g, ''));
        
        try {
            const updatedSessions = sessions.map(s => 
                s.sessionToken === sessionToConfirm.sessionToken ? { ...s, role: 'junior' as const } : s
            );
            await updateDoc(userDocRef, { sessionTokens: updatedSessions });
            setSessions(updatedSessions);
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
        if (!user) return;
        setIsSubmitting(true);
        const userDocRef = doc(db, 'users', user.phone.replace(/\D/g, ''));
        
        try {
            let selfKicked = false;
            const updatedSessions = sessions.map(s => {
                if (s.sessionToken === sessionToPromote.sessionToken) {
                    return { ...s, role: 'senior' as const };
                }
                if (s.role === 'senior') {
                    if (s.sessionToken === user.currentSession.sessionToken) selfKicked = true;
                    return { ...s, role: 'junior' as const };
                }
                return s;
            });
            
            await updateDoc(userDocRef, { sessionTokens: updatedSessions });
            
            toast({ title: t('admin_session_promote_success_title'), description: t('admin_session_promote_success_desc', { deviceName: sessionToPromote.deviceName }) });

            if (selfKicked) {
                logout();
            } else {
                fetchSessions();
            }
        } catch (error) {
            console.error("Error making senior:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_promote_error_desc') });
        } finally {
            setIsSubmitting(false);
            setAlertDialogState(null);
        }
    };

    const handleDeleteSession = async (sessionToDelete: Session) => {
        if (!user) return;
        setIsSubmitting(true);
        const userDocRef = doc(db, 'users', user.phone.replace(/\D/g, ''));
        
        try {
            await updateDoc(userDocRef, { sessionTokens: arrayRemove(sessionToDelete) });

            if (sessionToDelete.sessionToken === user.currentSession.sessionToken) {
                logout();
            } else {
                fetchSessions();
                toast({ title: t('admin_session_delete_success_title'), description: t('admin_session_delete_success_desc', { deviceName: sessionToDelete.deviceName }) });
            }
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
        const { type, session } = alertDialogState;
        
        const titles = {
            confirmAccess: t('admin_session_dialog_confirm_title'),
            makeSenior: t('admin_session_dialog_promote_title'),
            deleteSession: t('admin_session_dialog_delete_title')
        };
        const descriptions = {
            confirmAccess: t('admin_session_dialog_confirm_desc', { deviceName: session.deviceName }),
            makeSenior: t('admin_session_dialog_promote_desc', { deviceName: session.deviceName }),
            deleteSession: t('admin_session_dialog_delete_desc', { deviceName: session.deviceName })
        };
        const actions = {
            confirmAccess: () => handleConfirmAccess(session),
            makeSenior: () => handleMakeSenior(session),
            deleteSession: () => handleDeleteSession(session)
        };

        return (
            <AlertDialog open={!!alertDialogState} onOpenChange={() => setAlertDialogState(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{titles[type]}</AlertDialogTitle>
                        <AlertDialogDescription>{descriptions[type]}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAlertDialogState(null)}>{t('admin_cancel_button')}</AlertDialogCancel>
                        <AlertDialogAction onClick={actions[type]} disabled={isSubmitting}>
                            {isSubmitting ? t('admin_saving_text') : t('admin_confirm_button')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    const totalLoading = isLoading || isAuthLoading;

    if (totalLoading && !user) {
        return (
          <div className="space-y-8">
            <Skeleton className="h-10 w-1/3" />
            <Card>
              <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
              <CardContent className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        )
    }

    const renderRoleIcon = (role: Session['role']) => {
        switch (role) {
            case 'senior': return <Crown className="h-5 w-5 text-amber-500" />;
            case 'junior': return <User className="h-5 w-5 text-blue-500" />;
            case 'pending': return <Hourglass className="h-5 w-5 text-muted-foreground" />;
            default: return null;
        }
    };
    
    const renderSessionCard = (session: Session) => {
        const isCurrentSession = session.sessionToken === user?.currentSession.sessionToken;
        return (
            <div key={session.sessionToken} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">{renderRoleIcon(session.role)}</div>
                    <div>
                        <p className="font-semibold flex items-center gap-2">
                           {session.deviceName}
                           {isCurrentSession && <span className="text-xs font-normal text-primary">({t('admin_session_current_text')})</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {format(new Date(session.date), "PPP p", { locale: dateLocale })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSenior && session.role === 'pending' && (
                        <Button onClick={() => setAlertDialogState({ type: 'confirmAccess', session })} disabled={isSubmitting}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            {t('admin_session_confirm_button')}
                        </Button>
                    )}
                    {isSenior && session.role === 'junior' && (
                         <Button variant="outline" onClick={() => setAlertDialogState({ type: 'makeSenior', session })} disabled={isSubmitting}>
                            <Crown className="mr-2 h-4 w-4" />
                            {t('admin_session_promote_button')}
                        </Button>
                    )}
                    {(isSenior && !isCurrentSession) && (
                        <Button variant="destructive" size="icon" onClick={() => setAlertDialogState({ type: 'deleteSession', session })} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
      <>
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">{t('admin_back_button')}</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>
                </div>
            </div>

            <Tabs defaultValue="security" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="security">{t('admin_settings_tab_security')}</TabsTrigger>
                    <TabsTrigger value="devices">{t('admin_settings_tab_devices')}</TabsTrigger>
                </TabsList>
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin_settings_profile_title')}</CardTitle>
                            <CardDescription>{t('admin_settings_profile_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('admin_settings_name')}</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('admin_phone')}</Label>
                                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} />
                                    <p className="text-xs text-muted-foreground">{t('admin_phone_update_warning_desc')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">{t('admin_password')}</Label>
                                     <div className="relative">
                                      <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isSubmitting}
                                        className="pr-10"
                                      />
                                      <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="icon" 
                                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                          onClick={() => setShowPassword(prev => !prev)}
                                      >
                                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </Button>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? t('admin_saving_text') : t('admin_save_changes_button')}
                                    </Button>
                                </div>
                            </form>
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
                             Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                          ) : sessions.filter(s => s.role !== 'pending').length > 0 ? (
                               sessions.filter(s => s.role !== 'pending').map(renderSessionCard)
                           ) : (
                               <p className="text-muted-foreground text-center py-4">{t('admin_session_none_active')}</p>
                           )}
                        </CardContent>
                    </Card>

                    {isSenior && (
                        <Card className="mt-8">
                            <CardHeader>
                                <CardTitle>{t('admin_session_pending_title')}</CardTitle>
                                <CardDescription>{t('admin_session_pending_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {totalLoading ? (
                                    <Skeleton className="h-16 w-full" />
                                 ) : sessions.filter(s => s.role === 'pending').length > 0 ? (
                                    sessions.filter(s => s.role === 'pending').map(renderSessionCard)
                                 ) : (
                                    <p className="text-muted-foreground text-center py-4">{t('admin_session_none_pending')}</p>
                                 )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
        {renderAlertDialog()}
      </>
    );
}
