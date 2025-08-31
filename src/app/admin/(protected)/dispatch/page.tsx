
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, ArrowUpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IncludedProduct {
  id: string;
  name: string;
  quantity: number;
}

interface Container {
  id: string;
  name: string;
  products: IncludedProduct[];
}

interface Product {
    id: string;
    quantity: number;
}

const EPSILON = 1e-9;

function DispatchCard({ container, onAction, isSubmitting }: { container: Container, onAction: (containerId: string, containerNumber: string) => void, isSubmitting: boolean }) {
    const { t } = useLanguage();
    const [containerNumber, setContainerNumber] = useState('');
    const [isConfirmOpen, setConfirmOpen] = useState(false);

    const handleConfirm = () => {
        onAction(container.id, containerNumber);
        setConfirmOpen(false);
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{container.name}</CardTitle>
                    <CardDescription>{t('admin_acceptance_table_products')}: {container.products?.length || 0}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor={`container-number-${container.id}`}>{t('admin_history_container_number')}</Label>
                        <Input
                            id={`container-number-${container.id}`}
                            value={containerNumber}
                            onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                            placeholder={t('admin_history_container_number_placeholder')}
                            disabled={isSubmitting}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={isSubmitting} className="w-full">
                        {isSubmitting ? t('admin_dispatching_text') : t('admin_dispatch_button')}
                    </Button>
                </CardFooter>
            </Card>
            <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin_dispatch_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin_dispatch_confirm_desc', { containerName: container.name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('admin_cancel_button')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">{t('admin_confirm_button')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default function AdminDispatchPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, isAuthLoading } = useAuth();

  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canViewPage = !isAuthLoading && (user?.userRole === 'senior' || user?.userRole === 'junior');

  const fetchContainers = useCallback(async () => {
    if (!canViewPage) return;
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
  }, [canViewPage, t, toast]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  const handleDispatch = async (containerId: string, containerNumber: string) => {
    setIsSubmitting(true);
    
    const container = containers.find(c => c.id === containerId);
    if (!container) {
        setIsSubmitting(false);
        return;
    }

    try {
        const batch = writeBatch(db);
        const productsToUpdate: {ref: any, change: number, name: string}[] = [];
        
        // Pre-check stock levels
        for (const p of container.products) {
            const productRef = doc(db, 'products', p.id);
            const productDoc = await getDoc(productRef);
            if (!productDoc.exists() || productDoc.data().quantity < p.quantity - EPSILON) {
                 toast({ variant: 'destructive', title: t('admin_dispatch_error_title'), description: t('admin_dispatch_error_insufficient_stock', { productName: p.name || 'product' }) });
                 setIsSubmitting(false);
                 return;
            }
            productsToUpdate.push({ ref: productRef, change: -p.quantity, name: productDoc.data().name });
        }

        // Add to history
        const historyRef = doc(collection(db, 'history'));
        batch.set(historyRef, {
            containerId: container.id,
            containerName: container.name,
            containerNumber: containerNumber || '',
            date: serverTimestamp(),
            type: 'dispatch',
        });
        
        // Update product quantities
        for (const p of productsToUpdate) {
             const productDoc = await getDoc(p.ref);
             if (productDoc.exists()) {
                const currentQuantity = productDoc.data().quantity || 0;
                batch.update(p.ref, { quantity: currentQuantity + p.change });
             }
        }
        
        await batch.commit();

        toast({ title: t('admin_dispatch_success_title'), description: t('admin_dispatch_success_desc', { containerName: container.name }) });
    } catch (error) {
        console.error("Error during dispatch: ", error);
        toast({ variant: 'destructive', title: t('admin_dispatch_error_title'), description: t('admin_dispatch_error_desc') });
    } finally {
        setIsSubmitting(false);
    }
  };


  const renderContent = () => {
    if (isLoading || isAuthLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
        );
    }
    
    if (containers.length === 0) {
        return <p className="text-muted-foreground text-center col-span-full py-10">{t('admin_container_no_containers')}</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {containers.map(container => (
                <DispatchCard
                    key={container.id}
                    container={container}
                    onAction={handleDispatch}
                    isSubmitting={isSubmitting}
                />
            ))}
        </div>
    )
  }

  if (!canViewPage) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <ArrowUpCircle className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">{t('admin_dispatch_title')}</h1>
      </div>
      {renderContent()}
    </div>
  );
}
