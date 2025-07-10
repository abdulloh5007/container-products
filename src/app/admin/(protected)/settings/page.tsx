'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const formatDisplayPhone = (phone?: string): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 12) { // Expects format like 998901234567
        const country = cleaned.substring(0, 3);
        const operator = cleaned.substring(3, 5);
        const part1 = cleaned.substring(5, 8);
        const part2 = cleaned.substring(8, 10);
        const part3 = cleaned.substring(10, 12);
        return `+${country} (${operator}) ${part1}-${part2}-${part3}`;
    }
    return phone; // Fallback for other formats
};

const formatPhoneNumberInput = (value: string): string => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    
    // Ensure it starts with 998 and limit to 12 digits total
    let finalDigits = digits;
    if (finalDigits.startsWith('998')) {
        finalDigits = finalDigits.substring(0, 12);
    } else {
        finalDigits = `998${finalDigits}`.substring(0, 12);
    }

    const country = finalDigits.slice(0, 3);
    const operator = finalDigits.slice(3, 5);
    const part1 = finalDigits.slice(5, 8);
    const part2 = finalDigits.slice(8, 10);
    const part3 = finalDigits.slice(10, 12);
    
    let formatted = `+${country}`;
    if (operator) formatted += ` (${operator}`;
    if (part1) formatted += `) ${part1}`;
    if (part2) formatted += `-${part2}`;
    if (part3) formatted += `-${part3}`;
    
    return formatted;
}


export default function SettingsPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading, updateUser, logout } = useAuth();
    const router = useRouter();
    
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [originalPhone, setOriginalPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmingPhoneChange, setConfirmingPhoneChange] = useState(false);

    useEffect(() => {
        if (!isAuthLoading && user) {
            const fetchUserData = async () => {
                setIsLoading(true);
                try {
                    const userDocRef = doc(db, 'users', user.phone.replace(/\D/g, ''));
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        setName(userData.Name || '');
                        setPassword(userData.password || '');
                        setPhone(formatDisplayPhone(userData.phone));
                        setOriginalPhone(formatDisplayPhone(userData.phone));
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_load_error') });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchUserData();
        } else if (!isAuthLoading && !user) {
            setIsLoading(false);
        }
    }, [user, isAuthLoading, toast, t]);

    const handleUpdate = async () => {
        if (!user) return;
        
        const oldPhoneId = originalPhone.replace(/\D/g, '');
        const newPhoneId = phone.replace(/\D/g, '');
        
        if (oldPhoneId !== newPhoneId) {
             setConfirmingPhoneChange(true);
        } else {
            await proceedWithUpdate();
        }
    }

    const proceedWithUpdate = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_settings_update_error') });
            return;
        }

        if (!name || !password || !phone) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_form_error_desc') });
            return;
        }
        
        setIsSubmitting(true);
        setConfirmingPhoneChange(false);
        
        const oldPhoneId = originalPhone.replace(/\D/g, '');
        const newPhoneId = phone.replace(/\D/g, '');

        try {
            if (oldPhoneId !== newPhoneId) {
                // Phone number has changed, requires migrating the document
                const oldDocRef = doc(db, 'users', oldPhoneId);
                const newDocRef = doc(db, 'users', newPhoneId);
                
                const oldDocSnap = await getDoc(oldDocRef);
                const newDocSnap = await getDoc(newDocRef);

                if (newDocSnap.exists()) {
                    throw new Error(t('admin_phone_update_error'));
                }
                
                if (oldDocSnap.exists()) {
                    const userData = oldDocSnap.data();
                    const newData = {
                        ...userData,
                        Name: name,
                        password: password,
                        phone: `+${newPhoneId}`,
                    };
                    await setDoc(newDocRef, newData);
                    await deleteDoc(oldDocRef);
                    
                    toast({ title: t('admin_settings_update_success_title'), description: t('admin_phone_update_success')});
                    logout(); // Force re-login with new credentials
                }
            } else {
                // Phone number is the same, just update the data
                const userDocRef = doc(db, 'users', oldPhoneId);
                const dataToUpdate = {
                    Name: name,
                    password: password,
                };
                await updateDoc(userDocRef, dataToUpdate);
                updateUser({ Name: name, password: password });
                toast({ title: t('admin_settings_update_success_title'), description: t('admin_settings_update_success_desc') });
            }

        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: error.message || t('admin_data_save_error') });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const totalLoading = isLoading || isAuthLoading;

    if (totalLoading) {
        return (
          <div className="flex flex-1 justify-center items-start pt-10">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2"> <Skeleton className="h-4 w-20" /> <Skeleton className="h-10 w-full" /> </div>
                    <div className="space-y-2"> <Skeleton className="h-4 w-24" /> <Skeleton className="h-10 w-full" /> </div>
                    <div className="space-y-2"> <Skeleton className="h-4 w-28" /> <Skeleton className="h-10 w-full" /> </div>
                    <div className="flex justify-end pt-4"> <Skeleton className="h-10 w-32" /> </div>
                </CardContent>
            </Card>
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
            
            <div className="flex flex-1 justify-center items-start pt-10">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>{t('admin_settings_title')}</CardTitle>
                        <CardDescription>{t('admin_settings_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('admin_phone')}</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhoneNumberInput(e.target.value))} disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('admin_settings_name')}</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('admin_password')}</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="pr-10"
                                    disabled={isSubmitting}
                                />
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    disabled={isSubmitting}
                                >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">{showPassword ? t('admin_settings_hide_password') : t('admin_settings_show_password')}</span>
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={handleUpdate} disabled={isSubmitting}>
                                {isSubmitting ? t('admin_saving_text') : t('admin_save_changes_button')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        
        <AlertDialog open={isConfirmingPhoneChange} onOpenChange={setConfirmingPhoneChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('admin_phone_update_warning_title')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('admin_phone_update_warning_desc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmingPhoneChange(false)}>{t('admin_cancel_button')}</AlertDialogCancel>
                    <AlertDialogAction onClick={proceedWithUpdate}>{t('admin_save_changes_button')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
}
