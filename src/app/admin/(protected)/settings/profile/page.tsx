
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
import { ArrowLeft, Eye, EyeOff, Settings } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';


export default function ProfilePage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading, updateUserProfile, updateUserPassword, toggleManagementMode } = useAuth();
    
    // --- State for Dialogs and Forms ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Profile form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    const isSenior = user?.userRole === 'senior';
    
    useEffect(() => {
        if (isAuthLoading) return;
        if (!isSenior) {
            router.replace('/admin/acceptance');
            return;
        }

        const fetchSettings = async () => {
            const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
            if (settingsDoc.exists()) {
                setName(settingsDoc.data().name || '');
                setPhone(formatPhoneNumber(settingsDoc.data().phone || ''));
            }
        }
        fetchSettings();
    }, [user, isSenior, isAuthLoading, router]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
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
    
    if (isAuthLoading || !isSenior) {
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
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('admin_phone')}</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} disabled={isSubmitting} placeholder="+998 (XX) XXX-XX-XX" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('admin_settings_new_password')}</Label>
                            <div className="relative">
                                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} placeholder={t('admin_settings_password_placeholder')} className="pr-10" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                            </div>
                            <p className="text-xs text-muted-foreground">{t('admin_settings_password_min_chars')}</p>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? t('admin_saving_text') : t('admin_save_changes_button')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_settings_management_mode_title')}</CardTitle>
                    <CardDescription>{t('admin_settings_management_mode_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between rounded-lg border p-4">
                    <Label htmlFor="management-mode" className="flex flex-col space-y-1">
                        <span>{t('admin_settings_management_mode_label')}</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            {user?.isManagementModeEnabled
                                ? t('admin_settings_management_mode_status_on')
                                : t('admin_settings_management_mode_status_off')}
                        </span>
                    </Label>
                    <Switch
                        id="management-mode"
                        checked={user?.isManagementModeEnabled}
                        onCheckedChange={toggleManagementMode}
                    />
                </CardContent>
            </Card>

        </div>
    );
}
