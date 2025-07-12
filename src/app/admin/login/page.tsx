
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
import { Container, Eye, EyeOff, ShieldCheck, Hourglass } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formatPhoneNumberInput = (value: string): string => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    
    let finalDigits = digits;
    if (finalDigits.startsWith('998')) {
        finalDigits = finalDigits.substring(0, 12);
    } else {
        finalDigits = `998${finalDigits}`.substring(0, 12);
    }

    const country = finalDigits.slice(0, 3);
    const operator = finalDigits.slice(3, 5);
    const part1 = finalDigits.slice(5, 8);
    const part2 = finalDigits.slice(8, 10);
    const part3 = finalDigits.slice(10, 12);
    
    let formatted = `+${country}`;
    if (operator) formatted += ` (${operator}`;
    if (part1) formatted += `) ${part1}`;
    if (part2) formatted += `-${part2}`;
    if (part3) formatted += `-${part3}`;
    
    return formatted;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginState, setLoginState] = useState<'form' | 'pending' | 'failed'>('form');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/admin/acceptance');
    }
  }, [isAuthenticated, router]);
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumberInput(e.target.value);
    setPhone(formatted);
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginState('form');
    
    const success = await login(phone, password);
    
    if (success) {
        // If login is successful but user is not authenticated, it means session is pending
        if (!isAuthenticated) {
             setLoginState('pending');
        }
    } else {
        setLoginState('failed');
        toast({
            variant: 'destructive',
            title: t('admin_login_failure_title'),
            description: t('admin_login_failure_desc'),
        });
    }
    
    setIsSubmitting(false);
  };
  
  if (isAuthenticated) {
    return null;
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
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
                  <AlertTitle>Ожидание подтверждения</AlertTitle>
                  <AlertDescription>
                      Ваш запрос на вход отправлен старшему админу. Пожалуйста, ожидайте подтверждения.
                  </AlertDescription>
              </Alert>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('admin_phone')}</Label>
                <Input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                  placeholder="+998 (90) 123-45-67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('admin_password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('admin_login_submitting') : t('admin_login_button')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
