'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// This structure needs to be consistent across pages
interface IncludedProduct {
  id: number;
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        const storedContainers = localStorage.getItem('containers');
        if (storedContainers) {
          setContainers(JSON.parse(storedContainers));
        }
      } catch (error) {
        console.error("Failed to parse containers from localStorage", error);
        toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_load_error') });
      }
    }
  }, [isClient, t, toast]);

  const handleDelete = () => {
    if (!containerToDelete || !isClient) return;

    try {
      const updatedContainers = containers.filter(c => c.id !== containerToDelete.id);
      localStorage.setItem('containers', JSON.stringify(updatedContainers));
      setContainers(updatedContainers);

      toast({
        title: t('admin_container_delete_success_title'),
        description: t('admin_container_delete_success_desc', { containerName: containerToDelete.name }),
      });
    } catch (error) {
       console.error("Failed to delete container from localStorage", error);
       toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setContainerToDelete(null);
    }
  };

  if (!isClient) {
    return null; // Or a loading spinner
  }

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
              {containers.length === 0 ? (
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
                    <TableCell className="text-center">{container.products.length}</TableCell>
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
