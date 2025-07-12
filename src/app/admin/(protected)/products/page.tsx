
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { motion, AnimatePresence } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type ProductType = 'kit' | 'unit' | 'area';

interface Product {
    id: string; // Firestore document ID
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

export default function AdminProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { view, setView } = useViewSwitcher('products');
  const [searchQuery, setSearchQuery] = useState('');

  const [newProductName, setNewProductName] = useState('');
  const [productType, setProductType] = useState<ProductType>('unit');
  const [newProductQuantity, setNewProductQuantity] = useState<string>('');
  const [m2PerKit, setM2PerKit] = useState<string>('');


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

  const resetForm = () => {
      setNewProductName('');
      setProductType('unit');
      setNewProductQuantity('');
      setM2PerKit('');
      setProductToEdit(null);
  }

  const onModalOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setModalOpen(open);
  }

  useEffect(() => {
    if (productToEdit) {
      setNewProductName(productToEdit.name);
      setNewProductQuantity(productToEdit.quantity?.toString() ?? '');
      setProductType(productToEdit.type || 'unit');
      setM2PerKit(productToEdit.m2PerKit?.toString() ?? '');
    } else {
      resetForm();
    }
  }, [productToEdit]);
  
  const handleNumericInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setter(value);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProductName) {
      toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_form_error_desc') });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        const productData: Omit<Product, 'id'> = {
            name: newProductName,
            type: productType,
            quantity: Number(newProductQuantity) || 0,
            m2PerKit: productType === 'kit' ? (Number(m2PerKit) || 0) : 0,
        };

        if (productToEdit) {
            const productDoc = doc(db, 'products', productToEdit.id);
            await updateDoc(productDoc, productData);
            toast({ title: t('admin_product_update_success_title'), description: t('admin_product_update_success_desc', { productName: newProductName }) });
        } else {
            await addDoc(collection(db, 'products'), productData);
            toast({ title: t('admin_product_create_success_title'), description: t('admin_product_create_success_desc', { productName: newProductName }) });
        }

        fetchProducts();
        onModalOpenChange(false);
    } catch (error) {
        console.error("Error saving product: ", error);
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleOpenModalForEdit = (product: Product) => {
    setProductToEdit(product);
    setModalOpen(true);
  }
  
  const handleOpenModalForCreate = () => {
    setProductToEdit(null);
    setModalOpen(true);
  }

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
        const containersSnapshot = await getDocs(collection(db, "containers"));
        
        const batch = writeBatch(db);

        containersSnapshot.forEach(containerDoc => {
            const containerData = containerDoc.data();
            const productsInContainer = containerData.products || [];
            
            if (productsInContainer.some((p: any) => p.id === productToDelete.id)) {
                const updatedProducts = productsInContainer.filter((p: any) => p.id !== productToDelete.id);
                batch.update(containerDoc.ref, { products: updatedProducts });
            }
        });
        
        const productDocRef = doc(db, "products", productToDelete.id);
        batch.delete(productDocRef);
        
        await batch.commit();

        toast({ title: t('admin_product_delete_success_title'), description: t('admin_product_delete_success_desc', { productName: productToDelete.name }) });
        fetchProducts(); 
    } catch (error) {
        console.error("Error deleting product and updating containers: ", error);
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setProductToDelete(null);
    }
  }
  
  const renderProductQuantity = (product: Product) => {
    if (product.type === 'kit') {
      return `${product.quantity} ${t('admin_kit_unit')} (${(product.quantity * (product.m2PerKit || 0)).toFixed(2)} ${t('admin_m2_unit')})`
    }
    if (product.type === 'area') {
        return `${product.quantity} ${t('admin_m2_unit')}`
    }
    return product.quantity;
  }

  const renderContent = () => {
    if (isLoading) {
        return view === 'table' ? (
            Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
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
                        <CardHeader className="relative">
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
        return filteredProducts.map((product, index) => (
            <TableRow key={product.id}>
                <TableCell className="font-medium w-[50px]">{index + 1}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="w-[200px]">{renderProductQuantity(product)}</TableCell>
                <TableCell className="text-right w-[120px] space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleOpenModalForEdit(product)}>
                    <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setProductToDelete(product)}>
                    <Trash2 className="h-4 w-4" />
                    </Button>
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
                        <Card className="flex flex-col h-full">
                            <CardHeader className="relative">
                                <div className="absolute top-2 right-2 space-x-2 bg-transparent/10" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="outline" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background" onClick={() => handleOpenModalForEdit(product)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setProductToDelete(product)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-1 flex-grow">
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                <CardDescription>{t('admin_product_quantity')}: {renderProductQuantity(product)}</CardDescription>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
  }

  return (
    <>
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-center sm:text-left">{t('admin_products_title')}</h1>
        <div className="flex w-full sm:w-auto justify-end items-center gap-2">
            <ViewSwitcher view={view} setView={setView} />
            <Button onClick={handleOpenModalForCreate}>
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('admin_products_add')}</span>
            </Button>
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
                <Table className="min-w-[640px]">
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">{t('admin_products_table_number')}</TableHead>
                        <TableHead>{t('admin_products_table_name')}</TableHead>
                        <TableHead className="w-[200px]">{t('admin_product_quantity')}</TableHead>
                        <TableHead className="text-right w-[120px]">{t('admin_products_table_actions')}</TableHead>
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
      
      <Dialog open={isModalOpen} onOpenChange={onModalOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{productToEdit ? t('admin_products_edit_title') : t('admin_create_product_title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('admin_product_name')}</Label>
              <Input id="name" value={newProductName} onChange={e => setNewProductName(e.target.value)} disabled={isSubmitting} />
            </div>

            <div className="space-y-3">
                <Label>{t('admin_product_save_type')}</Label>
                <RadioGroup value={productType} onValueChange={(value) => setProductType(value as ProductType)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unit" id="type-unit" />
                        <Label htmlFor="type-unit">{t('admin_product_save_type_unit')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="kit" id="type-kit" />
                        <Label htmlFor="type-kit">{t('admin_product_save_type_kit')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="area" id="type-area" />
                        <Label htmlFor="type-area">{t('admin_product_save_type_area')}</Label>
                    </div>
                </RadioGroup>
            </div>
            
            {productType === 'kit' && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">
                     <div className="space-y-2">
                        <Label htmlFor="kit-quantity">{t('admin_kit_unit')}</Label>
                        <Input id="kit-quantity" type="number" value={1} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="m2-per-kit">{t('admin_m2_per_kit')}</Label>
                        <Input 
                            id="m2-per-kit" 
                            type="text"
                            value={m2PerKit} 
                            onChange={handleNumericInputChange(setM2PerKit)} 
                            disabled={isSubmitting}
                            placeholder="e.g. 2.5"
                         />
                    </div>
                </div>
            )}
            
             <div className="space-y-2">
                <Label htmlFor="initial-quantity">
                  {productType === 'area' ? t('admin_m2_unit') : t('admin_product_quantity')}
                </Label>
                <Input 
                  id="initial-quantity" 
                  type="text" 
                  min="0" 
                  value={newProductQuantity} 
                  onChange={handleNumericInputChange(setNewProductQuantity)}
                  disabled={isSubmitting} 
                  placeholder={productType === 'area' ? "e.g. 24.55" : "e.g. 10"}
                />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onModalOpenChange(false)} disabled={isSubmitting}>{t('admin_cancel_button')}</Button>
            <Button onClick={handleSaveProduct} disabled={isSubmitting}>
              {isSubmitting ? t('admin_saving_text') : (productToEdit ? t('admin_save_changes_button') : t('admin_create_button'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('admin_delete_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('admin_delete_confirm_desc', { productName: productToDelete?.name || '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProductToDelete(null)}>{t('admin_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>
                    {t('admin_delete_button')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
