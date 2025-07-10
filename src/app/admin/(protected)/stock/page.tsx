
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
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

interface Product {
    id: string;
    name: string;
    quantity: number;
    imageUrl: string;
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
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
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
    if (product.quantity + amount < 0) return; // Prevent negative stock

    setUpdatingProductId(product.id);
    try {
        const productDoc = doc(db, 'products', product.id);
        await updateDoc(productDoc, {
            quantity: increment(amount)
        });
        
        // Update state locally for immediate feedback
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
  
  const renderContent = () => {
    if (isLoading) {
        return view === 'table' ? (
            Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
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
                        <CardHeader className="p-0">
                            <Skeleton className="w-full aspect-[3/2] rounded-t-lg" />
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardContent>
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
                <TableCell colSpan={4} className="h-24 text-center">{t('admin_product_no_products')}</TableCell>
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
                <TableCell>
                    <Image
                    src={product.imageUrl || 'https://placehold.co/64x64.png'}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="rounded-md object-cover h-16 w-16"
                    />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="font-semibold text-lg">{product.quantity}</TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleQuantityChange(product, -1)}
                            disabled={updatingProductId === product.id || product.quantity <= 0}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center">{product.quantity}</span>
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
                            <CardHeader className="p-0">
                                <Image
                                    src={product.imageUrl || 'https://placehold.co/300x200.png'}
                                    alt={product.name}
                                    width={300}
                                    height={200}
                                    className="rounded-t-lg object-cover w-full aspect-[3/2]"
                                />
                            </CardHeader>
                            <CardContent className="pt-4 space-y-1">
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                <CardDescription>{t('admin_product_quantity')}: <span className="text-lg font-bold text-foreground">{product.quantity}</span></CardDescription>
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
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-center sm:text-left">{t('admin_stock_title')}</h1>
        </div>
        <ViewSwitcher view={view} setView={setView} />
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
                <Table className="min-w-[640px]">
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">{t('admin_products_table_image')}</TableHead>
                        <TableHead>{t('admin_stock_table_product')}</TableHead>
                        <TableHead>{t('admin_stock_table_quantity')}</TableHead>
                        <TableHead className="text-right w-[180px]">{t('admin_stock_table_actions')}</TableHead>
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
