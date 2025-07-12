
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface HistoryItem {
  id: string;
  containerId: string;
  containerName: string;
  containerImageUrl: string;
  containerNumber: string;
  acceptedAt: Timestamp;
  products: { id: string; quantity: number }[];
}

interface FullscreenState {
  imageUrls: string[];
  startIndex: number;
}

export default function AdminHistoryPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { view, setView } = useViewSwitcher('history');
  const [fullscreenState, setFullscreenState] = useState<FullscreenState | null>(null);
  const dateLocale = language === 'ru' ? ru : enUS;

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "acceptanceHistory"), orderBy("acceptedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryItem));
      setHistory(historyData);
    } catch (error) {
      console.error("Error fetching history: ", error);
      toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_load_error') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
            Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
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
                            <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (history.length === 0) {
        return view === 'table' ? (
            <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">{t('admin_history_no_history')}</TableCell>
            </TableRow>
        ) : (
            <div className="col-span-full text-center py-12">
                <p>{t('admin_history_no_history')}</p>
            </div>
        )
    }

    if (view === 'table') {
        return history.map((item) => (
            <TableRow key={item.id}>
                <TableCell className="w-[100px]">
                    <Image
                        src={item.containerImageUrl || 'https://placehold.co/64x64.png'}
                        alt={item.containerName}
                        width={64}
                        height={64}
                        className="rounded-md object-cover h-16 w-16 cursor-pointer"
                        onClick={() => openFullscreen(item.containerImageUrl || 'https://placehold.co/64x64.png')}
                    />
                </TableCell>
                <TableCell className="font-medium">{item.containerName}</TableCell>
                <TableCell>{item.containerNumber}</TableCell>
                <TableCell>{item.products?.length || 0}</TableCell>
                <TableCell>{item.acceptedAt ? format(item.acceptedAt.toDate(), "PPP p", { locale: dateLocale }) : 'N/A'}</TableCell>
            </TableRow>
        ));
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {history.map((item) => (
                <Card key={item.id} className="flex flex-col">
                    <CardHeader className="p-0 cursor-pointer" onClick={() => openFullscreen(item.containerImageUrl || 'https://placehold.co/300x200.png')}>
                        <Image
                            src={item.containerImageUrl || 'https://placehold.co/300x200.png'}
                            alt={item.containerName}
                            width={300}
                            height={200}
                            className="rounded-t-lg object-cover w-full aspect-[3/2]"
                        />
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1 flex-grow">
                        <CardTitle className="text-lg">{item.containerName}</CardTitle>
                        <CardDescription>
                            {t('admin_history_table_number')}: <span className="font-medium text-foreground">{item.containerNumber}</span>
                        </CardDescription>
                         <CardDescription>
                            {t('admin_acceptance_table_products')}: {item.products?.length || 0}
                        </CardDescription>
                    </CardContent>
                    <CardFooter>
                         <p className="text-xs text-muted-foreground">
                            {item.acceptedAt ? format(item.acceptedAt.toDate(), "PPP p", { locale: dateLocale }) : 'N/A'}
                         </p>
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
          <h1 className="text-3xl font-bold tracking-tight whitespace-wrap text-center sm:text-left sm:whitespace-nowrap">{t('admin_history_title')}</h1>
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
                        <TableHead>{t('admin_history_table_container')}</TableHead>
                        <TableHead>{t('admin_history_table_number')}</TableHead>
                        <TableHead>{t('admin_acceptance_table_products')}</TableHead>
                        <TableHead>{t('admin_history_table_date')}</TableHead>
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

    