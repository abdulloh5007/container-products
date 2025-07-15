
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

type HistoryType = 'acceptance' | 'dispatch';

interface HistoryItem {
  id: string;
  containerId: string;
  containerName: string;
  containerNumber: string;
  date: Timestamp;
  type: HistoryType;
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const TypeBadge = ({ type, t, className }: { type: HistoryType, t: (key: any) => string, className?: string }) => {
    const isAcceptance = type === 'acceptance';
    const Icon = isAcceptance ? ArrowDownCircle : ArrowUpCircle;
    const text = isAcceptance ? t('admin_history_type_accepted') : t('admin_history_type_dispatched');
    const variant = isAcceptance ? 'default' : 'secondary';
    
    return (
        <Badge variant={variant} className={cn("flex items-center gap-1.5 whitespace-nowrap", className)}>
            <Icon className="h-3.5 w-3.5" />
            <span>{text}</span>
        </Badge>
    );
};


export default function AdminHistoryPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { view, setView } = useViewSwitcher('history');
  const [searchQuery, setSearchQuery] = useState('');
  const dateLocale = language === 'uz' ? uz : ru;

  const isWorker = user?.currentSession?.role === 'worker';

  useEffect(() => {
    if (!isAuthLoading && isWorker) {
      router.replace('/admin/stock');
    }
  }, [isAuthLoading, isWorker, router]);

  const fetchHistory = useCallback(async () => {
    if (isWorker) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, "history"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryItem));
      setHistory(historyData);
    } catch (error) {
      console.error("Error fetching history: ", error);
      toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_load_error') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast, isWorker]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  
  const filteredHistory = useMemo(() => {
    return history.filter(item => 
      item.containerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.containerNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

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
                     <Card key={index} className="flex flex-col justify-between">
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2 mt-1" />
                            <Skeleton className="h-4 w-1/3 mt-2" />
                        </CardHeader>
                        <CardFooter className="p-0">
                            <Skeleton className="h-9 w-full rounded-t-none" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (filteredHistory.length === 0) {
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
        return filteredHistory.map((item) => (
            <TableRow key={item.id}>
                <TableCell className="font-medium">{item.containerName}</TableCell>
                <TableCell>{item.containerNumber}</TableCell>
                <TableCell><TypeBadge type={item.type || 'acceptance'} t={t} /></TableCell>
                <TableCell className="text-right">{item.date ? format(item.date.toDate(), "PPP HH:mm", { locale: dateLocale }) : 'N/A'}</TableCell>
            </TableRow>
        ));
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredHistory.map((item) => (
                <motion.div
                  key={item.id}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  layout
                  className="h-full"
                >
                  <Card className="flex flex-col justify-between overflow-hidden h-full">
                      <div className="p-6 flex-grow">
                          <CardTitle className="text-lg">{item.containerName}</CardTitle>
                          <CardDescription className="mt-1">
                              {t('admin_history_table_number')}: <span className="font-medium text-foreground">{item.containerNumber}</span>
                          </CardDescription>
                           <p className="text-xs text-muted-foreground mt-2">
                              {item.date ? format(item.date.toDate(), "PPP HH:mm", { locale: dateLocale }) : 'N/A'}
                           </p>
                      </div>
                       <TypeBadge 
                          type={item.type || 'acceptance'} 
                          t={t} 
                          className="w-full justify-center rounded-none rounded-b-lg h-9 text-sm" 
                      />
                  </Card>
                </motion.div>
            ))}
          </AnimatePresence>
        </div>
    );
  }

  if (isWorker && !isAuthLoading) {
    return null;
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
      
       <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin_history_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
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
