
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPhoneNumber, deformatPhoneNumber } from '@/lib/utils';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatePresence, motion } from 'framer-motion';

export default function ProfilePage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading, updateUserProfile, updateUserPassword } = useAuth();
    
    // --- State for Dialogs and Forms ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    
    // Profile form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const isSenior = user?.userRole === 'senior';
    
    useEffect(() => {
        if (isAuthLoading) return;
        if (!user) {
            router.replace('/admin/login');
            return;
        }

        const fetchSettings = async () => {
            const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
            if (settingsDoc.exists()) {
                setName(settingsDoc.data().name || '');
                setPhone(formatPhoneNumber(settingsDoc.data().phone || ''));
            }
        }
        if (isSenior) {
            fetchSettings();
        } else if (user) {
            setName(user.name);
        }
    }, [user, isSenior, isAuthLoading, router]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setIsSubmitting(true);
        try {
            // Update name and phone first, as it doesn't require re-authentication
            if (isSenior) {
                await updateUserProfile({ name, phone: deformatPhoneNumber(phone) });
            }

            // If a new password is provided, handle password update
            if (newPassword) {
                if (newPassword.length < 6) {
                    toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('firebase_error_auth_weak-password') });
                    return;
                }
                if (!currentPassword) {
                    toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_current_password_required') });
                    return;
                }
                await updateUserPassword(currentPassword, newPassword);
                setNewPassword('');
                setCurrentPassword('');
            }
            toast({ title: t('admin_settings_update_success_title'), description: t('admin_settings_update_success_desc') });
        } catch (error) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isAuthLoading || !user) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                 <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                         <div className="flex justify-end">
                            <Skeleton className="h-10 w-32" />
                         </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_profile_title')}</h1>
                </div>

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
                                        <Label htmlFor="new-password">{t('admin_settings_new_password')}</Label>
                                        <div className="relative">
                                            <Input id="new-password" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isSubmitting} placeholder={t('admin_settings_password_placeholder')} className="pr-10" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {newPassword && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto', marginTop: '1.5rem' }}
                                                exit={{ opacity: 0, height: 0, marginTop: '0' }}
                                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="space-y-2">
                                                    <Label htmlFor="current-password">{t('admin_current_password_label')}</Label>
                                                    <div className="relative">
                                                        <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isSubmitting} required className="pr-10" />
                                                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">{showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                                                    </div>
                                                     <p className="text-xs text-muted-foreground">{t('admin_password_change_confirm_desc')}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                            <div className="flex justify-end">
                                {isSenior && (
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? t('admin_saving_text') : t('admin_save_changes_button')}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

