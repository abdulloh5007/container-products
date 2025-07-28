
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, increment, query, orderBy, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, ArrowUpRightFromSquare, UserCheck, XCircle, User, Archive } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, Session, SessionRole } from '@/contexts/auth-context';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type ProductType = 'kit' | 'unit' | 'area';
interface IncludedProduct {
  id: string;
  quantity: number;
}
interface ProductDetails {
    name: string;
    type: ProductType;
    m2PerKit?: number;
    quantity: number;
}
interface Container {
  id: string;
  name: string;
  imageUrl?: string;
  products: IncludedProduct[];
}

interface FullscreenState {
  imageUrls: string[];
  startIndex: number;
}

function PendingRequestAlert({ session }: { session: Session }) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { approveSession, deleteSession } = useAuth();
    const [name, setName] = useState(session.deviceName);
    const [role, setRole] = useState<'junior' | 'worker'>('junior');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleApprove = async () => {
        if (!name) {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_dialog_name_required') });
            return;
        }
        setIsSubmitting(true);
        try {
            await approveSession(session, name, role);
            toast({ title: t('admin_session_confirm_success_title'), description: t('admin_session_confirm_success_desc', { deviceName: name }) });
        } catch (error) {
            console.error("Error confirming access:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_confirm_error_desc') });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDecline = async () => {
        setIsSubmitting(true);
        try {
            await deleteSession(session);
            toast({ title: t('admin_session_delete_success_title'), description: t('admin_session_delete_success_desc', { deviceName: session.deviceName }) });
        } catch (error) {
            console.error("Error deleting session:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_session_delete_error_desc') });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Alert className="backdrop-blur-md bg-white/10 dark:bg-zinc-800/20 shadow-2xl border border-white/20 dark:border-zinc-700/30 rounded-xl p-4 transition-all duration-500">
            <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-cyan-500 dark:text-cyan-400 mt-1" />
                <div className="flex-1">
                <AlertTitle className="text-zinc-900 dark:text-white mb-2 font-semibold">
                    {t("admin_session_pending_title")}
                </AlertTitle>

                <AlertDescription className="text-zinc-800 dark:text-zinc-300 space-y-4 text-sm">
                    <p>
                    {t("admin_session_dialog_confirm_setup_desc", {
                        deviceName: session.deviceName,
                    })}
                    </p>

                    <div className="space-y-2">
                    {/* Input name */}
                    <div className="space-y-1">
                        <Label htmlFor={`session-name-${session.id}`} className="text-zinc-800 dark:text-zinc-200">
                        {t("admin_session_dialog_name_label")}
                        </Label>
                        <Input
                        id={`session-name-${session.id}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        className="bg-white/20 dark:bg-zinc-900/40 backdrop-blur-sm border border-white/20 dark:border-zinc-700 text-zinc-900 dark:text-white"
                        />
                    </div>

                    {/* Role selector */}
                    <div className="space-y-1">
                        <Label className="text-zinc-800 dark:text-zinc-200">
                        {t("admin_session_dialog_role_label")}
                        </Label>
                        <RadioGroup
                        value={role}
                        onValueChange={(value) => setRole(value as "junior" | "worker")}
                        className="flex gap-4 pt-1"
                        disabled={isSubmitting}
                        >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="junior" id={`role-junior-${session.id}`} className="border-cyan-500" />
                            <Label htmlFor={`role-junior-${session.id}`} className="flex items-center gap-2 text-sm font-normal cursor-pointer text-zinc-800 dark:text-zinc-200 hover:text-cyan-600 dark:hover:text-cyan-400">
                            <User className="h-4 w-4 text-cyan-500" />
                            {t("admin_role_junior")}
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="worker" id={`role-worker-${session.id}`} className="border-green-500" />
                            <Label htmlFor={`role-worker-${session.id}`} className="flex items-center gap-2 text-sm font-normal cursor-pointer text-zinc-800 dark:text-zinc-200 hover:text-green-600 dark:hover:text-green-400">
                            <Archive className="h-4 w-4 text-green-500" />
                            {t("admin_role_worker")}
                            </Label>
                        </div>
                        </RadioGroup>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDecline}
                        disabled={isSubmitting}
                        >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t("admin_delete_button")}
                        </Button>
                        <Button
                        variant="default"
                        size="sm"
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        >
                        <UserCheck className="mr-2 h-4 w-4" />
                        {isSubmitting ? t("admin_saving_text") : t("admin_confirm_button")}
                        </Button>
                    </div>
                    </div>
                </AlertDescription>
                </div>
            </div>
        </Alert>
    );
}

export default function AdminAcceptancePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingContainerId, setAcceptingContainerId] = useState<string | null>(null);
  const [dispatchingContainerId, setDispatchingContainerId] = useState<string | null>(null);
  const [containerToAccept, setContainerToAccept] = useState<Container | null>(null);
  const [acceptanceContainerNumber, setAcceptanceContainerNumber] = useState('');
  const [dispatchContainerNumber, setDispatchContainerNumber] = useState('');
  const [containerToDispatch, setContainerToDispatch] = useState<Container | null>(null);
  const { view, setView } = useViewSwitcher('acceptance');
  const [fullscreenState, setFullscreenState] = useState<FullscreenState | null>(null);
  
  const isSenior = user?.currentSession?.role === 'senior';
  const pendingSessions = user?.sessions.filter(s => s.role === 'pending');

  const fetchContainers = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "containers"), orderBy("name"));
      const querySnapshot = await getDocs(q);
      const containersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Container));
      setContainers(containersData);
    } catch (error) {
      console.error("Error fetching containers: ", error);
      toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_load_error') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);
  
  const handleAcceptContainer = async () => {
    if (!containerToAccept) return;
    
    const finalContainerNumber = acceptanceContainerNumber.trim() || '#';

    if (!containerToAccept.products || containerToAccept.products.length === 0) {
        closeAcceptDialog();
        return;
    }
    
    setAcceptingContainerId(containerToAccept.id);
    
    try {
        const batch = writeBatch(db);
        
        for (const product of containerToAccept.products) {
            const productRef = doc(db, 'products', product.id);
            batch.update(productRef, { quantity: increment(product.quantity) });
        }
        
        const historyRef = doc(collection(db, 'history'));
        batch.set(historyRef, {
            containerId: containerToAccept.id,
            containerName: containerToAccept.name,
            containerNumber: finalContainerNumber,
            date: serverTimestamp(),
            type: 'acceptance'
        });

        await batch.commit();
        
        toast({
            title: t('admin_acceptance_success_title'),
            description: t('admin_acceptance_success_desc', { containerName: containerToAccept.name }),
        });
        
    } catch(error) {
        console.error("Error accepting container:", error);
        toast({ variant: 'destructive', title: t('admin_acceptance_error_title'), description: t('admin_acceptance_error_desc') });
    } finally {
        setAcceptingContainerId(null);
        closeAcceptDialog();
    }
  }
  
  const closeAcceptDialog = () => {
      setContainerToAccept(null);
      setAcceptanceContainerNumber('');
  }

  const handleDispatchContainer = async () => {
    if (!containerToDispatch) return;

    const finalContainerNumber = dispatchContainerNumber.trim() || '#';

    if (!containerToDispatch.products || containerToDispatch.products.length === 0) {
        closeDispatchDialog();
        return;
    }
    
    setDispatchingContainerId(containerToDispatch.id);
    
    try {
        const batch = writeBatch(db);
        
        for (const product of containerToDispatch.products) {
            const productRef = doc(db, 'products', product.id);
            const productSnap = await getDoc(productRef);
            if (!productSnap.exists() || (productSnap.data() as ProductDetails).quantity < product.quantity) {
                 toast({
                    variant: 'destructive',
                    title: t('admin_dispatch_error_title'),
                    description: t('admin_dispatch_error_insufficient_stock', { productName: productSnap.data()?.name || product.id })
                });
                setDispatchingContainerId(null);
                closeDispatchDialog();
                return;
            }
        }
        
        for (const product of containerToDispatch.products) {
            const productRef = doc(db, 'products', product.id);
            batch.update(productRef, { quantity: increment(-product.quantity) });
        }
        
        const historyRef = doc(collection(db, 'history'));
        batch.set(historyRef, {
            containerId: containerToDispatch.id,
            containerName: containerToDispatch.name,
            containerNumber: finalContainerNumber,
            date: serverTimestamp(),
            type: 'dispatch'
        });

        await batch.commit();
        
        toast({
            title: t('admin_dispatch_success_title'),
            description: t('admin_dispatch_success_desc', { containerName: containerToDispatch.name }),
        });
        
    } catch(error) {
        console.error("Error dispatching container:", error);
        toast({ variant: 'destructive', title: t('admin_dispatch_error_title'), description: t('admin_dispatch_error_desc') });
    } finally {
        setDispatchingContainerId(null);
        closeDispatchDialog();
    }
  }
  
  const closeDispatchDialog = () => {
      setContainerToDispatch(null);
      setDispatchContainerNumber('');
  }


  const getTotalProducts = (container: Container) => {
    if (!container.products) return 0;
    return container.products.length;
  }
  
  const openFullscreen = (imageUrl: string) => {
    if (imageUrl) {
        setFullscreenState({ imageUrls: [imageUrl], startIndex: 0 });
    }
  };
  
  const closeFullscreen = () => {
    setFullscreenState(null);
  };

  const renderContent = () => {
    if (isLoading) {
        return view === 'table' ? (
            Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                           <Skeleton className="h-10 w-32" />
                           <Skeleton className="h-10 w-32" />
                        </div>
                    </TableCell>
                </TableRow>
            ))
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                        <CardHeader className="p-0">
                             <Skeleton className="w-full aspect-[3/2] rounded-t-lg" />
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2">
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (containers.length === 0) {
        return view === 'table' ? (
            <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">{t('admin_container_no_containers')}</TableCell>
            </TableRow>
        ) : (
            <div className="col-span-full text-center py-12">
                <p>{t('admin_container_no_containers')}</p>
            </div>
        )
    }
    
    const isActionDisabled = (container: Container) => {
        return acceptingContainerId === container.id || dispatchingContainerId === container.id || !container.products || container.products.length === 0;
    }

    if (view === 'table') {
        return containers.map((container) => (
            <TableRow key={container.id}>
                <TableCell className="w-[100px]">
                    <Image
                        src={container.imageUrl || 'https://placehold.co/64x64.png'}
                        alt={container.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="rounded-md object-cover h-16 w-16 cursor-pointer"
                        onClick={() => openFullscreen(container.imageUrl || 'https://placehold.co/64x64.png')}
                    />
                </TableCell>
                <TableCell className="font-medium">{container.name}</TableCell>
                <TableCell className="text-center">{getTotalProducts(container)}</TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button 
                        onClick={() => setContainerToAccept(container)}
                        disabled={isActionDisabled(container)}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {acceptingContainerId === container.id ? t('admin_saving_text') : t('admin_acceptance_button')}
                    </Button>
                    <Button 
                        onClick={() => setContainerToDispatch(container)}
                        disabled={isActionDisabled(container)}
                        variant="outline"
                    >
                        <ArrowUpRightFromSquare className="mr-2 h-4 w-4" />
                        {dispatchingContainerId === container.id ? t('admin_dispatching_text') : t('admin_dispatch_button')}
                    </Button>
                </TableCell>
            </TableRow>
        ));
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {containers.map((container) => (
                <Card key={container.id} className="flex flex-col">
                    <CardHeader className="p-0 cursor-pointer" onClick={() => openFullscreen(container.imageUrl || 'https://placehold.co/300x200.png')}>
                        <Image
                            src={container.imageUrl || 'https://placehold.co/300x200.png'}
                            alt={container.name}
                            width={300}
                            height={200}
                            unoptimized
                            className="rounded-t-lg object-cover w-full aspect-[3/2]"
                        />
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1 flex-grow">
                        <CardTitle className="text-lg">{container.name}</CardTitle>
                        <CardDescription>{t('admin_acceptance_table_products')}: {getTotalProducts(container)}</CardDescription>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button 
                            onClick={() => setContainerToAccept(container)}
                            disabled={isActionDisabled(container)}
                            className="w-full"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {acceptingContainerId === container.id ? t('admin_saving_text') : t('admin_acceptance_button')}
                        </Button>
                        <Button 
                            onClick={() => setContainerToDispatch(container)}
                            disabled={isActionDisabled(container)}
                            className="w-full"
                            variant="outline"
                        >
                            <ArrowUpRightFromSquare className="mr-2 h-4 w-4" />
                            {dispatchingContainerId === container.id ? t('admin_dispatching_text') : t('admin_dispatch_button')}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
  }


  return (
    <>
    <div className="space-y-8">
        {isSenior && pendingSessions && pendingSessions.length > 0 && (
            <div className="space-y-4 sticky top-4 z-50" data-intro="pending-requests">
                {pendingSessions.map(session => (
                    <PendingRequestAlert key={session.id} session={session} />
                ))}
            </div>
        )}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight whitespace-wrap text-center sm:text-left sm:whitespace-nowrap">{t('admin_acceptance_title')}</h1>
        <div className="flex w-full justify-end">
            <ViewSwitcher view={view} setView={setView} />
        </div>
      </div>
      
      {view === 'table' ? (
        <Card>
            <CardContent className="pt-6">
                <Table className="min-w-[700px]">
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">{t('admin_products_table_image')}</TableHead>
                        <TableHead>{t('admin_acceptance_table_container')}</TableHead>
                        <TableHead className="text-center w-[180px]">{t('admin_acceptance_table_products')}</TableHead>
                        <TableHead className="text-right w-[300px]">{t('admin_acceptance_table_actions')}</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderContent()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      ) : (
        renderContent()
      )}

      <AlertDialog open={!!containerToAccept} onOpenChange={(open) => !open && closeAcceptDialog()}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('admin_acceptance_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('admin_acceptance_confirm_desc', { containerName: containerToAccept?.name || '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="container-number-acceptance">{t('admin_history_container_number')}</Label>
                <Input
                    id="container-number-acceptance"
                    value={acceptanceContainerNumber}
                    onChange={(e) => setAcceptanceContainerNumber(e.target.value.toUpperCase())}
                    placeholder={t('admin_history_container_number_placeholder')}
                    disabled={!!acceptingContainerId}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={closeAcceptDialog}>{t('admin_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleAcceptContainer} className={buttonVariants({ variant: "default" })} disabled={!!acceptingContainerId}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {acceptingContainerId ? t('admin_saving_text') : t('admin_acceptance_button')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!containerToDispatch} onOpenChange={(open) => !open && closeDispatchDialog()}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('admin_dispatch_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('admin_dispatch_confirm_desc', { containerName: containerToDispatch?.name || '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="container-number-dispatch">{t('admin_history_container_number')}</Label>
                <Input
                    id="container-number-dispatch"
                    value={dispatchContainerNumber}
                    onChange={(e) => setDispatchContainerNumber(e.target.value.toUpperCase())}
                    placeholder={t('admin_history_container_number_placeholder')}
                    disabled={!!dispatchingContainerId}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={closeDispatchDialog}>{t('admin_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDispatchContainer} className={buttonVariants({ variant: "outline" })} disabled={!!dispatchingContainerId}>
                    <ArrowUpRightFromSquare className="mr-2 h-4 w-4" />
                    {dispatchingContainerId ? t('admin_dispatching_text') : t('admin_dispatch_button')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    <ImageFullscreenViewer 
        isOpen={!!fullscreenState}
        onClose={closeFullscreen}
        imageUrls={fullscreenState?.imageUrls}
        startIndex={fullscreenState?.startIndex}
    />
    </>
  );
}
