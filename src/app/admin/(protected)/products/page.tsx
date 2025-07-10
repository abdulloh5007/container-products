
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { PlusCircle, Edit, Trash2, UploadCloud, Search, Eye, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface Product {
    id: string; // Firestore document ID
    name: string;
    quantity: number;
    imageUrls: string[];
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});


function MultiImageUploader({ 
    files, 
    setFiles, 
    existingImageUrls,
    setExistingImageUrls,
    disabled,
    onView
}: { 
    files: File[], 
    setFiles: (files: File[]) => void, 
    existingImageUrls: string[],
    setExistingImageUrls: (urls: string[]) => void,
    disabled?: boolean,
    onView: (url: string) => void,
}) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const MAX_FILES = 3;
    const MAX_SIZE_MB = 0.5; // 500KB
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const currentTotal = files.length + existingImageUrls.length;

    const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
        if (currentTotal + acceptedFiles.length > MAX_FILES) {
            toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_product_image_max_files_error', { max: MAX_FILES }) });
            return;
        }
        setFiles(prev => [...prev, ...acceptedFiles]);
        
        fileRejections.forEach(rejection => {
            if (rejection.file.size > MAX_SIZE_BYTES) {
                toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_product_image_size_error', { size: MAX_SIZE_MB }) });
            }
        });

    }, [files, existingImageUrls, setFiles, currentTotal, toast, t]);
    
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/jpeg': [], 'image/png': [] },
        maxFiles: MAX_FILES,
        maxSize: MAX_SIZE_BYTES,
        disabled: disabled || currentTotal >= MAX_FILES,
    });
    
    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };
    
    const removeExistingUrl = (index: number) => {
        setExistingImageUrls(existingImageUrls.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`w-full rounded-lg border-2 border-dashed border-muted-foreground/50 p-6 text-center transition-colors flex flex-col items-center justify-center relative group ${disabled || currentTotal >= MAX_FILES ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary'} ${isDragActive ? 'border-primary bg-primary/10' : ''}`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-full">
                    <UploadCloud className="h-8 w-8" />
                    <p className="font-semibold text-foreground">
                        {isDragActive ? t('admin_product_image_drop') : t('admin_product_image_drag_drop')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('admin_product_image_limit', { count: MAX_FILES - currentTotal })}</p>
                    <p className="text-xs text-muted-foreground">{t('admin_product_image_accepted_formats')}</p>
                </div>
            </div>
             {(existingImageUrls.length > 0 || files.length > 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {existingImageUrls.map((url, index) => (
                        <div key={`existing-${index}`} className="relative group aspect-square">
                            <Image src={url} alt="Preview" layout="fill" objectFit="cover" className="rounded-md" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button type="button" onClick={() => onView(url)} className="text-white p-1 rounded-full bg-black/50 hover:bg-black/70">
                                    <Eye className="h-4 w-4" />
                                </button>
                                {!disabled && (
                                    <button type="button" onClick={() => removeExistingUrl(index)} className="text-white p-1 rounded-full bg-destructive/80 hover:bg-destructive">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {files.map((file, index) => {
                        const previewUrl = URL.createObjectURL(file);
                        return (
                            <div key={`new-${index}`} className="relative group aspect-square">
                                <Image src={previewUrl} alt="Preview" layout="fill" objectFit="cover" className="rounded-md" />
                                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button type="button" onClick={() => onView(previewUrl)} className="text-white p-1 rounded-full bg-black/50 hover:bg-black/70">
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    {!disabled && (
                                        <button type="button" onClick={() => removeFile(index)} className="text-white p-1 rounded-full bg-destructive/80 hover:bg-destructive">
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
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
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [newProductName, setNewProductName] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState(1);
  const [newProductImages, setNewProductImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

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
      setNewProductImages([]);
      setProductToEdit(null);
      setExistingImageUrls([]);
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
      setExistingImageUrls(productToEdit.imageUrls || []);
      setNewProductImages([]); 
    } else {
      resetForm();
    }
  }, [productToEdit]);

  const handleSaveProduct = async () => {
    if (!newProductName || newProductQuantity < 0) {
      toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_form_error_desc') });
      return;
    }

    if (existingImageUrls.length === 0 && newProductImages.length === 0) {
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_form_error_image_required') });
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        let finalImageUrls = [...existingImageUrls];

        if (newProductImages.length > 0) {
            const uploadedUrls = await Promise.all(newProductImages.map(fileToDataUri));
            finalImageUrls.push(...uploadedUrls);
        }

        const productData = {
            name: newProductName,
            quantity: newProductQuantity,
            imageUrls: finalImageUrls
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
        fetchProducts(); // Refresh data
    } catch (error) {
        console.error("Error deleting product and updating containers: ", error);
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setProductToDelete(null);
    }
  }

  const openFullscreen = (imageUrl: string) => {
    if (imageUrl) setFullscreenImage(imageUrl);
  };
  
  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

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
    
    const getFirstImage = (product: Product) => (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'https://placehold.co/64x64.png';

    if (view === 'table') {
        return filteredProducts.map((product) => (
            <TableRow key={product.id}>
                <TableCell>
                    <Image
                    src={getFirstImage(product)}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="rounded-md object-cover h-16 w-16 cursor-pointer"
                    onClick={() => openFullscreen(getFirstImage(product))}
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
                                <Carousel className="w-full relative group">
                                    <CarouselContent>
                                        {(product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls.map((url, index) => (
                                            <CarouselItem key={index}>
                                                <div className="relative w-full aspect-[3/2] cursor-pointer" onClick={() => openFullscreen(url)}>
                                                    <Image
                                                        src={url}
                                                        alt={`${product.name} - image ${index + 1}`}
                                                        fill
                                                        className="rounded-t-lg object-cover"
                                                    />
                                                </div>
                                            </CarouselItem>
                                        )) : (
                                            <CarouselItem>
                                                <div className="relative w-full aspect-[3/2]" onClick={() => openFullscreen('https://placehold.co/300x200.png')}>
                                                    <Image
                                                        src={'https://placehold.co/300x200.png'}
                                                        alt={product.name}
                                                        fill
                                                        className="rounded-t-lg object-cover"
                                                    />
                                                </div>
                                            </CarouselItem>
                                        )}
                                    </CarouselContent>
                                    {product.imageUrls && product.imageUrls.length > 1 && (
                                        <>
                                            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </>
                                    )}
                                </Carousel>
                                <div className="absolute top-2 right-2 space-x-2 bg-transparent/10" onClick={(e) => e.stopPropagation()}>
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
              <Input id="quantity" type="number" min="0" value={newProductQuantity} onChange={(e) => setNewProductQuantity(parseInt(e.target.value, 10) || 0)} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
                <Label>{t('admin_product_image')}</Label>
                <MultiImageUploader
                    files={newProductImages}
                    setFiles={setNewProductImages}
                    existingImageUrls={existingImageUrls}
                    setExistingImageUrls={setExistingImageUrls}
                    disabled={isSubmitting}
                    onView={openFullscreen}
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
    <ImageFullscreenViewer 
        isOpen={!!fullscreenImage}
        onClose={closeFullscreen}
        imageUrl={fullscreenImage}
    />
    </>
  );
}

    