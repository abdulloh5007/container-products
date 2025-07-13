
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Container, Hourglass } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isAuthLoading, loginState } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      const redirectTo = searchParams.get('redirectTo') || '/admin/acceptance';
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isAuthLoading, router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      // On success, the useEffect for isAuthenticated will handle the redirect.
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: t('admin_login_failure_title'),
        description: (error as Error).message || t('admin_login_failure_desc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-background" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Container className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('admin_login_title')}</CardTitle>
          <CardDescription>{t('admin_login_subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loginState === 'pending' ? (
            <Alert>
              <Hourglass className="h-4 w-4" />
              <AlertTitle>{t('admin_login_pending_title')}</AlertTitle>
              <AlertDescription>
                {t('admin_login_pending_desc')}
              </AlertDescription>
            </Alert>
          ) : (
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
                 <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                 />
               </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('admin_login_submitting') : t('admin_login_button')}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t('admin_register_prompt')}{' '}
                <Link href="/admin/register" className="underline hover:text-primary">
                    {t('admin_register_link')}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
