
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function LoginSkeleton() {
    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <Container className="h-8 w-8 text-primary" />
              </div>
              <Skeleton className="h-7 w-40 mx-auto" />
              <Skeleton className="h-4 w-56 mx-auto mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-5 w-48 mx-auto" />
            </CardContent>
        </Card>
    )
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading, user, isRegistrationAllowed } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const role = user.currentSession?.role;
      if (role === 'pending') {
          // This case should ideally not happen if coming from the senior login page,
          // but as a fallback, we direct them to the worker page.
          router.replace('/admin/loginAsWorker');
          return;
      }
      let redirectTo = '/admin/acceptance'; // Default for senior/junior
      if (role === 'worker') {
        redirectTo = '/admin/stock';
      }
      if (role === 'senior') {
        redirectTo = '/admin/acceptance';
      }
      router.replace(searchParams.get('redirectTo') || redirectTo);
    }
  }, [isAuthenticated, isLoading, router, searchParams, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error(error);
      toast({
          variant: 'destructive',
          title: t('admin_login_failure_title'),
          description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || (isAuthenticated && user?.currentSession?.role !== 'pending')) {
    return <LoginSkeleton />;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex items-center justify-center">
          <Container className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">{t('admin_login_title')}</CardTitle>
        <CardDescription className="!mt-0 text-center">{t('admin_login_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('admin_login_submitting') : t('admin_login_button')}
              </Button>
              {isRegistrationAllowed && (
                <p className="text-center text-sm text-muted-foreground">
                  {t('admin_register_prompt')}{' '}
                  <Link href="/admin/register" className="underline hover:text-primary">
                      {t('admin_register_link')}
                  </Link>
                </p>
              )}
          </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
    useInputScrollFix();
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Suspense fallback={<LoginSkeleton />}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
