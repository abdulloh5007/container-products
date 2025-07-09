'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { PlusCircle, Edit, Trash2, UploadCloud } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';

interface Product {
    id: number;
    name: string;
    quantity: number;
    image: File;
    imageUrl: string;
}

function ImageUploader({ file, setFile }: { file: File | null, setFile: (file: File | null) => void }) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
    }
  }, [setFile]);

  useEffect(() => {
    if (file) {
      const newPreview = URL.createObjectURL(file);
      setPreview(newPreview);
      return () => URL.revokeObjectURL(newPreview);
    }
    setPreview(null);
  }, [file]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full rounded-lg border-2 border-dashed border-muted-foreground/50 p-4 text-center transition-colors hover:border-primary ${isDragActive ? 'border-primary bg-primary/10' : ''}`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <div className="relative h-24 w-full">
            <Image src={preview} alt="Preview" layout="fill" objectFit="contain" className="rounded-md" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-6">
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
  const [isModalOpen, setModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [newProductName, setNewProductName] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState(1);
  const [newProductImage, setNewProductImage] = useState<File | null>(null);

  const onModalOpenChange = (open: boolean) => {
    if (!open) {
      setProductToEdit(null); // Reset edit state on close
    }
    setModalOpen(open);
  }

  // Effect to populate form when editing
  useEffect(() => {
    if (productToEdit) {
      setNewProductName(productToEdit.name);
      setNewProductQuantity(productToEdit.quantity);
      setNewProductImage(productToEdit.image);
    } else {
      setNewProductName('');
      setNewProductQuantity(1);
      setNewProductImage(null);
    }
  }, [productToEdit, isModalOpen]);

  const handleSaveProduct = () => {
    if (!newProductName || newProductQuantity < 1 || !newProductImage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill all fields and upload an image.',
      });
      return;
    }

    if (productToEdit) {
      const isImageUpdated = productToEdit.image !== newProductImage;
      const newImageUrl = isImageUpdated ? URL.createObjectURL(newProductImage) : productToEdit.imageUrl;
      
      setProducts(products.map(p => 
        p.id === productToEdit.id 
        ? { ...p, name: newProductName, quantity: newProductQuantity, image: newProductImage, imageUrl: newImageUrl } 
        : p
      ));
      
      if (isImageUpdated) {
        URL.revokeObjectURL(productToEdit.imageUrl);
      }
      toast({ title: "Product Updated", description: `'${newProductName}' has been updated.` });
    } else {
      const newProduct: Product = {
        id: Date.now(),
        name: newProductName,
        quantity: newProductQuantity,
        image: newProductImage,
        imageUrl: URL.createObjectURL(newProductImage),
      };
      setProducts(prev => [...prev, newProduct]);
      toast({ title: "Product Created", description: `'${newProductName}' has been created.` });
    }

    onModalOpenChange(false);
  };
  
  const handleOpenModalForEdit = (product: Product) => {
    setProductToEdit(product);
    setModalOpen(true);
  }
  
  const handleOpenModalForCreate = () => {
    setProductToEdit(null);
    setModalOpen(true);
  }

  const confirmDelete = () => {
    if (!productToDelete) return;
    URL.revokeObjectURL(productToDelete.imageUrl);
    setProducts(products.filter(p => p.id !== productToDelete.id));
    toast({ title: "Product Deleted", description: `'${productToDelete.name}' has been deleted.` });
    setProductToDelete(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin_products_title')}</h1>
        <p className="text-muted-foreground">{t('admin_products_desc')}</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('admin_sidebar_products')}</CardTitle>
              <CardDescription>{t('admin_products_desc')}</CardDescription>
            </div>
            <Button onClick={handleOpenModalForCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('admin_products_add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>{t('admin_products_table_name')}</TableHead>
                <TableHead className="w-[120px]">Quantity</TableHead>
                <TableHead className="text-right w-[120px]">{t('admin_products_table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No products have been added yet.
                    </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                    <TableRow key={product.id}>
                    <TableCell>
                        <Image
                        src={product.imageUrl}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{productToEdit ? 'Edit Product' : t('admin_create_product_title')}</DialogTitle>
            <DialogDescription>{productToEdit ? 'Update the details for this product.' : t('admin_create_product_desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('admin_product_name')}</Label>
              <Input id="name" value={newProductName} onChange={e => setNewProductName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('admin_product_quantity')}</Label>
              <Input id="quantity" type="number" min="1" value={newProductQuantity} onChange={(e) => setNewProductQuantity(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="space-y-2">
                <Label>{t('admin_product_image')}</Label>
                <ImageUploader file={newProductImage} setFile={setNewProductImage} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onModalOpenChange(false)}>{t('admin_cancel_button')}</Button>
            <Button onClick={handleSaveProduct}>{productToEdit ? 'Save Changes' : t('admin_create_button')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the product "{productToDelete?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
