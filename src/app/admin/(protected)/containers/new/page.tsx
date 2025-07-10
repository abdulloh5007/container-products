
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import { X, Upload, Plus, Minus, ArrowLeft, Search } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';


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

// Helper to convert a file to a Base64 data URI
const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});


function ImageUploader({ file, setFile, previewUrl, onPreviewClick }: { file: File | null, setFile: (file: File | null) => void, previewUrl?: string | null, onPreviewClick: (url: string) => void }) {
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

  if (currentPreview) {
    return (
        <div className="relative h-48 w-full group cursor-pointer" onClick={() => onPreviewClick(currentPreview)}>
            <Image src={currentPreview} alt="Preview" layout="fill" objectFit="contain" className="rounded-md" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white font-semibold">{t('admin_view_image_button')}</p>
            </div>
        </div>
    )
  }

  return (
    <div {...getRootProps()} className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors h-48 flex flex-col items-center justify-center">
      <input {...getInputProps()} />
       <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Upload className="h-8 w-8" />
        <p>{isDragActive ? t('admin_product_image_drop') : t('admin_product_image_drag_drop')}</p>
      </div>
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
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Fetch all data on component mount
  useEffect(() => {
    const containerIdParam = searchParams.get('id');
    const isEditing = !!containerIdParam;
    
    setIsEditMode(isEditing);
    if(isEditing) {
      setContainerId(containerIdParam);
    }

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all available products
            const productsQuery = query(collection(db, "products"), orderBy("name"));
            const productsSnapshot = await getDocs(productsQuery);
            const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setAvailableProducts(allProducts);

            // 2. If in edit mode, fetch container data and validate its products
            if (isEditing && containerIdParam) {
                const containerDocRef = doc(db, 'containers', containerIdParam);
                const containerDocSnap = await getDoc(containerDocRef);

                if (containerDocSnap.exists()) {
                    const containerData = containerDocSnap.data() as Omit<ContainerData, 'id'>;
                    setContainerName(containerData.name);
                    setContainerImageUrl(containerData.imageUrl || null);

                    // 3. Filter included products to ensure they still exist
                    const existingProductIds = new Set(allProducts.map(p => p.id));
                    const validIncludedProducts = (containerData.products || [])
                        .filter(p => existingProductIds.has(p.id))
                        // Also, map to include the product name from the allProducts list
                        .map(p => {
                            const fullProduct = allProducts.find(ap => ap.id === p.id);
                            return {
                                ...p,
                                name: fullProduct?.name || 'Unknown Product'
                            }
                        });
                    
                    setIncludedProducts(validIncludedProducts);

                } else {
                    toast({ variant: 'destructive', title: t('admin_form_error_title'), description: "Container not found." });
                    router.push('/admin/containers');
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast({ variant: 'destructive', title: t('admin_form_error_title'), description: t('admin_data_load_error') });
            if(isEditing) router.push('/admin/containers');
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchAllData();
  }, [searchParams, router, t, toast]);


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
            finalImageUrl = await fileToDataUri(containerImage);
        }
        
        // Remove name from included products before saving
        const productsToSave = includedProducts.map(({ id, quantity }) => ({ id, quantity }));

        const containerData = {
            name: containerName,
            imageUrl: finalImageUrl,
            products: productsToSave,
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

  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const openFullscreen = (imageUrl: string) => {
    if (imageUrl) setFullscreenImage(imageUrl);
  };
  
  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  if (isLoading) {
      return (
        <div className="max-w-5xl mx-auto space-y-8">
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
    <>
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">{t('admin_back_button')}</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEditMode ? t('admin_edit_container_title') : t('admin_new_container_title')}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Panel: Available Products */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin_available_products')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin_product_search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
            </div>
             <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {availableProducts.length === 0 && <p className="text-sm text-muted-foreground">{t('admin_product_no_products')}</p>}
              <div className="relative space-y-2">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Image
                          src={product.imageUrl || 'https://placehold.co/40x40.png'}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="rounded-md object-cover h-10 w-10 cursor-pointer"
                          onClick={() => openFullscreen(product.imageUrl || 'https://placehold.co/40x40.png')}
                      />
                      <span>{product.name}</span>
                    </div>
                    <Button size="sm" onClick={() => addProduct(product)}>
                      {t('admin_add_product_button')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
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
              <ImageUploader file={containerImage} setFile={setContainerImage} previewUrl={containerImageUrl} onPreviewClick={openFullscreen} />
            </div>
            
            <div className="space-y-2">
                <h3 className="text-lg font-medium">{t('admin_included_products')}</h3>
                <div className="rounded-md border overflow-x-auto">
                    <Table className="min-w-[400px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin_products_table_name')}</TableHead>
                                <TableHead className="w-[150px] text-center">{t('admin_product_quantity')}</TableHead>
                                <TableHead className="text-right w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {includedProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        {t('admin_product_no_included_products')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                includedProducts.map(product => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(product.id, product.quantity - 1)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <Input 
                                                    type="number" 
                                                    value={product.quantity} 
                                                    onChange={(e) => updateQuantity(product.id, parseInt(e.target.value, 10) || 1)} 
                                                    className="w-14 h-8 text-center" 
                                                    min="1"
                                                />
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(product.id, product.quantity + 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeProduct(product.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
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
    <ImageFullscreenViewer 
        isOpen={!!fullscreenImage}
        onClose={closeFullscreen}
        imageUrl={fullscreenImage}
    />
    </>
  );
}
