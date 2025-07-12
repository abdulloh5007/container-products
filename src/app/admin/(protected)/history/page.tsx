
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

type HistoryType = 'acceptance' | 'dispatch';

interface HistoryItem {
  id: string;
  containerId: string;
  containerName: string;
  containerNumber: string;
  date: Timestamp;
  type: HistoryType;
}

const TypeBadge = ({ type, t }: { type: HistoryType, t: (key: any) => string }) => {
    const isAcceptance = type === 'acceptance';
    const Icon = isAcceptance ? ArrowDownCircle : ArrowUpCircle;
    const text = isAcceptance ? t('admin_history_type_accepted') : t('admin_history_type_dispatched');
    const variant = isAcceptance ? 'default' : 'secondary';
    
    return (
        <Badge variant={variant} className="flex items-center gap-1.5 whitespace-nowrap">
            <Icon className="h-3.5 w-3.5" />
            <span>{text}</span>
        </Badge>
    );
};


export default function AdminHistoryPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { view, setView } = useViewSwitcher('history');
  const dateLocale = language === 'uz' ? uz : ru;

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "acceptanceHistory"), orderBy("date", "desc"));
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

  const renderContent = () => {
    if (isLoading) {
        return view === 'table' ? (
            Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-40 ml-auto" /></TableCell>
                </TableRow>
            ))
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index} className="flex flex-col">
                        <CardHeader className="pb-4 flex-grow">
                             <Skeleton className="h-6 w-3/4" />
                             <Skeleton className="h-4 w-1/2 mt-1" />
                        </CardHeader>
                        <CardFooter className="pt-2 flex justify-between items-center">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-7 w-24" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (history.length === 0) {
        return view === 'table' ? (
            <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">{t('admin_history_no_history')}</TableCell>
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
                <TableCell className="font-medium">{item.containerName}</TableCell>
                <TableCell>{item.containerNumber}</TableCell>
                <TableCell><TypeBadge type={item.type || 'acceptance'} t={t} /></TableCell>
                <TableCell className="text-right">{item.date ? format(item.date.toDate(), "PPP p", { locale: dateLocale }) : 'N/A'}</TableCell>
            </TableRow>
        ));
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {history.map((item) => (
                <Card key={item.id} className="flex flex-col">
                    <CardHeader className="flex-grow pb-4">
                        <CardTitle className="text-lg">{item.containerName}</CardTitle>
                        <CardDescription>
                            {t('admin_history_table_number')}: <span className="font-medium text-foreground">{item.containerNumber}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 flex justify-between items-center w-full">
                         <p className="text-xs text-muted-foreground">
                            {item.date ? format(item.date.toDate(), "PPP p", { locale: dateLocale }) : 'N/A'}
                         </p>
                         <TypeBadge type={item.type || 'acceptance'} t={t} />
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
                <Table className="min-w-[640px]">
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin_history_table_container')}</TableHead>
                        <TableHead>{t('admin_history_table_number')}</TableHead>
                        <TableHead>{t('admin_history_table_type')}</TableHead>
                        <TableHead className="text-right">{t('admin_history_table_date')}</TableHead>
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
    </>
  );
}
