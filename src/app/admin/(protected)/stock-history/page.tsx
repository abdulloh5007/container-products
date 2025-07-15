
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Crown, User, Archive, TrendingUp, TrendingDown, Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import type { SessionRole } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';


interface StockHistoryItem {
  id: string;
  productId: string;
  productName: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  changedByUserId: string;
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
  
  // Filter and Search states
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<SessionRole[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

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

  const uniqueUsers = useMemo(() => {
    const users = new Map<string, { name: string; role: SessionRole }>();
    history.forEach(item => {
        if (!users.has(item.changedByUserId)) {
            users.set(item.changedByUserId, { name: item.changedByUserName, role: item.changedByUserRole });
        }
    });
    return Array.from(users.entries()).map(([id, data]) => ({ id, ...data }));
  }, [history]);
  
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
        const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesUser = selectedUsers.length === 0 || selectedUsers.includes(item.changedByUserId);
        const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(item.changedByUserRole);
        const matchesDate = !dateRange?.from || isWithinInterval(item.timestamp.toDate(), {
            start: startOfDay(dateRange.from),
            end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from),
        });

        return matchesSearch && matchesUser && matchesRole && matchesDate;
    });
  }, [history, searchQuery, selectedUsers, selectedRoles, dateRange]);

  const resetFilters = () => {
    setSelectedUsers([]);
    setSelectedRoles([]);
    setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  }

  const handleUserCheckedChange = (userId: string, checked: boolean | 'indeterminate') => {
    setSelectedUsers(prev => checked ? [...prev, userId] : prev.filter(id => id !== userId));
  }
  
  const handleRoleCheckedChange = (role: SessionRole, checked: boolean | 'indeterminate') => {
    setSelectedRoles(prev => checked ? [...prev, role] : prev.filter(r => r !== role));
  }
  
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

    if (filteredHistory.length === 0) {
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
            <div className="flex items-center gap-4 flex-wrap">
                <span className="font-mono text-sm sm:text-base">{item.previousQuantity.toFixed(2)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-bold text-sm sm:text-base">{item.newQuantity.toFixed(2)}</span>
                <Badge variant={isIncrease ? 'default' : 'secondary'} className="gap-1">
                    {isIncrease ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {isIncrease ? '+' : ''}{item.changeAmount.toFixed(2)}
                </Badge>
            </div>
        )
    };

    if (view === 'table') {
        return filteredHistory.map((item) => (
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
            {filteredHistory.map((item) => (
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
                                {item.timestamp ? format(item.timestamp.toDate(), "PPP HH:mm", { locale: dateLocale }) : 'N/A'}
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
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder={t('admin_stock_history_search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
            />
        </div>
        <Sheet open={isFilterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto shrink-0">
                    <Filter className="mr-2 h-4 w-4" />
                    {t('admin_filters_button')}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{t('admin_filters_title')}</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                    <div className="space-y-3">
                        <Label>{t('admin_filter_by_date')}</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y", { locale: dateLocale })} - {" "}
                                                {format(dateRange.to, "LLL dd, y", { locale: dateLocale })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y", { locale: dateLocale })
                                        )
                                    ) : (
                                        <span>{t('admin_pick_date')}</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={1}
                                    locale={dateLocale}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-3">
                        <Label>{t('admin_filter_by_user')}</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {uniqueUsers.map(userItem => (
                            <div key={userItem.id} className="flex items-center gap-2">
                                <Checkbox 
                                    id={`user-${userItem.id}`}
                                    checked={selectedUsers.includes(userItem.id)}
                                    onCheckedChange={(checked) => handleUserCheckedChange(userItem.id, checked)}
                                />
                                <Label htmlFor={`user-${userItem.id}`} className="flex items-center gap-2 font-normal cursor-pointer">
                                    <RoleIcon role={userItem.role} />
                                    {userItem.name}
                                </Label>
                            </div>
                          ))}
                        </div>
                    </div>
                    
                     <div className="space-y-3">
                        <Label>{t('admin_filter_by_role')}</Label>
                        <div className="space-y-2">
                            {(['senior', 'junior', 'worker'] as SessionRole[]).map(role => (
                                <div key={role} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`role-${role}`}
                                        checked={selectedRoles.includes(role)}
                                        onCheckedChange={(checked) => handleRoleCheckedChange(role, checked)}
                                    />
                                    <Label htmlFor={`role-${role}`} className="font-normal capitalize cursor-pointer">{t(`admin_role_${role}` as any)}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
                 <SheetFooter>
                    <Button variant="outline" onClick={resetFilters}>{t('admin_filters_reset_button')}</Button>
                    <Button onClick={() => setFilterSheetOpen(false)}>{t('admin_filters_apply_button')}</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
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

    