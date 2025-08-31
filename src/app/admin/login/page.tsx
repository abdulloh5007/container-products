
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { Container, Eye, EyeOff, QrCode, XCircle, LogIn, CameraOff, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useInputScrollFix } from '@/hooks/use-input-scroll-fix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

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
  const { login, isRegistrationAllowed, translateFirebaseError } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    const { loginWithQrToken } = useAuth();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [isScanning, setIsScanning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const codeReader = useRef(new BrowserMultiFormatReader());

    const startScan = async () => {
        setScanError(null);
        setIsScanning(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                codeReader.current.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
                    if (result) {
                        setIsScanning(false);
                        setIsSubmitting(true);
                        codeReader.current.reset();
                        stream.getTracks().forEach(track => track.stop());
                        
                        loginWithQrToken(result.getText()).catch(authError => {
                            toast({ variant: 'destructive', title: t('admin_login_failure_title'), description: (authError as Error).message });
                            setIsSubmitting(false);
                        });
                    }
                    if (error && !(error instanceof NotFoundException)) {
                       setScanError(t('admin_qr_scan_error'));
                       console.error(error);
                    }
                });
            }
        } catch (error) {
            console.error('Camera access error:', error);
            setScanError(t('admin_qr_scan_error_permission'));
            setIsScanning(false);
        }
    };
    
    const stopScan = () => {
        codeReader.current.reset();
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setIsScanning(false);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsSubmitting(true);
        const imageUrl = URL.createObjectURL(file);

        try {
            const result = await codeReader.current.decodeFromImageUrl(imageUrl);
            await loginWithQrToken(result.getText());
        } catch (error) {
            console.error("Error decoding QR from image:", error);
            toast({ variant: 'destructive', title: t('admin_login_failure_title'), description: t('admin_qr_scan_from_image_error') });
        } finally {
            setIsSubmitting(false);
            URL.revokeObjectURL(imageUrl);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    useEffect(() => {
      return () => {
        if(isScanning) {
            stopScan();
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScanning])

    if (isScanning) {
        return (
             <div className="flex flex-col items-center gap-4">
                <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-8 border-primary/50 rounded-lg animate-pulse" />
                </div>
                {scanError && <Alert variant="destructive"><CameraOff className="h-4 w-4" /><AlertDescription>{scanError}</AlertDescription></Alert>}
                <Button variant="outline" onClick={stopScan} className="w-full">
                   {t('admin_cancel_button')}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-2">
             <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }} />
            <Button
                onClick={startScan}
                className="w-full"
                disabled={isSubmitting}
            >
                <QrCode className="mr-2 h-4 w-4" />
                {isSubmitting ? t('admin_qr_login_verifying') : t('admin_qr_login_button')}
            </Button>
             <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                variant="outline"
                disabled={isSubmitting}
            >
                <ImageIcon className="mr-2 h-4 w-4" />
                {t('admin_qr_login_from_gallery_button')}
            </Button>
        </div>
    );
}

function CombinedLoginForm() {
  const { t } = useLanguage();
  const { isLoading, isAuthenticated, user, isRegistrationAllowed } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
        let redirectTo = searchParams.get('redirectTo') || '/admin/acceptance';
        if (user.userRole === 'worker') {
            redirectTo = '/admin/stock';
        } else if (user.userRole === 'junior') {
            redirectTo = '/admin/acceptance';
        }
        router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, user, router, searchParams]);
  
  if (isLoading) {
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
                <TabsTrigger value="worker">{t('admin_role_worker')}/{t('admin_role_junior')}</TabsTrigger>
                <TabsTrigger value="senior">{t('admin_role_senior')}</TabsTrigger>
            </TabsList>
            <TabsContent value="worker" className="space-y-4 pt-4">
                 <CardDescription className="text-center">{t('admin_qr_login_prompt')}</CardDescription>
                 <WorkerLoginForm />
            </TabsContent>
            <TabsContent value="senior" className="space-y-4 pt-4">
                 <CardDescription className="text-center">{t('admin_login_subtitle')}</CardDescription>
                 <SeniorLoginForm />
                 {isRegistrationAllowed === false && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                        {t('admin_no_account_prompt')}{' '}
                        <a href={`tel:${user?.phone || ''}`} className="underline hover:text-primary">{t('admin_contact_admin')}</a>
                    </p>
                 )}
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
