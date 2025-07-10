
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, increment, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Minus } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    quantity: number;
    imageUrl: string;
}

export default function AdminStockPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

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
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin_stock_title')}</h1>
        <p className="text-muted-foreground">{t('admin_stock_desc')}</p>
      </div>
      
      <Card>
        <CardHeader></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('admin_products_table_image')}</TableHead>
                <TableHead>{t('admin_stock_table_product')}</TableHead>
                <TableHead>{t('admin_stock_table_quantity')}</TableHead>
                <TableHead className="text-right w-[180px]">{t('admin_stock_table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
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
              ) : products.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        {t('admin_product_no_products')}
                    </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
