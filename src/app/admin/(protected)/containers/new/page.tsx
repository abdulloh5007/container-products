'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import { X, Upload, Plus, Minus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: number;
  name: string;
}

interface IncludedProduct extends Product {
  quantity: number;
}

// Dummy data for available products
const availableProductsData: Product[] = [
  { id: 1, name: 'Container Offices' },
  { id: 2, name: 'Residential Containers' },
  { id: 3, name: 'Pop-up Stores' },
  { id: 4, name: 'Storage Solutions' },
  { id: 5, name: 'Standard 20ft' },
  { id: 6, name: 'High Cube 40ft' },
];

interface ContainerData {
  id: string;
  name: string;
  imageUrl?: string;
  products: IncludedProduct[];
}

function ImageUploader({ file, setFile, previewUrl }: { file: File | null, setFile: (file: File | null) => void, previewUrl?: string | null }) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<string | null>(previewUrl || null);

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
    } else if (previewUrl) {
      setPreview(previewUrl)
    } else {
        setPreview(null);
    }
  }, [file, previewUrl]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  return (
    <div {...getRootProps()} className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
      <input {...getInputProps()} />
      {preview ? (
        <div className="relative h-32 w-full">
            <Image src={preview} alt="Preview" layout="fill" objectFit="contain" className="rounded-md" />
        </div>
      ) : (
         <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-8 w-8" />
          <p>{isDragActive ? t('admin_product_image_drop') : t('admin_product_image_drop')}</p>
        </div>
      )}
    </div>
  );
}

export default function NewContainerPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [containerName, setContainerName] = useState('');
  const [containerImage, setContainerImage] = useState<File | null>(null);
  const [containerImageUrl, setContainerImageUrl] = useState<string | null>(null);
  const [includedProducts, setIncludedProducts] = useState<IncludedProduct[]>([]);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const id = searchParams.get('id');
    if (id) {
      setIsEditMode(true);
      setContainerId(id);
      
      try {
        const storedContainers = localStorage.getItem('containers');
        const allContainers: ContainerData[] = storedContainers ? JSON.parse(storedContainers) : [];
        const containerToEdit = allContainers.find(c => c.id === id);

        if (containerToEdit) {
          setContainerName(containerToEdit.name);
          setIncludedProducts(containerToEdit.products);
          setContainerImageUrl(containerToEdit.imageUrl || null);
        } else {
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: "Container not found." });
            router.push('/admin/containers');
        }
      } catch (error) {
         toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_load_error') });
         router.push('/admin/containers');
      }
    }
  }, [searchParams, router, toast, isClient, t]);

  const addProduct = (product: Product) => {
    setIncludedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeProduct = (productId: number) => {
    setIncludedProducts(prev => prev.filter(p => p.id !== productId));
  };
  
  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) {
        removeProduct(productId);
        return;
    }
    setIncludedProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity: newQuantity } : p));
  };
  
  const handleSave = () => {
    if (!isClient || !containerName) {
        toast({
            variant: "destructive",
            title: t('admin_form_error_title'),
            description: t('admin_form_error_name_required'),
        });
        return;
    }
    
    const imageUrl = containerImage ? URL.createObjectURL(containerImage) : containerImageUrl;

    const newContainerData: Partial<ContainerData> = {
        name: containerName,
        imageUrl: imageUrl || '',
        products: includedProducts,
    };

    try {
        const storedContainers = localStorage.getItem('containers');
        let allContainers: ContainerData[] = storedContainers ? JSON.parse(storedContainers) : [];

        if (isEditMode && containerId) {
            allContainers = allContainers.map(c => 
                c.id === containerId 
                ? { ...c, ...newContainerData } 
                : c
            );
            toast({
                title: t('admin_container_update_success_title'),
                description: t('admin_container_update_success_desc', { containerName }),
            });
        } else {
            const newContainer: ContainerData = { 
                id: Date.now().toString(),
                name: containerName,
                imageUrl: imageUrl || '',
                products: includedProducts
            };
            allContainers.push(newContainer);
            toast({
                title: t('admin_container_create_success_title'),
                description: t('admin_container_create_success_desc', { containerName }),
            });
        }
        
        localStorage.setItem('containers', JSON.stringify(allContainers));
        router.push('/admin/containers');
    } catch(error) {
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    }
  };
  
  if (!isClient) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isEditMode ? t('admin_edit_container_title') : t('admin_new_container_title')}</h1>
        <p className="text-muted-foreground">{isEditMode ? t('admin_edit_container_desc') : t('admin_new_container_desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Available Products */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t('admin_available_products')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableProductsData.map(product => (
              <div key={product.id} className="flex items-center justify-between p-2 border rounded-lg">
                <span>{product.name}</span>
                <Button size="sm" onClick={() => addProduct(product)}>
                  {t('admin_add_product_button')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right Panel: Container Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('admin_container_details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="container-name">{t('admin_container_name')}</Label>
              <Input id="container-name" value={containerName} onChange={e => setContainerName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t('admin_container_image')}</Label>
              <ImageUploader file={containerImage} setFile={setContainerImage} previewUrl={containerImageUrl} />
            </div>
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('admin_included_products')}</h3>
                <div className="space-y-2">
                    {includedProducts.length === 0 && <p className="text-sm text-muted-foreground">{t('admin_product_no_products')}</p>}
                    {includedProducts.map(product => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                            <span className="font-medium">{product.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{t('admin_product_quantity')}:</span>
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(product.id, product.quantity - 1)}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input type="number" value={product.quantity} onChange={(e) => updateQuantity(product.id, parseInt(e.target.value, 10) || 1)} className="w-16 h-8 text-center" />
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(product.id, product.quantity + 1)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeProduct(product.id)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave}>{isEditMode ? t('admin_save_changes_button') : t('admin_save_container_button')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
