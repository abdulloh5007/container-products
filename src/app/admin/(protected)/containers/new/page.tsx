'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import { X, Upload, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  quantity: number;
  imageUrl: string;
}

interface IncludedProduct {
  id: string;
  name: string;
  quantity: number;
}

interface ContainerData {
  id: string;
  name: string;
  imageUrl?: string;
  products: IncludedProduct[];
}

function ImageUploader({ file, setFile, previewUrl }: { file: File | null, setFile: (file: File | null) => void, previewUrl?: string | null }) {
  const { t } = useLanguage();
  const [currentPreview, setCurrentPreview] = useState<string | null>(previewUrl || null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      const newPreview = URL.createObjectURL(acceptedFiles[0]);
      setFile(acceptedFiles[0]);
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
  });

  return (
    <div {...getRootProps()} className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
      <input {...getInputProps()} />
      {currentPreview ? (
        <div className="relative h-32 w-full">
            <Image src={currentPreview} alt="Preview" layout="fill" objectFit="contain" className="rounded-md" />
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
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available products
  useEffect(() => {
    const fetchProducts = async () => {
        try {
            const q = query(collection(db, "products"), orderBy("name"));
            const querySnapshot = await getDocs(q);
            const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setAvailableProducts(productsData);
        } catch (error) {
            console.error("Error fetching available products: ", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_load_error') });
        }
    };
    fetchProducts();
  }, [t, toast]);


  // Fetch container data if in edit mode
  useEffect(() => {
    const containerIdParam = searchParams.get('id');
    if (containerIdParam) {
      setIsEditMode(true);
      setContainerId(containerIdParam);
      
      const fetchContainerData = async () => {
        setIsLoading(true);
        try {
            const containerDocRef = doc(db, 'containers', containerIdParam);
            const containerDocSnap = await getDoc(containerDocRef);

            if (containerDocSnap.exists()) {
                const containerData = containerDocSnap.data() as Omit<ContainerData, 'id'>;
                setContainerName(containerData.name);
                setIncludedProducts(containerData.products || []);
                setContainerImageUrl(containerData.imageUrl || null);
            } else {
                toast({ variant: 'destructive', title: t('admin_form_error_title'), description: "Container not found." });
                router.push('/admin/containers');
            }
        } catch (error) {
           toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_load_error') });
           router.push('/admin/containers');
        } finally {
            setIsLoading(false);
        }
      }
      fetchContainerData();
    } else {
        setIsLoading(false); // Not in edit mode, so no data to load
    }
  }, [searchParams, router, toast, t]);

  const addProduct = (product: Product) => {
    setIncludedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      // Only include necessary fields
      return [...prev, { id: product.id, name: product.name, quantity: 1 }];
    });
  };

  const removeProduct = (productId: string) => {
    setIncludedProducts(prev => prev.filter(p => p.id !== productId));
  };
  
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
        removeProduct(productId);
        return;
    }
    setIncludedProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity: newQuantity } : p));
  };
  
  const handleSave = async () => {
    if (!containerName) {
        toast({ variant: "destructive", title: t('admin_form_error_title'), description: t('admin_form_error_name_required') });
        return;
    }
    
    setIsSubmitting(true);

    try {
        let finalImageUrl = containerImageUrl || '';

        if (containerImage) {
            // Delete old image if editing
            if (isEditMode && containerImageUrl) {
                try {
                    const oldImageRef = ref(storage, containerImageUrl);
                    await deleteObject(oldImageRef);
                } catch (e) { console.error("Failed to delete old image", e); }
            }
            const storageRef = ref(storage, `containers/${Date.now()}_${containerImage.name}`);
            await uploadBytes(storageRef, containerImage);
            finalImageUrl = await getDownloadURL(storageRef);
        }

        const containerData = {
            name: containerName,
            imageUrl: finalImageUrl,
            products: includedProducts,
        };

        if (isEditMode && containerId) {
            const containerDoc = doc(db, 'containers', containerId);
            await updateDoc(containerDoc, containerData);
            toast({ title: t('admin_container_update_success_title'), description: t('admin_container_update_success_desc', { containerName }) });
        } else {
            await addDoc(collection(db, 'containers'), containerData);
            toast({ title: t('admin_container_create_success_title'), description: t('admin_container_create_success_desc', { containerName }) });
        }
        
        router.push('/admin/containers');
    } catch(error) {
        console.error("Error saving container", error);
        toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_save_error') });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
      return (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"> <Skeleton className="h-4 w-20" /> <Skeleton className="h-10 w-full" /> </div>
                  <div className="space-y-2"> <Skeleton className="h-4 w-24" /> <Skeleton className="h-32 w-full" /> </div>
                  <div className="space-y-2"> <Skeleton className="h-6 w-1/3" /> <Skeleton className="h-16 w-full" /></div>
                  <div className="flex justify-end"> <Skeleton className="h-10 w-32" /> </div>
                </CardContent>
              </Card>
            </div>
          </div>
      )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">{t('admin_back_button')}</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEditMode ? t('admin_edit_container_title') : t('admin_new_container_title')}</h1>
          <p className="text-muted-foreground">{isEditMode ? t('admin_edit_container_desc') : t('admin_new_container_desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel: Available Products */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin_available_products')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableProducts.length === 0 && <p className="text-sm text-muted-foreground">{t('admin_product_no_products')}</p>}
            {availableProducts.map(product => (
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
        <Card>
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
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? t('admin_saving_text') : (isEditMode ? t('admin_save_changes_button') : t('admin_save_container_button'))}
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
