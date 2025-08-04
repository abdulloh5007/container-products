
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, LoginState } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Container, Eye, EyeOff, Hourglass, XCircle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useInputScrollFix } from '@/hooks/use-input-scroll-fix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    )
}

function SeniorLoginForm() {
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
        let redirectTo = '/admin/acceptance'; 
        if (user.currentSession?.role === 'worker') {
            redirectTo = '/admin/stock';
        }
        router.replace(searchParams.get('redirectTo') || redirectTo);
    }
  }, [isAuthenticated, isLoading, router, searchParams, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast({
          title: t('admin_login_success_title', {defaultValue: "Login Successful"}),
          description: t('admin_login_success_desc', {defaultValue: "Redirecting..."}),
      });
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

  return (
    <>
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
    </>
  );
}

function WorkerLoginForm() {
    const router = useRouter();
    const { requestWorkerAccess, loginState, setLoginState, isLoading, isAuthenticated, user } = useAuth();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isLoading && isAuthenticated && user?.currentSession?.role !== 'pending') {
            const role = user.currentSession?.role;
            let redirectTo = '/admin/acceptance'; // Default for junior/senior
            if (role === 'worker') {
                redirectTo = '/admin/stock';
            }
            router.replace(redirectTo);
        }
    }, [isAuthenticated, isLoading, user, router]);

    const handleRequestAccess = async () => {
        setIsSubmitting(true);
        try {
            await requestWorkerAccess();
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: t('admin_form_error_title'),
                description: (error as Error).message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    function PendingAlert() {
        return (
            <Alert>
                <Hourglass className="h-4 w-4" />
                <AlertTitle>{t('admin_login_pending_title')}</AlertTitle>
                <AlertDescription>{t('admin_login_pending_desc')}</AlertDescription>
            </Alert>
        );
    }

    function AccessDeniedAlert() {
        return (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{t('admin_login_denied_title')}</AlertTitle>
                <AlertDescription>
                     {t('admin_login_denied_desc')}
                     <button onClick={() => setLoginState('form')} className="font-bold underline hover:text-destructive-foreground mt-2 block">
                        {t('admin_worker_login_button')}
                    </button>
                </AlertDescription>
            </Alert>
        );
    }
    
    switch (loginState) {
        case 'pending':
            return <PendingAlert />;
        case 'access_denied':
            return <AccessDeniedAlert />;
        default:
            return (
                <Button
                    onClick={handleRequestAccess}
                    className="w-full"
                    disabled={isSubmitting}
                >
                    <LogIn className="mr-2 h-4 w-4" />
                    {isSubmitting ? t('admin_login_submitting') : t('admin_worker_login_button')}
                </Button>
            );
    }
}


function CombinedLoginForm() {
  const { t } = useLanguage();
  const { isLoading, isAuthenticated, user } = useAuth();
  
  if (isLoading || (isAuthenticated && user)) {
    return <LoginSkeleton />;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex items-center justify-center">
          <Container className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">{t('admin_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="worker" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="worker">{t('admin_role_worker')}</TabsTrigger>
                <TabsTrigger value="senior">{t('admin_role_senior')}</TabsTrigger>
            </TabsList>
            <TabsContent value="worker" className="space-y-4 pt-4">
                 <CardDescription className="text-center">{t('admin_worker_login_desc')}</CardDescription>
                 <WorkerLoginForm />
            </TabsContent>
            <TabsContent value="senior" className="space-y-4 pt-4">
                 <CardDescription className="text-center">{t('admin_login_subtitle')}</CardDescription>
                 <SeniorLoginForm />
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
    useInputScrollFix();
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Suspense fallback={<LoginSkeleton />}>
                <CombinedLoginForm />
            </Suspense>
        </div>
    );
}
