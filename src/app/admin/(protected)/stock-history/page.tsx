
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { ArrowRight, Crown, User, Archive, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import type { SessionRole } from '@/contexts/auth-context';

interface StockHistoryItem {
  id: string;
  productId: string;
  productName: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  changedByUserName: string;
  changedByUserRole: SessionRole;
  timestamp: Timestamp;
}

const RoleIcon = ({ role }: { role: SessionRole }) => {
    switch (role) {
        case 'senior': return <Crown className="h-4 w-4 text-amber-500" />;
        case 'junior': return <User className="h-4 w-4 text-blue-500" />;
        case 'worker': return <Archive className="h-4 w-4 text-green-500" />;
        default: return null;
    }
}

export default function AdminStockHistoryPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<StockHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { view, setView } = useViewSwitcher('stock-history');
  const dateLocale = language === 'uz' ? uz : ru;

  const isSenior = user?.currentSession?.role === 'senior';

  useEffect(() => {
    if (!isAuthLoading && !isSenior) {
      router.replace('/admin/acceptance');
    }
  }, [isAuthLoading, isSenior, router]);

  const fetchHistory = useCallback(async () => {
    if (!isSenior) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, "stock_history"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockHistoryItem));
      setHistory(historyData);
    } catch (error) {
      console.error("Error fetching stock history: ", error);
      toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_load_error') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast, isSenior]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const renderContent = () => {
    if (isLoading) {
        return view === 'table' ? (
            Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-40 ml-auto" /></TableCell>
                </TableRow>
            ))
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                     <Card key={index}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-5 w-1/2 mt-2" />
                            <Skeleton className="h-4 w-1/3 mt-4" />
                            <Skeleton className="h-4 w-1/2 mt-1" />
                        </CardHeader>
                     </Card>
                ))}
            </div>
        )
    }

    if (history.length === 0) {
        return view === 'table' ? (
            <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">{t('admin_stock_history_no_history')}</TableCell>
            </TableRow>
        ) : (
            <div className="col-span-full text-center py-12">
                <p>{t('admin_stock_history_no_history')}</p>
            </div>
        )
    }
    
    const ChangeIndicator = ({ item }: { item: StockHistoryItem }) => {
        const isIncrease = item.changeAmount > 0;
        return (
            <div className="flex items-center gap-4">
                <span className="font-mono">{item.previousQuantity.toFixed(2)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-bold">{item.newQuantity.toFixed(2)}</span>
                <Badge variant={isIncrease ? 'default' : 'secondary'} className="gap-1">
                    {isIncrease ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {isIncrease ? '+' : ''}{item.changeAmount.toFixed(2)}
                </Badge>
            </div>
        )
    };

    if (view === 'table') {
        return history.map((item) => (
            <TableRow key={item.id}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell>
                   <ChangeIndicator item={item} />
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <RoleIcon role={item.changedByUserRole} />
                        <span>{item.changedByUserName}</span>
                    </div>
                </TableCell>
                <TableCell className="text-right">{item.timestamp ? format(item.timestamp.toDate(), "PPP HH:mm", { locale: dateLocale }) : 'N/A'}</TableCell>
            </TableRow>
        ));
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {history.map((item) => (
                <Card key={item.id}>
                    <CardHeader>
                        <CardTitle className="text-lg">{item.productName}</CardTitle>
                        <div className="pt-2">
                           <ChangeIndicator item={item} />
                        </div>
                    </CardHeader>
                    <CardContent className="border-t pt-4">
                        <div className="flex items-center justify-between text-sm">
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <RoleIcon role={item.changedByUserRole} />
                                <span>{item.changedByUserName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {item.timestamp ? format(item.timestamp.toDate(), "P, HH:mm", { locale: dateLocale }) : 'N/A'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
  }

  if (!isSenior && !isAuthLoading) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight whitespace-wrap text-center sm:text-left sm:whitespace-nowrap">{t('admin_stock_history_title')}</h1>
        <div className="flex w-full justify-end">
            <ViewSwitcher view={view} setView={setView} />
        </div>
      </div>
      
      {view === 'table' ? (
        <Card>
            <CardContent className="pt-6">
                <Table className="min-w-[720px]">
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin_stock_history_table_product')}</TableHead>
                        <TableHead>{t('admin_stock_history_table_change')}</TableHead>
                        <TableHead>{t('admin_stock_history_table_user')}</TableHead>
                        <TableHead className="text-right">{t('admin_stock_history_table_date')}</TableHead>
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
  );
}
