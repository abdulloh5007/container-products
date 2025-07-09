'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

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


export default function SettingsPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading, updateUser } = useAuth();
    const router = useRouter();
    
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isAuthLoading) {
            if (user) {
                setName(user.Name || '');
                setPassword(user.password || '');
                setPhone(formatDisplayPhone(user.phone));
            }
            setIsLoading(false);
        }
    }, [user, isAuthLoading]);

    const handleUpdate = async () => {
        if (!user || !user.phone) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_settings_update_error') });
            return;
        }

        if (!name || !password) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_form_error_desc') });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const userId = user.phone.replace(/\D/g, '');
            const userDocRef = doc(db, 'users', userId);

            const dataToUpdate = {
                Name: name,
                password: password,
            };

            await updateDoc(userDocRef, dataToUpdate);

            // Update user state in context
            updateUser({ Name: name, password: password });

            toast({ title: t('admin_settings_update_success_title'), description: t('admin_settings_update_success_desc') });

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
                    <div className="space-y-2"> <Skeleton className="h-4 w-20" /> <Skeleton className="h-10 w-full" /> </div>
                    <div className="space-y-2"> <Skeleton className="h-4 w-24" /> <Skeleton className="h-10 w-full" /> </div>
                    <div className="space-y-2"> <Skeleton className="h-4 w-28" /> <Skeleton className="h-10 w-full" /> </div>
                    <div className="flex justify-end"> <Skeleton className="h-10 w-32" /> </div>
                </CardContent>
            </Card>
          </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">{t('admin_back_button')}</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings_title')}</h1>
                    <p className="text-muted-foreground">{t('admin_settings_desc')}</p>
                </div>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>{t('admin_settings_title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('admin_phone')}</Label>
                        <Input id="phone" value={phone} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('admin_settings_name')}</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
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
                            />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                onClick={() => setShowPassword(prev => !prev)}
                            >
                               {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                               <span className="sr-only">{showPassword ? t('admin_settings_hide_password') : t('admin_settings_show_password')}</span>
                            </Button>
                        </div>
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
