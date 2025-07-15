
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

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

export default function AdminContainersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const { user, isManagementModeEnabled, isLoading: isAuthLoading } = useAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [containerToDelete, setContainerToDelete] = useState<Container | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { view, setView } = useViewSwitcher('containers');
  const [fullscreenState, setFullscreenState] = useState<FullscreenState | null>(null);
  const role = user?.currentSession?.role;
  const isSenior = role === 'senior';
  const isWorker = role === 'worker';


  useEffect(() => {
      if (!isAuthLoading && (isWorker || !isManagementModeEnabled || !isSenior)) {
          router.replace('/admin/acceptance');
      }
  }, [isAuthLoading, isManagementModeEnabled, isSenior, isWorker, router]);

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
    if (isManagementModeEnabled && isSenior) {
      fetchContainers();
    }
  }, [fetchContainers, isManagementModeEnabled, isSenior]);

  const handleDelete = async () => {
    if (!containerToDelete) return;

    try {
      await deleteDoc(doc(db, "containers", containerToDelete.id));
      toast({
        title: t('admin_container_delete_success_title'),
        description: t('admin_container_delete_success_desc', { containerName: containerToDelete.name }),
      });
      fetchContainers();
    } catch (error) {
       console.error("Failed to delete container: ", error);
       toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setContainerToDelete(null);
    }
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
        return view === 'table' ? (
             Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-right space-x-2">
                        <Skeleton className="h-10 w-10 inline-block" />
                        <Skeleton className="h-10 w-10 inline-block" />
                    </TableCell>
                </TableRow>
             ))
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                        <CardHeader className="p-0 relative">
                             <Skeleton className="w-full aspect-[3/2] rounded-t-lg" />
                             <div className="absolute top-2 right-2 space-x-2">
                                <Skeleton className="h-8 w-8 inline-block rounded-md" />
                                <Skeleton className="h-8 w-8 inline-block rounded-md" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!isManagementModeEnabled || !isSenior) {
        return null; // Redirect is handling this
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

    if (view === 'table') {
        return containers.map((container) => (
            <TableRow key={container.id}>
                <TableCell>
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
                <TableCell className="text-center">{container.products?.length || 0}</TableCell>
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
        ));
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {containers.map((container) => (
                 <Card key={container.id}>
                    <CardHeader className="p-0 relative cursor-pointer" onClick={() => openFullscreen(container.imageUrl || 'https://placehold.co/300x200.png')}>
                        <Image
                            src={container.imageUrl || 'https://placehold.co/300x200.png'}
                            alt={container.name}
                            width={300}
                            height={200}
                            className="rounded-t-lg object-cover w-full aspect-[3/2]"
                        />
                         <div className="absolute top-2 right-2 space-x-2 bg-transparent/10" onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background" asChild>
                                <Link href={`/admin/containers/new?id=${container.id}`}>
                                    <Edit className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setContainerToDelete(container)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1">
                        <CardTitle className="text-lg">{container.name}</CardTitle>
                        <CardDescription>{t('admin_acceptance_table_products')}: {container.products?.length || 0}</CardDescription>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
  }

  if ((!isManagementModeEnabled || !isSenior || isWorker) && !isAuthLoading) {
    return null; // Render nothing while redirecting
  }

  return (
    <>
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-center sm:text-left">{t('admin_containers_title')}</h1>
        <div className="flex w-full sm:w-auto justify-end items-center gap-2">
            <ViewSwitcher view={view} setView={setView} />
            <Button asChild>
              <Link href="/admin/containers/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('admin_containers_add')}</span>
              </Link>
            </Button>
        </div>
      </div>
      
      {view === 'table' ? (
        <Card>
            <CardContent className="pt-6">
                <div className="relative w-full overflow-x-auto">
                    <Table className="min-w-[640px]">
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">{t('admin_products_table_image')}</TableHead>
                            <TableHead>{t('admin_containers_table_name')}</TableHead>
                            <TableHead className="text-center">{t('admin_containers_table_products')}</TableHead>
                            <TableHead className="text-right">{t('admin_containers_table_actions')}</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderContent()}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      ) : (
        renderContent()
      )}
      
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
    <ImageFullscreenViewer 
        isOpen={!!fullscreenState}
        onClose={closeFullscreen}
        imageUrls={fullscreenState?.imageUrls}
        startIndex={fullscreenState?.startIndex}
    />
    </>
  );
}
