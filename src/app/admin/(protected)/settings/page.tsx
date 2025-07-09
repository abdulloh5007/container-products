'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading, updateUser } = useAuth();
    
    const [name, setName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isAuthLoading) {
            if (user) {
                setName(user.Name || '');
            }
            setIsLoading(false);
        }
    }, [user, isAuthLoading]);

    const handleUpdate = async () => {
        if (!user || !user.phone) return;

        setIsSubmitting(true);

        if (newPassword && newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_settings_password_mismatch') });
            setIsSubmitting(false);
            return;
        }

        try {
            const userId = user.phone.replace(/\D/g, '');
            const userDocRef = doc(db, 'users', userId);

            const dataToUpdate: { Name: string; password?: string } = {
                Name: name,
            };

            if (newPassword) {
                dataToUpdate.password = newPassword;
            }

            await updateDoc(userDocRef, dataToUpdate);

            // Update user state in context
            updateUser({ Name: name });

            toast({ title: t('admin_settings_update_success_title'), description: t('admin_settings_update_success_desc') });
            setNewPassword('');
            setConfirmPassword('');

        } catch (error) {
            console.error("Error updating profile:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const totalLoading = isLoading || isAuthLoading;

    if (totalLoading) {
        return (
          <div className="space-y-8">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-8 w-2/3" />
            <Card className="max-w-2xl">
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardContent>
            </Card>
          </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>
                <p className="text-muted-foreground">{t('admin_settings_desc')}</p>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>{t('admin_settings_title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('admin_settings_name')}</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-password">{t('admin_settings_new_password')}</Label>
                        <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('admin_settings_password_placeholder')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">{t('admin_settings_confirm_password')}</Label>
                        <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleUpdate} disabled={isSubmitting}>
                            {isSubmitting ? t('admin_login_submitting') : t('admin_save_changes_button')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
