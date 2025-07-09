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
import { Container } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/admin/containers');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(phone, password);
      // The redirect is handled by the effect
    } catch (error) {
      console.error(error);
      let description = t('admin_login_failure_desc');
      if (error instanceof Error) {
          if (error.message === 'Incorrect password' || error.message === 'User not found') {
             description = t('admin_login_failure_desc');
          } else {
             description = error.message;
          }
      }
      toast({
        variant: 'destructive',
        title: t('admin_login_failure_title'),
        description,
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  // Don't render if the user is already authenticated and redirect is in progress
  if (isAuthenticated) {
    return null;
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Container className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('admin_login_title')}</CardTitle>
          <CardDescription>{t('admin_login_subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('admin_phone')}</Label>
              <Input
                id="phone"
                type="text" // Use text to allow for various phone formats
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+998901234567"
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('admin_login_submitting') : t('admin_login_button')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
