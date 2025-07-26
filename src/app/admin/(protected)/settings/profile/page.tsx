
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Eye, EyeOff, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPhoneNumber, deformatPhoneNumber } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ProfileSettingsPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user: currentUser, logout, isAuthLoading, updateUserProfile, deleteUserAccount, updateUserPassword } = useAuth();
    const router = useRouter();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);

    // Profile tab state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    const role = currentUser?.currentSession?.role;
    const isSenior = role === 'senior';

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
        if (password) {
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
            setDeleteAlertOpen(false);
        }
    }
    
    if (isAuthLoading) {
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

    return (
      <>
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">{t('admin_back_button')}</span>
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('admin_settings_profile_title')}</h1>
                </div>
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
                        
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting || isAuthLoading}>
                                {isSubmitting ? t('admin_saving_text') : t('admin_save_changes_button')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

             {isSenior && (
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">{t('admin_account_delete_title')}</CardTitle>
                        <CardDescription>{t('admin_account_delete_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button variant="destructive" onClick={() => setDeleteAlertOpen(true)}>
                            {t('admin_account_delete_button')}
                        </Button>
                    </CardContent>
                </Card>
            )}

        </div>

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('admin_account_delete_confirm_title')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('admin_account_delete_confirm_desc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteAlertOpen(false)}>{t('admin_cancel_button')}</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteAccount} 
                        disabled={isSubmitting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isSubmitting ? t('admin_saving_text') : t('admin_delete_button')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </>
    );
}
