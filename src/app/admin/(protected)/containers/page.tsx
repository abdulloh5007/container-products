'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';


// This structure needs to be consistent across pages
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

export default function AdminContainersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [containerToDelete, setContainerToDelete] = useState<Container | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleDelete = async () => {
    if (!containerToDelete) return;

    try {
      // Delete image from storage if it exists
      if (containerToDelete.imageUrl) {
        try {
            const imageRef = ref(storage, containerToDelete.imageUrl);
            await deleteObject(imageRef);
        } catch (deleteError) {
            console.error("Failed to delete container image: ", deleteError);
        }
      }

      // Delete the document from Firestore
      await deleteDoc(doc(db, "containers", containerToDelete.id));

      toast({
        title: t('admin_container_delete_success_title'),
        description: t('admin_container_delete_success_desc', { containerName: containerToDelete.name }),
      });

      fetchContainers(); // Refresh the list
    } catch (error) {
       console.error("Failed to delete container: ", error);
       toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setContainerToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin_containers_title')}</h1>
        <p className="text-muted-foreground">{t('admin_containers_desc')}</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle>{t('admin_sidebar_containers')}</CardTitle>
                <CardDescription>
                  {t('admin_containers_desc')}
                </CardDescription>
            </div>
            <Button asChild>
              <Link href="/admin/containers/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('admin_containers_add')}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('admin_products_table_image')}</TableHead>
                <TableHead>{t('admin_containers_table_name')}</TableHead>
                <TableHead className="text-center">{t('admin_containers_table_products')}</TableHead>
                <TableHead className="text-right">{t('admin_containers_table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-40 rounded" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-8 mx-auto rounded" /></TableCell>
                        <TableCell className="text-right space-x-2">
                            <Skeleton className="h-10 w-10 inline-block rounded" />
                            <Skeleton className="h-10 w-10 inline-block rounded" />
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
                    <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" asChild>
                            <Link href={`/admin/containers/new?id=${container.id}`}>
                                <Edit className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => setContainerToDelete(container)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!containerToDelete} onOpenChange={(open) => !open && setContainerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('admin_container_delete_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('admin_container_delete_confirm_desc', { containerName: containerToDelete?.name || '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContainerToDelete(null)}>{t('admin_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>
                    {t('admin_delete_button')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
