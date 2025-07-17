
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import { Plus, Minus, Search, Warehouse, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

type RentalStatus = 'rented' | 'departed';

interface Rental {
    id: string;
    containerNumber: string;
    rentAmount: number;
    downPayment: number;
    finalPayment?: number;
    status: RentalStatus;
    arrivalDate: Timestamp;
    departureDate?: Timestamp;
    arrivalVehicleNumber: string;
    departureVehicleNumber?: string;
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const formatNumberWithSpaces = (value: string | number): string => {
  const stringValue = String(value).replace(/\s/g, '');
  if (isNaN(Number(stringValue))) return '';
  return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const parseFormattedNumber = (value: string): number => {
  return Number(String(value).replace(/\s/g, ''));
};


export default function RentalsPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { user, isAuthLoading } = useAuth();
    const router = useRouter();

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isRemoveModalOpen, setRemoveModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Add form state
    const [containerNumber, setContainerNumber] = useState('');
    const [rentAmount, setRentAmount] = useState('');
    const [downPayment, setDownPayment] = useState('');
    const [arrivalVehicleNumber, setArrivalVehicleNumber] = useState('');

    // Remove form state
    const [rentedContainers, setRentedContainers] = useState<Rental[]>([]);
    const [isLoadingRented, setIsLoadingRented] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<Rental | null>(null);
    const [finalPayment, setFinalPayment] = useState('');
    const [departureVehicleNumber, setDepartureVehicleNumber] = useState('');
    
    // History state
    const [history, setHistory] = useState<Rental[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const dateLocale = language === 'uz' ? uz : ru;

    const isSenior = user?.currentSession?.role === 'senior';

    useEffect(() => {
        if (!isAuthLoading && !isSenior) {
            router.replace('/admin/acceptance');
        }
    }, [isAuthLoading, isSenior, router]);

    const fetchRentedContainers = useCallback(async () => {
        if (!isSenior) return;
        setIsLoadingRented(true);
        try {
            const q = query(collection(db, "rentals"), where("status", "==", "rented"), orderBy("arrivalDate", "desc"));
            const querySnapshot = await getDocs(q);
            const containersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rental));
            setRentedContainers(containersData);
        } catch (error) {
            console.error("Error fetching rented containers: ", error);
            toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_load_error') });
        } finally {
            setIsLoadingRented(false);
        }
    }, [isSenior, t, toast]);
    
    const fetchHistory = useCallback(async () => {
        if (!isSenior) return;
        setIsLoadingHistory(true);
        try {
            const q = query(collection(db, "rentals"), orderBy("arrivalDate", "desc"));
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rental));
            setHistory(historyData);
        } catch (error) {
            console.error("Error fetching rental history: ", error);
            toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_data_load_error') });
        } finally {
            setIsLoadingHistory(false);
        }
    }, [isSenior, t, toast]);
    
    useEffect(() => {
        if (isSenior) {
            fetchHistory();
        }
    }, [fetchHistory, isSenior]);

    useEffect(() => {
        if (selectedContainer) {
            const remaining = selectedContainer.rentAmount - selectedContainer.downPayment;
            setFinalPayment(formatNumberWithSpaces(remaining > 0 ? remaining : 0));
        }
    }, [selectedContainer]);

    const handleOpenRemoveModal = () => {
        fetchRentedContainers();
        setRemoveModalOpen(true);
    }
    
    const resetAddForm = () => {
        setContainerNumber('');
        setRentAmount('');
        setDownPayment('');
        setArrivalVehicleNumber('');
    }

    const handleAddRental = async () => {
        const parsedRentAmount = parseFormattedNumber(rentAmount);
        const parsedDownPayment = parseFormattedNumber(downPayment);
        if (!containerNumber || !rentAmount || parsedRentAmount <= 0) {
            toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_rental_form_error_desc') });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'rentals'), {
                containerNumber,
                rentAmount: parsedRentAmount,
                downPayment: parsedDownPayment,
                arrivalVehicleNumber,
                status: 'rented',
                arrivalDate: serverTimestamp(),
            });
            toast({ title: t('admin_rental_add_success_title'), description: t('admin_rental_add_success_desc', { containerNumber }) });
            resetAddForm();
            setAddModalOpen(false);
            fetchHistory(); // Refresh history
        } catch (error) {
            console.error("Error adding rental: ", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRemoveRental = async () => {
        if (!selectedContainer) return;
        setIsSubmitting(true);
        try {
            const rentalDoc = doc(db, 'rentals', selectedContainer.id);
            await updateDoc(rentalDoc, {
                status: 'departed',
                departureDate: serverTimestamp(),
                finalPayment: parseFormattedNumber(finalPayment),
                departureVehicleNumber,
            });
            toast({ title: t('admin_rental_remove_success_title'), description: t('admin_rental_remove_success_desc', { containerNumber: selectedContainer.containerNumber }) });
            setSelectedContainer(null);
            setRemoveModalOpen(false);
            fetchHistory(); // Refresh history
        } catch (error) {
            console.error("Error removing rental: ", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const onRemoveModalOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedContainer(null);
            setDepartureVehicleNumber('');
            setFinalPayment('');
        }
        setRemoveModalOpen(isOpen);
    }

    const filteredHistory = useMemo(() => {
        return history.filter(item =>
            item.containerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.arrivalVehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.departureVehicleNumber && item.departureVehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [history, searchQuery]);

    const renderHistory = () => {
        if (isLoadingHistory || isAuthLoading) {
            return Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />);
        }
        if (filteredHistory.length === 0) {
            return <p className="text-muted-foreground text-center col-span-full py-10">{t('admin_rental_history_empty')}</p>;
        }
        return (
            <AnimatePresence>
                {filteredHistory.map(item => (
                    <motion.div
                        key={item.id}
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        layout
                    >
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{item.containerNumber}</CardTitle>
                                        <CardDescription>{t('admin_rental_total_amount_label')}: <span className="font-bold text-foreground">{formatNumberWithSpaces(item.rentAmount)}</span></CardDescription>
                                    </div>
                                    <Badge variant={item.status === 'rented' ? 'destructive' : 'default'}>
                                        {t(`admin_rental_status_${item.status}`)}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="text-muted-foreground">
                                    <p>{t('admin_rental_arrival_info')}: {format(item.arrivalDate.toDate(), 'PPP, HH:mm', { locale: dateLocale })}</p>
                                    <p>{t('admin_rental_vehicle_number_label')}: <span className="font-medium text-foreground">{item.arrivalVehicleNumber || 'N/A'}</span></p>
                                    <p>{t('admin_rental_down_payment_label')}: <span className="font-medium text-foreground">{formatNumberWithSpaces(item.downPayment)}</span></p>
                                </div>
                                {item.departureDate && (
                                     <div className="text-muted-foreground border-t pt-2">
                                         <p>{t('admin_rental_departure_info')}: {format(item.departureDate.toDate(), 'PPP, HH:mm', { locale: dateLocale })}</p>
                                         <p>{t('admin_rental_vehicle_number_label')}: <span className="font-medium text-foreground">{item.departureVehicleNumber || 'N/A'}</span></p>
                                         <p>{t('admin_rental_final_payment_label')}: <span className="font-medium text-foreground">{formatNumberWithSpaces(item.finalPayment || 0)}</span></p>
                                     </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        );
    }
    
    if (isAuthLoading || !isSenior) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        )
    }

  return (
    <>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('admin_rentals_title')}</h1>
        <Tabs defaultValue="operations" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="operations">{t('admin_rental_tab_operations')}</TabsTrigger>
                <TabsTrigger value="history">{t('admin_rental_tab_history')}</TabsTrigger>
            </TabsList>
            <TabsContent value="operations" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setAddModalOpen(true)}>
                        <CardHeader className="flex flex-row items-center gap-4">
                           <div className="bg-primary text-primary-foreground rounded-lg p-3">
                             <Plus className="h-6 w-6" />
                           </div>
                           <div>
                             <CardTitle>{t('admin_rental_add_title')}</CardTitle>
                             <CardDescription>{t('admin_rental_add_desc')}</CardDescription>
                           </div>
                        </CardHeader>
                    </Card>
                     <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleOpenRemoveModal}>
                        <CardHeader className="flex flex-row items-center gap-4">
                           <div className="bg-destructive text-destructive-foreground rounded-lg p-3">
                              <Minus className="h-6 w-6" />
                           </div>
                           <div>
                                <CardTitle>{t('admin_rental_remove_title')}</CardTitle>
                                <CardDescription>{t('admin_rental_remove_desc')}</CardDescription>
                           </div>
                        </CardHeader>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="history" className="mt-6">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('admin_rental_search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderHistory()}
                </div>
            </TabsContent>
        </Tabs>
      </div>

      {/* Add Rental Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('admin_rental_add_title')}</DialogTitle>
                <DialogDescription>{t('admin_rental_add_dialog_desc')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="container-number">{t('admin_history_container_number')}</Label>
                    <Input id="container-number" value={containerNumber} onChange={e => setContainerNumber(e.target.value)} disabled={isSubmitting} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="arrival-vehicle-number">{t('admin_rental_vehicle_number_arrival_label')}</Label>
                    <Input id="arrival-vehicle-number" value={arrivalVehicleNumber} onChange={e => setArrivalVehicleNumber(e.target.value)} disabled={isSubmitting} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="rent-amount">{t('admin_rental_amount_label')}</Label>
                        <Input 
                            id="rent-amount" 
                            type="text" 
                            value={rentAmount} 
                            onChange={e => setRentAmount(formatNumberWithSpaces(e.target.value))} 
                            disabled={isSubmitting} 
                            placeholder="100 000"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="down-payment">{t('admin_rental_down_payment_label')}</Label>
                        <Input 
                            id="down-payment" 
                            type="text" 
                            value={downPayment} 
                            onChange={e => setDownPayment(formatNumberWithSpaces(e.target.value))} 
                            disabled={isSubmitting} 
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setAddModalOpen(false)}>{t('admin_cancel_button')}</Button>
                <Button onClick={handleAddRental} disabled={isSubmitting}>
                    {isSubmitting ? t('admin_saving_text') : t('admin_add_button')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Remove Rental Dialog */}
      <Dialog open={isRemoveModalOpen} onOpenChange={onRemoveModalOpenChange}>
          <DialogContent className="max-h-[80vh] flex flex-col">
              <DialogHeader className="flex-row items-center">
                   {selectedContainer && (
                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => setSelectedContainer(null)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <DialogTitle>{t('admin_rental_remove_title')}</DialogTitle>
              </DialogHeader>
              {!selectedContainer ? (
                <>
                  <DialogDescription>{t('admin_rental_remove_dialog_desc')}</DialogDescription>
                  <ScrollArea className="flex-grow my-4">
                      <div className="space-y-2 pr-4">
                          {isLoadingRented ? (
                              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                          ) : rentedContainers.length > 0 ? (
                              rentedContainers.map(c => (
                                  <div key={c.id} onClick={() => setSelectedContainer(c)} className="border rounded-md p-3 hover:bg-muted cursor-pointer">
                                      <p className="font-semibold">{c.containerNumber}</p>
                                  </div>
                              ))
                          ) : (
                              <p className="text-muted-foreground text-center py-6">{t('admin_rental_none_rented')}</p>
                          )}
                      </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => onRemoveModalOpenChange(false)}>{t('admin_cancel_button')}</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="py-4 space-y-4">
                       <Card>
                           <CardHeader>
                               <CardTitle>{selectedContainer.containerNumber}</CardTitle>
                           </CardHeader>
                           <CardContent className="text-sm space-y-2">
                               <p>{t('admin_rental_total_amount_label')}: <span className="font-bold">{formatNumberWithSpaces(selectedContainer.rentAmount)}</span></p>
                               <p>{t('admin_rental_down_payment_label')}: <span className="font-bold">{formatNumberWithSpaces(selectedContainer.downPayment)}</span></p>
                               <p className="text-muted-foreground">{t('admin_rental_arrival_date')}: {format(selectedContainer.arrivalDate.toDate(), 'PPP, HH:mm', { locale: dateLocale })}</p>
                           </CardContent>
                       </Card>

                       <div className="space-y-2">
                           <Label htmlFor="departure-vehicle-number">{t('admin_rental_vehicle_number_departure_label')}</Label>
                           <Input id="departure-vehicle-number" value={departureVehicleNumber} onChange={(e) => setDepartureVehicleNumber(e.target.value)} disabled={isSubmitting} />
                       </div>

                       <div className="space-y-2">
                           <Label htmlFor="final-payment">{t('admin_rental_final_payment_label')}</Label>
                           <Input 
                               id="final-payment"
                               type="text"
                               value={finalPayment}
                               onChange={(e) => setFinalPayment(formatNumberWithSpaces(e.target.value))}
                               disabled={isSubmitting}
                           />
                       </div>

                       <p className="text-sm text-destructive">{t('admin_rental_remove_confirm_text')}</p>
                  </div>
                   <DialogFooter>
                      <Button variant="outline" onClick={() => onRemoveModalOpenChange(false)}>{t('admin_cancel_button')}</Button>
                      <Button onClick={handleRemoveRental} disabled={!selectedContainer || isSubmitting} variant="destructive">
                          {isSubmitting ? t('admin_removing_text') : t('admin_remove_button')}
                      </Button>
                  </DialogFooter>
                </>
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
