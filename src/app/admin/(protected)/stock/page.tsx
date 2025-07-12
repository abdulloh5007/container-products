
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, increment, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Minus, Search } from 'lucide-react';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

type ProductType = 'kit' | 'unit' | 'area';
interface Product {
    id: string;
    name: string;
    quantity: number;
    type: ProductType;
    m2PerKit?: number;
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function AdminStockPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const { view, setView } = useViewSwitcher('stock');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "products"), orderBy("name"));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: doc.data().type || 'unit' } as Product));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products: ", error);
      toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_load_error') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleQuantityChange = async (product: Product, amount: number) => {
    if (product.quantity + amount < 0) return;

    setUpdatingProductId(product.id);
    try {
        const productDoc = doc(db, 'products', product.id);
        await updateDoc(productDoc, {
            quantity: increment(amount)
        });
        
        setProducts(prevProducts => 
            prevProducts.map(p => 
                p.id === product.id ? { ...p, quantity: p.quantity + amount } : p
            )
        );

        toast({ title: t('admin_stock_update_success_title'), description: t('admin_stock_update_success_desc', { productName: product.name }) });
    } catch (error) {
        console.error("Error updating quantity: ", error);
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setUpdatingProductId(null);
    }
  };
  
  const renderProductQuantity = (product: Product) => {
    if (product.type === 'kit') {
      const totalM2 = (product.quantity * (product.m2PerKit || 0)).toFixed(2);
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-lg">{product.quantity} <span className="text-sm text-muted-foreground">{t('admin_kit_unit')}</span></span>
          <span className="text-sm text-muted-foreground">{totalM2} {t('admin_m2_unit')}</span>
        </div>
      );
    }
     if (product.type === 'area') {
      return <span className="font-semibold text-lg">{product.quantity.toFixed(2)} <span className="text-sm text-muted-foreground">{t('admin_m2_unit')}</span></span>;
    }
    return <span className="font-semibold text-lg">{product.quantity}</span>;
  }
  
  const renderCardQuantity = (product: Product) => {
      if (product.type === 'kit') {
      const totalM2 = (product.quantity * (product.m2PerKit || 0)).toFixed(2);
      return (
        <CardDescription>
            {t('admin_product_quantity')}: <span className="text-lg font-bold text-foreground">{product.quantity}</span> {t('admin_kit_unit')}
            <span className="text-muted-foreground"> ({totalM2} {t('admin_m2_unit')})</span>
        </CardDescription>
      )
    }
    if (product.type === 'area') {
      return (
        <CardDescription>
            {t('admin_product_quantity')}: <span className="text-lg font-bold text-foreground">{product.quantity.toFixed(2)}</span> {t('admin_m2_unit')}
        </CardDescription>
      )
    }
    return (
        <CardDescription>{t('admin_product_quantity')}: <span className="text-lg font-bold text-foreground">{product.quantity}</span></CardDescription>
    )
  }


  const renderContent = () => {
    if (isLoading) {
        return view === 'table' ? (
            Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right space-x-2">
                       <Skeleton className="h-10 w-24 inline-block" />
                    </TableCell>
                </TableRow>
            ))
        ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                        <CardHeader className="pt-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (filteredProducts.length === 0) {
        return view === 'table' ? (
            <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">{t('admin_product_no_products')}</TableCell>
            </TableRow>
        ) : (
            <div className="col-span-full text-center py-12">
                <p>{t('admin_product_no_products')}</p>
            </div>
        )
    }

    if (view === 'table') {
        return filteredProducts.map((product) => (
            <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="w-[200px]">{renderProductQuantity(product)}</TableCell>
                <TableCell className="text-right w-[150px]">
                    <div className="flex items-center justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleQuantityChange(product, -1)}
                            disabled={updatingProductId === product.id || product.quantity <= 0}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                         <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleQuantityChange(product, 1)}
                            disabled={updatingProductId === product.id}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        ));
    }

    return (
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
                {filteredProducts.map((product) => (
                    <motion.div
                        key={product.id}
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        layout
                    >
                         <Card>
                            <CardHeader>
                               <CardTitle className="text-lg">{product.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {renderCardQuantity(product)}
                            </CardContent>
                            <CardFooter>
                                 <div className="flex w-full items-center justify-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={() => handleQuantityChange(product, -1)}
                                        disabled={updatingProductId === product.id || product.quantity <= 0}
                                        className="w-full"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={() => handleQuantityChange(product, 1)}
                                        disabled={updatingProductId === product.id}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
  }

  return (
    <>
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-center sm:text-left">{t('admin_stock_title')}</h1>
        <div className="flex w-full sm:w-auto justify-end">
            <ViewSwitcher view={view} setView={setView} />
        </div>
      </div>

       <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin_product_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      
       {view === 'table' ? (
            <Card>
                <CardContent className="pt-6">
                <Table className="min-w-[720px]">
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin_stock_table_product')}</TableHead>
                        <TableHead className="w-[200px]">{t('admin_stock_table_quantity')}</TableHead>
                        <TableHead className="text-right w-[150px]">{t('admin_stock_table_actions')}</TableHead>
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
