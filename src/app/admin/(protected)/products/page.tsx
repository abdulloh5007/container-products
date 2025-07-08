'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { PlusCircle, Edit, Trash2, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';

function ImageUploader({ file, setFile }: { file: File | null, setFile: (file: File | null) => void }) {
  const { t } = useLanguage();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const currentFile = acceptedFiles[0];
    if (currentFile) {
      setFile(currentFile);
    }
  }, [setFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full rounded-lg border-2 border-dashed border-muted-foreground/50 p-8 text-center transition-colors hover:border-primary ${isDragActive ? 'border-primary bg-primary/10' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2">
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold text-foreground">
          {t('admin_product_image_drop')}
        </p>
        <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
        {file && <p className="mt-2 text-sm font-medium text-emerald-600">{file.name}</p>}
      </div>
    </div>
  );
}


export default function AdminProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Dummy data
  const products = [
    { name: t('product_1_title') },
    { name: t('product_2_title') },
    { name: t('product_3_title') },
  ];

  const [isModalOpen, setModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState(1);
  const [newProductImage, setNewProductImage] = useState<File | null>(null);

  const handleCreateProduct = () => {
    // In a real app, you would upload the image and send data to an API
    if (!newProductName || newProductQuantity < 1 || !newProductImage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill all fields and upload an image.',
      });
      return;
    }
    console.log({ name: newProductName, quantity: newProductQuantity, image: newProductImage });
    toast({ title: "Product Created", description: `${newProductName} has been created.` });
    onModalOpenChange(false); // Close and reset modal
  };

  const onModalOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      // Reset state when modal is closed
      setNewProductName('');
      setNewProductQuantity(1);
      setNewProductImage(null);
    }
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
            <Dialog open={isModalOpen} onOpenChange={onModalOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('admin_products_add')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{t('admin_create_product_title')}</DialogTitle>
                  <DialogDescription>{t('admin_create_product_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
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
                  <DialogClose asChild>
                    <Button variant="outline">{t('admin_cancel_button')}</Button>
                  </DialogClose>
                  <Button onClick={handleCreateProduct}>{t('admin_create_button')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin_products_table_name')}</TableHead>
                <TableHead className="text-right">{t('admin_products_table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
