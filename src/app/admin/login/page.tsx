
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, LoginState } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Container, Hourglass, ShieldAlert, Eye, EyeOff, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

function PendingAlert() {
    const { t } = useLanguage();
    return (
        <Alert>
            <Hourglass className="h-4 w-4" />
            <AlertTitle>{t('admin_login_pending_title')}</AlertTitle>
            <AlertDescription>{t('admin_login_pending_desc')}</AlertDescription>
        </Alert>
    );
}

function AccessDeniedAlert({ onBackClick }: { onBackClick: () => void }) {
    const { t } = useLanguage();
    return (
        <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>{t('admin_login_denied_title')}</AlertTitle>
            <AlertDescription>
                 {t('admin_login_denied_desc')}
                 <button onClick={onBackClick} className="font-bold underline hover:text-destructive-foreground mt-2 block">
                    {t('admin_back_to_login_button')}
                </button>
            </AlertDescription>
        </Alert>
    );
}


function NoAccountAlert({ onRegisterClick }: { onRegisterClick: () => void }) {
    const { t } = useLanguage();
    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{t('admin_login_no_account_title')}</AlertTitle>
            <AlertDescription>
                {t('admin_login_no_account_desc')}{' '}
                <button onClick={onRegisterClick} className="font-bold underline hover:text-destructive-foreground">
                    {t('admin_register_link')}
                </button>
            </AlertDescription>
        </Alert>
    );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isAuthLoading, loginState, setLoginState, user, isRegistrationAllowed } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background" />;
  }
  
  if (isAuthenticated && user?.currentSession?.role !== 'pending') {
     return <div className="flex min-h-screen items-center justify-center bg-background" />;
  }

  const renderStateContent = () => {
    switch (loginState) {
        case 'pending':
            return <PendingAlert />;
        case 'no_account':
            return <NoAccountAlert onRegisterClick={() => router.push('/admin/register')} />;
        case 'access_denied':
            return <AccessDeniedAlert onBackClick={() => setLoginState('form')} />
        default:
            return (
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
            )
    }
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
            {renderStateContent()}
        </CardContent>
      </Card>
    </div>
  );
}
