
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, Session } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Container, Hourglass } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FcGoogle } from 'react-icons/fc';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle, isAuthenticated, isAuthLoading, loginState, listenForApproval, user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/admin/acceptance');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (loginState === 'pending' && user?.currentSession) {
      unsubscribe = listenForApproval(user.uid, user.currentSession);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loginState, user, listenForApproval]);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
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
    // Show a blank page or a spinner while loading or redirecting
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
            <div className="space-y-4">
              <Button
                onClick={handleGoogleLogin}
                className="w-full"
                disabled={isSubmitting}
                variant="outline"
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                {isSubmitting ? t('admin_login_submitting') : t('admin_login_google_button')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
