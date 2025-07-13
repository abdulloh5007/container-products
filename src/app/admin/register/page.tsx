
'use client';

import { useState } from 'react';
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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      toast({
        title: t('admin_register_success_title'),
        description: t('admin_register_success_desc'),
      });
      router.push('/admin/login');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: t('admin_register_failure_title'),
        description: (error as Error).message || t('admin_register_failure_desc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

    