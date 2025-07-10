
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, increment, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


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

export default function AdminAcceptancePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingContainerId, setAcceptingContainerId] = useState<string | null>(null);
  const [containerToAccept, setContainerToAccept] = useState<Container | null>(null);

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
        
        containerToAccept.products.forEach(product => {
            const productRef = doc(db, 'products', product.id);
            batch.update(productRef, { quantity: increment(product.quantity) });
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
        setContainerToAccept(null);
    }
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin_acceptance_title')}</h1>
        <p className="text-muted-foreground">{t('admin_acceptance_desc')}</p>
      </div>
      
      <Card>
        <CardHeader></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('admin_products_table_image')}</TableHead>
                <TableHead>{t('admin_acceptance_table_container')}</TableHead>
                <TableHead className="text-center">{t('admin_acceptance_table_products')}</TableHead>
                <TableHead className="text-right">{t('admin_acceptance_table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                        <TableCell className="text-right">
                            <Skeleton className="h-10 w-32 ml-auto" />
                        </TableCell>
                    </TableRow>
                 ))
              ) : containers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        {t('admin_container_no_containers')}
                    </TableCell>
                </TableRow>
              ) : (
                containers.map((container) => (
                    <TableRow key={container.id}>
                    <TableCell>
                        <Image
                            src={container.imageUrl || 'https://placehold.co/64x64.png'}
                            alt={container.name}
                            width={64}
                            height={64}
                            className="rounded-md object-cover h-16 w-16"
                        />
                    </TableCell>
                    <TableCell className="font-medium">{container.name}</TableCell>
                    <TableCell className="text-center">{container.products.reduce((acc, p) => acc + p.quantity, 0)}</TableCell>
                    <TableCell className="text-right">
                        <Button 
                            onClick={() => setContainerToAccept(container)}
                            disabled={acceptingContainerId === container.id || !container.products || container.products.length === 0}
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {acceptingContainerId === container.id ? t('admin_saving_text') : t('admin_acceptance_button')}
                        </Button>
                    </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!containerToAccept} onOpenChange={(open) => !open && setContainerToAccept(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('admin_acceptance_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('admin_acceptance_confirm_desc', { containerName: containerToAccept?.name || '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            {containerToAccept && (
              <div className="flex flex-col items-center text-center gap-4 my-4">
                  <Image
                    src={containerToAccept.imageUrl || 'https://placehold.co/128x128.png'}
                    alt={containerToAccept.name}
                    width={128}
                    height={128}
                    className="rounded-lg object-cover"
                  />
                  <p className="text-lg font-semibold">{containerToAccept.name}</p>
              </div>
            )}
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContainerToAccept(null)}>{t('admin_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleAcceptContainer} className={buttonVariants({ variant: "default" })}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('admin_acceptance_button')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
