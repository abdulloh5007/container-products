
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, AppUser, UserRole, ViewMode } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, Hourglass, Trash2, User, UserCheck, Settings2, LogOut, Eye, EyeOff, Smartphone, Archive, Edit, History, ListCollapse, ChevronRight, Package, Box, Languages, Palette, UserCircle, Users, LayoutTemplate, Monitor, Warehouse, ChevronDown, QrCode } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Walkthrough } from '@/components/admin/walkthrough';
import { collection, onSnapshot, query, addDoc, serverTimestamp, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QRCode from 'qrcode';

// --- Components for MODERN view ---

function NavButton({ icon: Icon, title, href }: { icon: React.ElementType, title: string, href: string }) {
    const router = useRouter();
    return (
        <button onClick={() => router.push(href)} className="flex flex-col items-center justify-center gap-2 rounded-lg p-4 text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80 aspect-square text-center">
            <Icon className="h-8 w-8" />
            <span>{title}</span>
        </button>
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

interface EditUserDialogState {
    isOpen: boolean;
    user: AppUser | null;
    name: string;
    role: 'junior' | 'worker';
}

function MainSettingsContent({ view }: { view: ViewMode }) {
    const { t, language } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading, logout, updateUserProfile, updateUserPassword, toggleManagementMode, setViewMode, viewMode, deleteUser, updateUser } = useAuth();
    
    // --- State for Dialogs and Forms ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);
    
    // Profile form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

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
        if (user?.userRole === 'senior') {
            const q = query(collection(db, "users"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
                setAllUsers(usersData);
                setIsLoadingUsers(false);
            });
            return () => unsubscribe();
        }
    }, [user]);

    useEffect(() => {
        if (user?.userRole === 'senior') {
            const fetchSettings = async () => {
                const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
                if (settingsDoc.exists()) {
                    setName(settingsDoc.data().name || '');
                    setPhone(formatPhoneNumber(settingsDoc.data().phone || ''));
                }
            }
            fetchSettings();
        } else if (user) {
            setName(user.name);
        }
    }, [user]);
    
    // --- Handlers ---
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || user.userRole !== 'senior') return;
        
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
             console.error(error);
        } finally {
            setIsUpdatingMode(false);
        }
    }
    
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

    if (isAuthLoading || (isSenior && isLoadingUsers)) {
       return <Skeleton className="h-96 w-full" />;
    }
    
    // --- Modern View ---
    if (view === 'modern') {
        return (
             <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <NavButton href="/admin/history" icon={History} title={t('admin_sidebar_history')} />
                    <NavButton href="/admin/stock-history" icon={ListCollapse} title={t('admin_sidebar_stock_history')} />
                    {user?.isManagementModeEnabled && isSenior && (
                        <>
                            <NavButton href="/admin/products" icon={Package} title={t('admin_sidebar_products')} />
                            <NavButton href="/admin/containers" icon={Box} title={t('admin_sidebar_containers')} />
                        </>
                    )}
                </div>

                <Card>
                    <CardContent className="p-2 sm:p-4 divide-y sm:divide-y-0 sm:divide-x flex flex-col sm:flex-row">
                         <div className="flex-1 flex items-center justify-between p-2 sm:pr-4">
                            <span className="font-semibold">{t('language')}</span>
                            <LanguageSwitcher hasArrow />
                         </div>
                         <div className="flex-1 flex items-center justify-between p-2 sm:pl-4">
                            <span className="font-semibold">{t('toggle_theme')}</span>
                            <ThemeSwitcher hasArrow />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0 divide-y">
                        <SettingsItem title={t('admin_settings_profile_title')} icon={UserCircle} onClick={() => router.push('/admin/settings/profile')} />
                        {isSenior && <SettingsItem title={t('admin_settings_tab_users')} icon={Users} onClick={() => router.push('/admin/settings/devices')} />}
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
                                        {user?.isManagementModeEnabled ? t('admin_settings_management_mode_status_on') : t('admin_settings_management_mode_status_off')}
                                    </p>
                                </div>
                                {isUpdatingMode ? (
                                    <Skeleton className="h-6 w-11 rounded-full" />
                                ) : (
                                    <Switch
                                        checked={user?.isManagementModeEnabled}
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
    
    // --- Classic View ---
    const usersSorted = allUsers.sort((a,b) => {
        if (a.uid === user?.uid) return -1;
        if (b.uid === user?.uid) return 1;
        const roleOrder = { senior: 0, junior: 1, worker: 2 };
        return roleOrder[a.userRole] - roleOrder[b.userRole];
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className={cn("grid w-full", isSenior ? "grid-cols-2" : "grid-cols-1")}>
                    <TabsTrigger value="profile">{t('admin_settings_tab_profile')}</TabsTrigger>
                    {isSenior && <TabsTrigger value="devices">{t('admin_settings_tab_users')}</TabsTrigger>}
                </TabsList>
                
                {/* Profile Tab */}
                <TabsContent value="profile" className="mt-6 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin_settings_profile_title')}</CardTitle>
                            <CardDescription>{t('admin_settings_profile_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('admin_settings_name')}</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting || !isSenior} />
                                </div>
                                {isSenior && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">{t('admin_phone')}</Label>
                                            <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} disabled={isSubmitting} placeholder="+998 (XX) XXX-XX-XX" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">{t('admin_settings_new_password')}</Label>
                                            <div className="relative">
                                                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} placeholder={t('admin_settings_password_placeholder')} className="pr-10" />
                                                <button type="button" onClick={() => setShowPassword(!s)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{t('admin_settings_password_min_chars')}</p>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isSubmitting || !isSenior}>
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
                                        <p className="text-sm font-medium leading-none">{t('admin_settings_management_mode_label')}</p>
                                        <p className="text-sm text-muted-foreground">{user?.isManagementModeEnabled ? t('admin_settings_management_mode_status_on') : t('admin_settings_management_mode_status_off')}</p>
                                    </div>
                                    {isUpdatingMode ? <Skeleton className="h-6 w-11 rounded-full" /> : <Switch checked={user?.isManagementModeEnabled} onCheckedChange={handleToggleManagementMode} />}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                     <Button variant="outline" className="w-full justify-center gap-3 text-base text-destructive hover:text-destructive" onClick={logout}>
                        <LogOut className="h-5 w-5" />
                        {t('admin_logout')}
                    </Button>
                </TabsContent>
                
                {/* Devices Tab */}
                <TabsContent value="devices" className="mt-6 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin_users_title')}</CardTitle>
                            <CardDescription>{t('admin_users_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {usersSorted.map(u => (
                                <div key={u.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4">
                                    <div className="flex items-center gap-4">
                                        {getDeviceIcon(u.deviceName)}
                                        <div>
                                            <p className="font-semibold">{u.name} {u.uid === user?.uid && `(${t('admin_session_current_text')})`}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{t('admin_session_login_time')}: {format(u.createdAt.toDate(), 'd MMM, yyyy, HH:mm', { locale: dateLocale })}</p>
                                        </div>
                                    </div>
                                    <div className="flex w-full sm:w-auto items-center justify-end gap-2 mt-2 sm:mt-0">
                                        {renderRoleIcon(u.userRole)}
                                        {u.userRole !== 'senior' && (
                                            <>
                                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditUserState({ isOpen: true, user: u, name: u.name, role: u.userRole as 'junior' | 'worker' })}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => setUserToDelete(u)}><Trash2 className="h-4 w-4" /></Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
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
                </TabsContent>
            </Tabs>
            
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
                        <div className="space-y-2">
                            <Label>{t('admin_session_dialog_role_label')}</Label>
                            <RadioGroup value={editUserState.role} onValueChange={(value) => setEditUserState(s => ({ ...s, role: value as 'junior' | 'worker' }))} className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="junior" id="edit-role-junior" /><Label htmlFor="edit-role-junior">{t('admin_role_junior')}</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="worker" id="edit-role-worker" /><Label htmlFor="edit-role-worker">{t('admin_role_worker')}</Label></div>
                            </RadioGroup>
                        </div>
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
        </div>
    );
}


// --- Main Page Component ---
export default function SettingsPage() {
    const { user, viewMode, isLoading: isAuthLoading } = useAuth();
    
    if (isAuthLoading || !user) {
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
    
    return <MainSettingsContent view={viewMode} />;
}
