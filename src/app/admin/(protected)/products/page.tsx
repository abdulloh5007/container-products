
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { PlusCircle, Edit, Trash2, UploadCloud, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
    id: string; // Firestore document ID
    name: string;
    quantity: number;
    imageUrl: string; // Will store a Base64 Data URI
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};


// Helper to convert a file to a Base64 data URI
const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});


function ImageUploader({ file, setFile, previewUrl, disabled }: { file: File | null, setFile: (file: File | null) => void, previewUrl?: string | null, disabled?: boolean }) {
  const { t } = useLanguage();
  const [currentPreview, setCurrentPreview] = useState<string | null>(previewUrl || null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
      const newPreview = URL.createObjectURL(acceptedFiles[0]);
      setCurrentPreview(newPreview);
    }
  }, [setFile]);

  useEffect(() => {
    if (file) {
        const newPreview = URL.createObjectURL(file);
        setCurrentPreview(newPreview);
        return () => URL.revokeObjectURL(newPreview);
    } else if (previewUrl) {
        setCurrentPreview(previewUrl)
    } else {
        setCurrentPreview(null);
    }
  }, [file, previewUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/50 p-4 text-center transition-colors flex items-center justify-center ${disabled ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary'} ${isDragActive ? 'border-primary bg-primary/10' : ''}`}
    >
      <input {...getInputProps()} />
      {currentPreview ? (
        <div className="relative h-full w-full">
            <Image src={currentPreview} alt="Preview" layout="fill" objectFit="contain" className="rounded-md" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-full">
          <UploadCloud className="h-8 w-8" />
          <p className="font-semibold text-foreground">
            {t('admin_product_image_drop')}
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
        </div>
      )}
    </div>
  );
}


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
  const [newProductQuantity, setNewProductQuantity] = useState(1);
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

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

  const resetForm = () => {
      setNewProductName('');
      setNewProductQuantity(1);
      setNewProductImage(null);
      setProductToEdit(null);
      setExistingImageUrl(null);
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
      setNewProductQuantity(productToEdit.quantity);
      setExistingImageUrl(productToEdit.imageUrl);
      setNewProductImage(null); // Clear file input
    } else {
      resetForm();
    }
  }, [productToEdit]);

  const handleSaveProduct = async () => {
    if (!newProductName || newProductQuantity < 1) {
      toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_form_error_desc') });
      return;
    }

    if (!productToEdit && !newProductImage) {
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_form_error_desc') });
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        let imageUrl = productToEdit ? productToEdit.imageUrl : '';

        if (newProductImage) {
            imageUrl = await fileToDataUri(newProductImage);
        }

        const productData = {
            name: newProductName,
            quantity: newProductQuantity,
            imageUrl: imageUrl
        };

        if (productToEdit) {
            const productDoc = doc(db, 'products', productToEdit.id);
            await updateDoc(productDoc, productData);
            toast({ title: t('admin_product_update_success_title'), description: t('admin_product_update_success_desc', { productName: newProductName }) });
        } else {
            await addDoc(collection(db, 'products'), productData);
            toast({ title: t('admin_product_create_success_title'), description: t('admin_product_create_success_desc', { productName: newProductName }) });
        }

        fetchProducts(); // Refresh data
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
        await deleteDoc(doc(db, "products", productToDelete.id));

        toast({ title: t('admin_product_delete_success_title'), description: t('admin_product_delete_success_desc', { productName: productToDelete.name }) });
        fetchProducts(); // Refresh data
    } catch (error) {
        console.error("Error deleting product: ", error);
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setProductToDelete(null);
    }
  }

  const renderContent = () => {
    if (isLoading) {
        return view === 'table' ? (
            Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
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
                        <CardHeader className="p-0 relative">
                            <Skeleton className="w-full aspect-[3/2] rounded-t-lg" />
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
                <TableCell>{product.quantity}</TableCell>
                <TableCell className="text-right space-x-2">
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
                        <Card>
                            <CardHeader className="p-0 relative">
                                <Image
                                    src={product.imageUrl || 'https://placehold.co/300x200.png'}
                                    alt={product.name}
                                    width={300}
                                    height={200}
                                    className="rounded-t-lg object-cover w-full aspect-[3/2]"
                                />
                                <div className="absolute top-2 right-2 space-x-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background" onClick={() => handleOpenModalForEdit(product)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setProductToDelete(product)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-1">
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                <CardDescription>{t('admin_product_quantity')}: {product.quantity}</CardDescription>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('admin_products_title')}</h1>
        </div>
        <div className="flex items-center gap-2">
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
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">{t('admin_products_table_image')}</TableHead>
                        <TableHead>{t('admin_products_table_name')}</TableHead>
                        <TableHead className="w-[120px]">{t('admin_product_quantity')}</TableHead>
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
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('admin_product_quantity')}</Label>
              <Input id="quantity" type="number" min="1" value={newProductQuantity} onChange={(e) => setNewProductQuantity(parseInt(e.target.value, 10) || 1)} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
                <Label>{t('admin_product_image')}</Label>
                <ImageUploader file={newProductImage} setFile={setNewProductImage} previewUrl={existingImageUrl} disabled={isSubmitting} />
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
  );
}
