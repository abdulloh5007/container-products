
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';


interface IncludedProduct {
  id: string;
  name: string;
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

type OperationType = 'acceptance' | 'dispatch';

const EPSILON = 1e-9;

function OperationDialog({
  isOpen,
  onOpenChange,
  operationType,
  containerName,
  onConfirm,
  isSubmitting
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  operationType: OperationType | null;
  containerName: string;
  onConfirm: (containerNumber: string) => void;
  isSubmitting: boolean;
}) {
  const { t } = useLanguage();
  const [containerNumber, setContainerNumber] = useState('');

  const title = operationType === 'acceptance' ? t('admin_acceptance_confirm_title') : t('admin_dispatch_confirm_title');
  const description = operationType === 'acceptance' ? t('admin_acceptance_confirm_desc', { containerName }) : t('admin_dispatch_confirm_desc', { containerName });
  const buttonText = operationType === 'acceptance' ? t('admin_acceptance_button') : t('admin_dispatch_button');

  const handleConfirm = () => {
    onConfirm(containerNumber);
  }

  useEffect(() => {
    if (!isOpen) {
      setContainerNumber('');
    }
  }, [isOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="dialog-container-number">{t('admin_history_container_number')}</Label>
          <Input
            id="dialog-container-number"
            value={containerNumber}
            onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
            placeholder={t('admin_history_container_number_placeholder')}
            disabled={isSubmitting}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>{t('admin_cancel_button')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={operationType === 'dispatch' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isSubmitting ? t('admin_saving_text') : buttonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function OperationCard({ container, onAction, isSubmitting, onImageClick }: { container: Container, onAction: (containerId: string, type: OperationType) => void, isSubmitting: boolean, onImageClick: (url: string) => void }) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className="p-0 relative cursor-pointer" onClick={() => onImageClick(container.imageUrl || 'https://placehold.co/300x200.png')}>
        <Image
          src={container.imageUrl || 'https://placehold.co/300x200.png'}
          alt={container.name}
          width={300}
          height={200}
          unoptimized
          className="rounded-t-lg object-cover w-full aspect-[3/2]"
        />
      </CardHeader>
      <CardContent className="pt-4">
        <CardTitle>{container.name}</CardTitle>
        <CardDescription>{t('admin_acceptance_table_products')}: {container.products?.length || 0}</CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button onClick={() => onAction(container.id, 'acceptance')} disabled={isSubmitting} className="w-full">
          <ArrowDownCircle className="mr-2 h-4 w-4" />
          {t('admin_acceptance_button')}
        </Button>
        <Button variant="destructive" onClick={() => onAction(container.id, 'dispatch')} disabled={isSubmitting} className="w-full">
          <ArrowUpCircle className="mr-2 h-4 w-4" />
          {t('admin_dispatch_button')}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function AdminAcceptancePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { view, setView } = useViewSwitcher('acceptance');

  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dialogState, setDialogState] = useState<{ isOpen: boolean, containerId: string | null, operationType: OperationType | null }>({ isOpen: false, containerId: null, operationType: null });

  const [fullscreenState, setFullscreenState] = useState<FullscreenState | null>(null);

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

  const handleOperation = async (containerNumber: string) => {
    const { containerId, operationType } = dialogState;
    if (!containerId || !operationType) return;

    setIsSubmitting(true);

    const container = containers.find(c => c.id === containerId);
    if (!container) {
      setIsSubmitting(false);
      return;
    }

    try {
      const batch = writeBatch(db);
      const changeMultiplier = operationType === 'acceptance' ? 1 : -1;

      if (operationType === 'dispatch') {
        for (const p of container.products) {
          const productRef = doc(db, 'products', p.id);
          const productDoc = await getDoc(productRef);
          if (!productDoc.exists() || productDoc.data().quantity < p.quantity - EPSILON) {
            toast({ variant: 'destructive', title: t('admin_dispatch_error_title'), description: t('admin_dispatch_error_insufficient_stock', { productName: p.name || 'product' }) });
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Add to history
      const historyRef = doc(collection(db, 'history'));
      batch.set(historyRef, {
        containerId: container.id,
        containerName: container.name,
        containerNumber: containerNumber || '',
        date: serverTimestamp(),
        type: operationType,
      });

      // Update product quantities
      for (const p of container.products) {
        const productRef = doc(db, 'products', p.id);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const currentQuantity = productDoc.data().quantity || 0;
          batch.update(productRef, { quantity: currentQuantity + (p.quantity * changeMultiplier) });
        }
      }

      await batch.commit();

      const successTitle = operationType === 'acceptance' ? t('admin_acceptance_success_title') : t('admin_dispatch_success_title');
      const successDesc = operationType === 'acceptance'
        ? t('admin_acceptance_success_desc', { containerName: container.name })
        : t('admin_dispatch_success_desc', { containerName: container.name });

      toast({ title: successTitle, description: successDesc });
      setDialogState({ isOpen: false, containerId: null, operationType: null });
    } catch (error) {
      console.error("Error during operation: ", error);
      const errorTitle = operationType === 'acceptance' ? t('admin_acceptance_error_title') : t('admin_dispatch_error_title');
      const errorDesc = operationType === 'acceptance' ? t('admin_acceptance_error_desc') : t('admin_dispatch_error_desc');
      toast({ variant: 'destructive', title: errorTitle, description: errorDesc });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDialog = (containerId: string, operationType: OperationType) => {
    setDialogState({ isOpen: true, containerId, operationType });
  };

  const openFullscreen = (imageUrl: string) => {
    if (imageUrl) {
      setFullscreenState({ imageUrls: [imageUrl], startIndex: 0 });
    }
  };

  const closeFullscreen = () => {
    setFullscreenState(null);
  };

  const renderContent = () => {
    if (isLoading || isAuthLoading) {
      if (view === 'grid') {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="p-0"><Skeleton className="w-full aspect-[3/2] rounded-t-lg" /></CardHeader>
                <CardContent className="pt-4"><Skeleton className="h-6 w-3/4" /></CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        );
      }
      return (
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
              <TableCell><Skeleton className="h-6 w-32" /></TableCell>
              <TableCell><Skeleton className="h-6 w-10 mx-auto" /></TableCell>
              <TableCell className="w-[150px]"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full mt-2" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (containers.length === 0) {
      return (
        view === 'table' ? (
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">{t('admin_container_no_containers')}</TableCell>
            </TableRow>
          </TableBody>
        ) : (
          <p className="text-muted-foreground text-center col-span-full py-10">{t('admin_container_no_containers')}</p>
        )
      );
    }

    if (view === 'table') {
      return (
        <TableBody>
          {containers.map(container => (
            <TableRow key={container.id}>
              <TableCell>
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
              <TableCell className="text-center">{container.products?.length || 0}</TableCell>
              <TableCell className="w-[150px]">
                <div className="flex flex-row gap-2">
                  <Button onClick={() => handleOpenDialog(container.id, 'acceptance')} disabled={isSubmitting} size="sm" className="flex-1">
                    {t('admin_acceptance_button')}
                  </Button>
                  <Button variant="destructive" onClick={() => handleOpenDialog(container.id, 'dispatch')} disabled={isSubmitting} size="sm" className="flex-1">
                    {t('admin_dispatch_button')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers.map(container => (
          <OperationCard
            key={container.id}
            container={container}
            onAction={handleOpenDialog}
            isSubmitting={isSubmitting}
            onImageClick={openFullscreen}
          />
        ))}
      </div>
    )
  }

  if (!canViewPage) return null;

  const selectedContainer = containers.find(c => c.id === dialogState.containerId);

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{t('admin_sidebar_acceptance')}</h1>
          <div className="flex w-full sm:w-auto justify-end">
            <ViewSwitcher view={view} setView={setView} />
          </div>
        </div>

        {view === 'table' ? (
          <Card>
            <Table className="min-w-[768px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{t('admin_products_table_image')}</TableHead>
                  <TableHead>{t('admin_containers_table_name')}</TableHead>
                  <TableHead className="text-center">{t('admin_containers_table_products')}</TableHead>
                  <TableHead className="text-center w-[250px]">{t('admin_containers_table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              {renderContent()}
            </Table>
          </Card>
        ) : (
          renderContent()
        )}
      </div>

      {selectedContainer && (
        <OperationDialog
          isOpen={dialogState.isOpen}
          onOpenChange={(open) => !open && setDialogState({ isOpen: false, containerId: null, operationType: null })}
          operationType={dialogState.operationType}
          containerName={selectedContainer.name}
          onConfirm={handleOperation}
          isSubmitting={isSubmitting}
        />
      )}
      <ImageFullscreenViewer
        isOpen={!!fullscreenState}
        onClose={closeFullscreen}
        imageUrls={fullscreenState?.imageUrls}
        startIndex={fullscreenState?.startIndex}
      />
    </>
  );
}
