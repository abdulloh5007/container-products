'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { PlusCircle, Edit, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';

function ImageUploader({ file, setFile }: { file: File | null, setFile: (file: File | null) => void }) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const currentFile = acceptedFiles[0];
    if (currentFile) {
      setFile(currentFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(currentFile);
    }
  }, [setFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  return (
    <div {...getRootProps()} className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors relative aspect-video flex items-center justify-center">
      <input {...getInputProps()} />
      {preview ? (
        <Image src={preview} alt="Preview" fill className="object-contain rounded-md" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-8 w-8" />
          <p>{isDragActive ? t('admin_product_image_drop') : t('admin_product_image_drop')}</p>
        </div>
      )}
    </div>
  );
}


export default function AdminProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Dummy data
  const products = [
    { name: t('product_1_title'), description: t('product_1_desc') },
    { name: t('product_2_title'), description: t('product_2_desc') },
    { name: t('product_3_title'), description: t('product_3_desc') },
  ];

  const [isModalOpen, setModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductImage, setNewProductImage] = useState<File | null>(null);

  const handleCreateProduct = () => {
    // In a real app, you would upload the image and send data to an API
    if (!newProductName || !newProductDesc || !newProductImage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill all fields and upload an image.',
      });
      return;
    }
    console.log({ name: newProductName, description: newProductDesc, image: newProductImage });
    toast({ title: "Product Created", description: `${newProductName} has been created.` });
    setNewProductName('');
    setNewProductDesc('');
    setNewProductImage(null);
    setModalOpen(false);
  };

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
            <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('admin_products_add')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t('admin_create_product_title')}</DialogTitle>
                  <DialogDescription>{t('admin_create_product_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">{t('admin_product_name')}</Label>
                    <Input id="name" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">{t('admin_product_desc')}</Label>
                    <Textarea id="description" value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                     <Label htmlFor="image" className="text-right pt-2">{t('admin_product_image')}</Label>
                     <div className="col-span-3">
                        <ImageUploader file={newProductImage} setFile={setNewProductImage} />
                     </div>
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
                <TableHead>{t('admin_products_table_desc')}</TableHead>
                <TableHead className="text-right">{t('admin_products_table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.description}</TableCell>
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
