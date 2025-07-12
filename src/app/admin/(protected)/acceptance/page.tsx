
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, increment, query, orderBy, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, ArrowUpRightFromSquare } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';

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

export default function AdminAcceptancePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingContainerId, setAcceptingContainerId] = useState<string | null>(null);
  const [dispatchingContainerId, setDispatchingContainerId] = useState<string | null>(null);
  const [containerToAccept, setContainerToAccept] = useState<Container | null>(null);
  const [containerToDispatch, setContainerToDispatch] = useState<Container | null>(null);
  const { view, setView } = useViewSwitcher('acceptance');
  const [fullscreenState, setFullscreenState] = useState<FullscreenState | null>(null);

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

    if (!containerToAccept.products || containerToAccept.products.length === 0) {
        setContainerToAccept(null);
        return;
    }
    
    setAcceptingContainerId(containerToAccept.id);
    
    try {
        const batch = writeBatch(db);
        
        for (const product of containerToAccept.products) {
            const productRef = doc(db, 'products', product.id);
            batch.update(productRef, { quantity: increment(product.quantity) });
        }
        
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
        setContainerToAccept(null);
    }
  }

  const handleDispatchContainer = async () => {
    if (!containerToDispatch) return;

    if (!containerToDispatch.products || containerToDispatch.products.length === 0) {
        setContainerToDispatch(null);
        return;
    }
    
    setDispatchingContainerId(containerToDispatch.id);
    
    try {
        const batch = writeBatch(db);
        
        // First, check if there is enough stock for all products
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
                setContainerToDispatch(null);
                return;
            }
        }
        
        // If all checks pass, proceed with dispatch
        for (const product of containerToDispatch.products) {
            const productRef = doc(db, 'products', product.id);
            batch.update(productRef, { quantity: increment(-product.quantity) });
        }
        
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
        setContainerToDispatch(null);
    }
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
                        <CardFooter className="flex-col gap-2">
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
                        className="rounded-md object-cover h-16 w-16 cursor-pointer"
                        onClick={() => openFullscreen(container.imageUrl || 'https://placehold.co/64x64.png')}
                    />
                </TableCell>
                <TableCell className="font-medium">{container.name}</TableCell>
                <TableCell className="text-center w-[180px]">{getTotalProducts(container)}</TableCell>
                <TableCell className="text-right w-[250px] space-x-2">
                     <Button 
                        onClick={() => setContainerToDispatch(container)}
                        disabled={isActionDisabled(container)}
                        variant="secondary"
                    >
                        <ArrowUpRightFromSquare className="mr-2 h-4 w-4" />
                        {dispatchingContainerId === container.id ? t('admin_dispatching_text') : t('admin_dispatch_button')}
                    </Button>
                    <Button 
                        onClick={() => setContainerToAccept(container)}
                        disabled={isActionDisabled(container)}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {acceptingContainerId === container.id ? t('admin_saving_text') : t('admin_acceptance_button')}
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
                            className="rounded-t-lg object-cover w-full aspect-[3/2]"
                        />
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1 flex-grow">
                        <CardTitle className="text-lg">{container.name}</CardTitle>
                        <CardDescription>{t('admin_acceptance_table_products')}: {getTotalProducts(container)}</CardDescription>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
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
                            variant="secondary"
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
                        <TableHead className="text-right w-[250px]">{t('admin_acceptance_table_actions')}</TableHead>
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

      <AlertDialog open={!!containerToAccept} onOpenChange={(open) => !open && setContainerToAccept(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('admin_acceptance_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('admin_acceptance_confirm_desc', { containerName: containerToAccept?.name || '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContainerToAccept(null)}>{t('admin_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleAcceptContainer} className={buttonVariants({ variant: "default" })}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('admin_acceptance_button')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!containerToDispatch} onOpenChange={(open) => !open && setContainerToDispatch(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('admin_dispatch_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('admin_dispatch_confirm_desc', { containerName: containerToDispatch?.name || '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContainerToDispatch(null)}>{t('admin_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDispatchContainer} className={buttonVariants({ variant: "secondary" })}>
                    <ArrowUpRightFromSquare className="mr-2 h-4 w-4" />
                    {t('admin_dispatch_button')}
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
