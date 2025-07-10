
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { PlusCircle, Edit, Trash2, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
    id: string; // Firestore document ID
    name: string;
    quantity: number;
    imageUrl: string; // Will store a Base64 Data URI
}

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('admin_products_title')}</h1>
            <p className="text-muted-foreground">{t('admin_products_desc')}</p>
        </div>
        <Button onClick={handleOpenModalForCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('admin_products_add')}
        </Button>
      </div>
      
      <Card>
        <CardHeader></CardHeader>
        <CardContent>
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
              {isLoading ? (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={onModalOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{productToEdit ? t('admin_products_edit_title') : t('admin_create_product_title')}</DialogTitle>
            <DialogDescription>{productToEdit ? t('admin_products_edit_desc') : t('admin_create_product_desc')}</DialogDescription>
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
