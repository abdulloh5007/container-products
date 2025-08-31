
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Container, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useInputScrollFix } from '@/hooks/use-input-scroll-fix';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, isRegistrationAllowed } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  useInputScrollFix();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !isRegistrationAllowed) {
      router.replace('/admin/login');
    }
  }, [isLoading, isRegistrationAllowed, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      toast({
        title: t('admin_register_success_title'),
        description: t('admin_register_success_desc'),
      });
      router.push('/admin/acceptance');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: t('admin_register_failure_title'),
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading || !isRegistrationAllowed) {
      return (
         <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <Skeleton className="h-8 w-8 mx-auto mb-4 rounded-full" />
              <Skeleton className="h-7 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full mt-4" />
              <Skeleton className="h-4 w-40 mx-auto" />
            </CardContent>
          </Card>
        </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
                <Container className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('admin_register_title')}</CardTitle>
            <CardDescription>{t('admin_register_subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">{t('admin_settings_name')}</Label>
                <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isSubmitting}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">{t('admin_email')}</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">{t('admin_password')}</Label>
                <div className="relative">
                  <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
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
            <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
            >
                {isSubmitting ? t('admin_register_submitting') : t('admin_register_button')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
                {t('admin_login_prompt')}{' '}
                <Link href="/admin/login" className="underline hover:text-primary">
                    {t('admin_login_link')}
                </Link>
              </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
