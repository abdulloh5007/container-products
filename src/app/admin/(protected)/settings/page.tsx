
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, Session } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Smartphone, UserCheck, Shield, Hourglass, Trash2, Crown, User } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface AlertDialogState {
  type: 'confirmAccess' | 'makeSenior' | 'deleteSession';
  session: Session;
}

export default function SettingsPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { user, logout, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertDialogState, setAlertDialogState] = useState<AlertDialogState | null>(null);

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
            fetchSessions();
        }
    }, [user, isAuthLoading, fetchSessions]);

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
            toast({ title: "Доступ предоставлен", description: `Устройство ${sessionToConfirm.deviceName} теперь имеет доступ.` });
        } catch (error) {
            console.error("Error confirming access:", error);
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось подтвердить доступ.' });
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
            
            toast({ title: "Роль передана", description: `Устройство ${sessionToPromote.deviceName} теперь старший админ.` });

            if (selfKicked) {
                logout();
            } else {
                fetchSessions();
            }
        } catch (error) {
            console.error("Error making senior:", error);
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось передать роль.' });
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
                toast({ title: "Сессия удалена", description: `Доступ для устройства ${sessionToDelete.deviceName} отозван.` });
            }
        } catch (error) {
            console.error("Error deleting session:", error);
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось удалить сессию.' });
        } finally {
            setIsSubmitting(false);
            setAlertDialogState(null);
        }
    };
    
    const renderAlertDialog = () => {
        if (!alertDialogState) return null;
        const { type, session } = alertDialogState;
        
        const titles = {
            confirmAccess: 'Подтвердить доступ?',
            makeSenior: 'Передать права старшего админа?',
            deleteSession: 'Отозвать доступ?'
        };
        const descriptions = {
            confirmAccess: `Вы уверены, что хотите предоставить доступ устройству "${session.deviceName}"?`,
            makeSenior: `Вы уверены, что хотите сделать устройство "${session.deviceName}" старшим админом? Вы потеряете свои права старшего админа.`,
            deleteSession: `Вы уверены, что хотите отозвать доступ для устройства "${session.deviceName}"? Эта сессия будет немедленно прекращена.`
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
                            {isSubmitting ? t('admin_saving_text') : 'Подтвердить'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    const totalLoading = isLoading || isAuthLoading;

    if (totalLoading) {
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
                           {isCurrentSession && <span className="text-xs font-normal text-primary">(текущая сессия)</span>}
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
                            Подтвердить
                        </Button>
                    )}
                    {isSenior && session.role === 'junior' && (
                         <Button variant="outline" onClick={() => setAlertDialogState({ type: 'makeSenior', session })} disabled={isSubmitting}>
                            <Crown className="mr-2 h-4 w-4" />
                            Сделать старшим
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
                    <h1 className="text-3xl font-bold tracking-tight">Управление доступом</h1>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Активные сессии</CardTitle>
                    <CardDescription>Здесь перечислены все устройства, имеющие доступ к этому аккаунту.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   {sessions.filter(s => s.role !== 'pending').length > 0 ? (
                       sessions.filter(s => s.role !== 'pending').map(renderSessionCard)
                   ) : (
                       <p className="text-muted-foreground text-center py-4">Активных сессий не найдено.</p>
                   )}
                </CardContent>
            </Card>

            {isSenior && sessions.some(s => s.role === 'pending') && (
                <Card>
                    <CardHeader>
                        <CardTitle>Запросы на вход</CardTitle>
                        <CardDescription>Эти устройства ожидают вашего подтверждения для входа в аккаунт.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sessions.filter(s => s.role === 'pending').map(renderSessionCard)}
                    </ToContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Общая информация</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Ваш аккаунт защищён. Только один человек может быть "Старшим админом". При входе с нового устройства старший получит уведомление, чтобы подтвердить доступ. Только подтверждённые пользователи смогут использовать аккаунт как "младшие". Вы можете в любой момент передать полномочия старшего другому пользователю.
                    </p>
                </CardContent>
            </Card>

        </div>
        {renderAlertDialog()}
      </>
    );
}
