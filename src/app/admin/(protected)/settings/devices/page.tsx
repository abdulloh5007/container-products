
'use client';

import { useState, useEffect } from 'react';
import { useAuth, AppUser, UserRole } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Edit, Monitor, QrCode, Smartphone, Trash2, User, Archive } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { collection, onSnapshot, query, addDoc, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QRCode from 'qrcode';
import { useRouter } from 'next/navigation';

interface EditUserDialogState {
    isOpen: boolean;
    user: AppUser | null;
    name: string;
    role: UserRole;
}

export default function DevicesPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading, deleteUser, updateUser } = useAuth();
    
    // --- State for Dialogs and Forms ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Users list state
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    // Dialogs state
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
    const [editUserState, setEditUserState] = useState<EditUserDialogState>({ isOpen: false, user: null, name: '', role: 'junior' });
    const [qrDialogState, setQrDialogState] = useState({ isOpen: false, isGenerating: false, qrCodeUrl: null, roleToGenerate: 'junior' as 'junior' | 'worker' });

    const isSenior = user?.userRole === 'senior';
    const dateLocale = language === 'uz' ? uz : ru;

    // --- Data Fetching Effects ---
    useEffect(() => {
        if (!isSenior) {
            router.replace('/admin/acceptance');
            return;
        }

        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
            setAllUsers(usersData);
            setIsLoadingUsers(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setIsLoadingUsers(false);
        });
        return () => unsubscribe();
    }, [isSenior, router]);
    
    // --- Handlers ---
    const handleGenerateQrCode = async () => {
        setQrDialogState(prev => ({ ...prev, isGenerating: true, qrCodeUrl: null }));
        try {
            const docRef = await addDoc(collection(db, 'qr_login_tokens'), {
                role: qrDialogState.roleToGenerate,
                used: false,
                createdAt: Timestamp.now(),
                expiresAt: new Timestamp(Date.now() / 1000 + 300, 0), // 5-minute expiry
            });
            const qrDataUrl = await QRCode.toDataURL(docRef.id, { errorCorrectionLevel: 'H', width: 256 });
            setQrDialogState(prev => ({...prev, isGenerating: false, qrCodeUrl: qrDataUrl}));
        } catch (error) {
            console.error("Error generating QR code:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_qr_error_generate') });
            setQrDialogState(prev => ({...prev, isGenerating: false }));
        }
    };
    
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsSubmitting(true);
        try {
            await deleteUser(userToDelete.uid);
            toast({ title: t('admin_user_delete_success_title'), description: t('admin_user_delete_success_desc', { userName: userToDelete.name }) });
        } catch(e) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
        } finally {
            setIsSubmitting(false);
            setUserToDelete(null);
        }
    }
    
    const handleUpdateUser = async () => {
        const { user: userToUpdate, name, role } = editUserState;
        if (!userToUpdate || !name) return;
        
        setIsSubmitting(true);
        try {
            await updateUser(userToUpdate.uid, { name, userRole: role });
            toast({ title: t('admin_user_update_success_title'), description: t('admin_user_update_success_desc', { userName: name }) });
        } catch (e) {
             toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
        } finally {
            setIsSubmitting(false);
            setEditUserState({ isOpen: false, user: null, name: '', role: 'junior' });
        }
    }

    // --- UI Rendering ---
    const getDeviceIcon = (deviceName: string) => {
        if (!deviceName) return <Monitor className="h-6 w-6 text-muted-foreground" />;
        const lowerDeviceName = deviceName.toLowerCase();
        const mobileKeywords = ['iphone', 'android', 'mobile', 'tablet', 'ipad', 'galaxy', 'pixel', 'redmi', 'oneplus', 'ios', 'phone'];
        if (mobileKeywords.some(keyword => lowerDeviceName.includes(keyword))) {
            return <Smartphone className="h-6 w-6 text-muted-foreground" />;
        }
        return <Monitor className="h-6 w-6 text-muted-foreground" />;
    }

    const renderRoleIcon = (role?: UserRole) => {
        switch (role) {
            case 'senior': return <Crown className="h-5 w-5 text-amber-500" />;
            case 'junior': return <User className="h-5 w-5 text-blue-500" />;
            case 'worker': return <Archive className="h-5 w-5 text-green-500" />;
            default: return null;
        }
    };
    
    const usersSorted = allUsers.sort((a,b) => {
        if (a.uid === user?.uid) return -1;
        if (b.uid === user?.uid) return 1;
        const roleOrder = { senior: 0, junior: 1, worker: 2 };
        return roleOrder[a.userRole] - roleOrder[b.userRole];
    });

    return (
        <>
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">{t('admin_users_title')}</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_users_list_title')}</CardTitle>
                    <CardDescription>{t('admin_users_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoadingUsers ? (
                        <Skeleton className="h-40 w-full" />
                    ) : (
                        usersSorted.map(u => (
                            <div key={u.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4">
                                <div className="flex items-center gap-4">
                                    {getDeviceIcon(u.deviceName)}
                                    <div>
                                        <p className="font-semibold">{u.name} {u.uid === user?.uid && `(${t('admin_session_current_text')})`}</p>
                                        {u.createdAt && <p className="text-sm text-muted-foreground mt-1">{t('admin_session_login_time')}: {format(u.createdAt.toDate(), 'd MMM, yyyy, HH:mm', { locale: dateLocale })}</p>}
                                    </div>
                                </div>
                                <div className="flex w-full sm:w-auto items-center justify-end gap-2 mt-2 sm:mt-0">
                                    {renderRoleIcon(u.userRole)}
                                    {u.uid !== user?.uid && (
                                        <>
                                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditUserState({ isOpen: true, user: u, name: u.name, role: u.userRole })}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => setUserToDelete(u)}><Trash2 className="h-4 w-4" /></Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_qr_dialog_title')}</CardTitle>
                    <CardDescription>{t('admin_qr_dialog_desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => setQrDialogState(s => ({...s, isOpen: true}))} className="w-full"><QrCode className="mr-2 h-4 w-4" />{t('admin_qr_generate_button')}</Button>
                </CardContent>
            </Card>
        </div>
        
        {/* Dialogs */}
        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('admin_user_delete_confirm_title')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('admin_user_delete_confirm_desc', { userName: userToDelete?.name || '' })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('admin_cancel_button')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">{t('admin_delete_button')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={editUserState.isOpen} onOpenChange={() => setEditUserState({isOpen: false, user: null, name: '', role: 'junior'})}>
             <DialogContent>
                <DialogHeader><DialogTitle>{t('admin_edit_user_title')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-user-name">{t('admin_session_dialog_name_label')}</Label>
                        <Input id="edit-user-name" value={editUserState.name} onChange={(e) => setEditUserState(s => ({ ...s, name: e.target.value }))} />
                    </div>
                    {editUserState.user?.userRole !== 'senior' && (
                        <div className="space-y-2">
                            <Label>{t('admin_session_dialog_role_label')}</Label>
                            <RadioGroup value={editUserState.role} onValueChange={(value) => setEditUserState(s => ({ ...s, role: value as UserRole }))} className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="junior" id="edit-role-junior" /><Label htmlFor="edit-role-junior">{t('admin_role_junior')}</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="worker" id="edit-role-worker" /><Label htmlFor="edit-role-worker">{t('admin_role_worker')}</Label></div>
                            </RadioGroup>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditUserState({isOpen: false, user: null, name: '', role: 'junior'})}>{t('admin_cancel_button')}</Button>
                    <Button onClick={handleUpdateUser}>{t('admin_save_changes_button')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={qrDialogState.isOpen} onOpenChange={() => setQrDialogState({ isOpen: false, isGenerating: false, qrCodeUrl: null, roleToGenerate: 'junior' })}>
            <DialogContent>
                <DialogHeader><DialogTitle>{t('admin_qr_dialog_title')}</DialogTitle></DialogHeader>
                 <div className="py-4 space-y-4">
                    {!qrDialogState.qrCodeUrl ? (
                        <>
                            <div className="space-y-2">
                                <Label>{t('admin_session_dialog_role_label')}</Label>
                                <RadioGroup value={qrDialogState.roleToGenerate} onValueChange={(v) => setQrDialogState(s => ({ ...s, roleToGenerate: v as 'junior' | 'worker' }))} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="junior" id="qr-role-junior" /><Label htmlFor="qr-role-junior">{t('admin_role_junior')}</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="worker" id="qr-role-worker" /><Label htmlFor="qr-role-worker">{t('admin_role_worker')}</Label></div>
                                </RadioGroup>
                            </div>
                            <Button onClick={handleGenerateQrCode} disabled={qrDialogState.isGenerating} className="w-full">{qrDialogState.isGenerating ? t('admin_qr_generating') : t('admin_qr_generate_button')}</Button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <img src={qrDialogState.qrCodeUrl} alt="QR Code" className="rounded-lg" />
                            <p className="text-sm text-muted-foreground text-center">{t('admin_qr_scan_prompt')}</p>
                            <Button onClick={() => setQrDialogState(prev => ({...prev, qrCodeUrl: null}))}>{t('admin_qr_generate_new')}</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
