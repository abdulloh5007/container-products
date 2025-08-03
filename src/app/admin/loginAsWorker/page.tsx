
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, LoginState } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Container, Hourglass, XCircle, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useInputScrollFix } from '@/hooks/use-input-scroll-fix';

function WorkerLoginSkeleton() {
    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <Container className="h-8 w-8 text-primary" />
              </div>
              <Skeleton className="h-7 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    )
}

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

function WorkerLoginForm() {
  const router = useRouter();
  const { requestWorkerAccess, loginState, setLoginState, isLoading, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // This effect handles redirection for authenticated users
    if (!isLoading && isAuthenticated && user?.currentSession?.role !== 'pending') {
      const role = user.currentSession?.role;
      let redirectTo = '/admin/acceptance'; // Default for junior/senior
      if (role === 'worker') {
        redirectTo = '/admin/stock';
      }
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, user, router]);
  
  // This effect handles redirection for workers whose status changes in real-time
  useEffect(() => {
    if (loginState === 'approved') {
        // The main AuthProvider context will redirect based on role,
        // we just need to reset the state here.
        setLoginState('form');
    }
  }, [loginState, setLoginState, router])

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

  if (isLoading) {
    return <WorkerLoginSkeleton />;
  }

  const renderContent = () => {
    switch (loginState) {
        case 'pending':
            return <PendingAlert />;
        case 'access_denied':
            return <AccessDeniedAlert onBackClick={() => setLoginState('form')} />
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
            )
    }
  }


  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex items-center justify-center">
          <Container className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">{t('admin_worker_login_title')}</CardTitle>
        <CardDescription className="!mt-2">
            {t('admin_worker_login_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
          {renderContent()}
      </CardContent>
    </Card>
  );
}

export default function LoginAsWorkerPage() {
    useInputScrollFix();
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Suspense fallback={<WorkerLoginSkeleton />}>
                <WorkerLoginForm />
            </Suspense>
        </div>
    );
}
