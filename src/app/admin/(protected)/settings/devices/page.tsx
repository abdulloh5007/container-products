
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SessionRole, Session } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Hourglass, Trash2, User, UserCheck, Monitor, Smartphone, Archive, Edit, QrCode } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QRCode from 'qrcode';

interface AlertDialogState {
  type: 'deleteSession';
  targetSession?: Session;
}

interface EditSessionDialogState {
    isOpen: boolean;
    session: Session | null;
    name: string;
    role: 'junior' | 'worker';
}

interface QrDialogState {
    isOpen: boolean;
    isGenerating: boolean;
    qrCodeUrl: string | null;
    roleToGenerate: 'junior' | 'worker';
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


export default function DevicesSettingsPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { user: currentUser, isAuthLoading, deleteSession, updateUserRole } = useAuth();
    const router = useRouter();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertDialogState, setAlertDialogState] = useState<AlertDialogState | null>(null);
    const [editSessionDialogState, setEditSessionDialogState] = useState<EditSessionDialogState>({ isOpen: false, session: null, name: '', role: 'junior' });
    const [qrDialogState, setQrDialogState] = useState<QrDialogState>({ isOpen: false, isGenerating: false, qrCodeUrl: null, roleToGenerate: 'junior' });
    
    const role = currentUser?.currentSession?.role;
    const isSenior = role === 'senior';
    const dateLocale = language === 'uz' ? uz : ru;

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

    const handleGenerateQrCode = async () => {
        setQrDialogState(prev => ({ ...prev, isGenerating: true, qrCodeUrl: null }));
        try {
            const docRef = await addDoc(collection(db, 'qr_login_tokens'), {
                role: qrDialogState.roleToGenerate,
                used: false,
                createdAt: serverTimestamp(),
                expiresAt: new Timestamp(Date.now() / 1000 + 300, 0), // 5-minute expiry
            });
            const qrDataUrl = await QRCode.toDataURL(docRef.id, { errorCorrectionLevel: 'H', width: 256 });
            setQrDialogState(prev => ({...prev, isGenerating: false, qrCodeUrl: qrDataUrl}));
        } catch (error) {
            console.error("Error generating QR code:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: 'Could not generate QR code.' });
            setQrDialogState(prev => ({...prev, isGenerating: false }));
        }
    };

    const openQrDialog = () => {
        setQrDialogState({ isOpen: true, isGenerating: false, qrCodeUrl: null, roleToGenerate: 'junior' });
    };
    
    const closeQrDialog = () => {
        setQrDialogState({ isOpen: false, isGenerating: false, qrCodeUrl: null, roleToGenerate: 'junior' });
    };

    const renderAlertDialog = () => {
        if (!alertDialogState) return null;
        const { type, targetSession } = alertDialogState;
        
        const titles: Record<string, string> = {
            deleteSession: t('admin_session_dialog_delete_title'),
        };
        const descriptions: Record<string, string> = {
            deleteSession: t('admin_session_dialog_delete_desc', { deviceName: targetSession?.deviceName || '' }),
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
    
    if (isAuthLoading && !currentUser) {
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
                </div>
            </div>
        )
    }

    const sessions = currentUser?.sessions || [];
    const currentActiveSession = sessions.find(s => s.id === currentUser?.currentSession?.id);
    const otherActiveSessions = sessions
        .filter(s => s.id !== currentUser?.currentSession?.id)
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        

    return (
      <>
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">{t('admin_back_button')}</span>
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('admin_settings_tab_users')}</h1>
                    </div>
                </div>
                {isSenior && (
                     <Button onClick={openQrDialog}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Сгенерировать QR
                    </Button>
                )}
            </div>

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

        </div>
        
        {renderAlertDialog()}

        <Dialog open={qrDialogState.isOpen} onOpenChange={closeQrDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Сгенерировать QR-код для входа</DialogTitle>
                    <DialogDescription>
                        Выберите роль, и сгенерируйте одноразовый QR-код. Код действителен 5 минут.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-4">
                    {!qrDialogState.qrCodeUrl && (
                        <>
                            <div className="space-y-2">
                                <Label>{t('admin_session_dialog_role_label')}</Label>
                                <RadioGroup 
                                    value={qrDialogState.roleToGenerate} 
                                    onValueChange={(value) => setQrDialogState(s => ({ ...s, roleToGenerate: value as 'junior' | 'worker' }))} 
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="junior" id="qr-role-junior" />
                                        <Label htmlFor="qr-role-junior">{t('admin_role_junior')}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="worker" id="qr-role-worker" />
                                        <Label htmlFor="qr-role-worker">{t('admin_role_worker')}</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <Button onClick={handleGenerateQrCode} disabled={qrDialogState.isGenerating} className="w-full">
                                {qrDialogState.isGenerating ? "Генерация..." : "Сгенерировать"}
                            </Button>
                        </>
                    )}

                    {qrDialogState.isGenerating && <Skeleton className="w-64 h-64 mx-auto" />}

                    {qrDialogState.qrCodeUrl && (
                        <div className="flex flex-col items-center gap-4">
                            <img src={qrDialogState.qrCodeUrl} alt="QR Code" className="rounded-lg" />
                            <p className="text-sm text-muted-foreground text-center">
                                Пользователь должен отсканировать этот QR-код для входа.
                            </p>
                            <Button onClick={() => setQrDialogState(prev => ({...prev, qrCodeUrl: null}))}>
                                Создать новый
                            </Button>
                        </div>
                    )}
                </div>
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
      </>
    );

}
