
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { Carousel, CarouselContent, CarouselItem, CarouselDots } from '@/components/ui/carousel';

interface Product {
    id: string;
    name: string;
    quantity: number;
    imageUrls: string[];
}

interface FullscreenState {
  imageUrls: string[];
  startIndex: number;
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};


export default function Home() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fullscreenState, setFullscreenState] = useState<FullscreenState | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, "products"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products: ", error);
        // Optionally, show a toast message here
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);
  
  const openFullscreen = (imageUrls: string[], startIndex: number) => {
    if (imageUrls && imageUrls.length > 0) {
      setFullscreenState({ imageUrls, startIndex });
    }
  };
  
  const closeFullscreen = () => {
    setFullscreenState(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden shadow-lg">
              <Skeleton className="w-full h-60" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center col-span-full py-12">
          <p className="text-muted-foreground">{t('admin_product_no_products')}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                 <Carousel className="w-full relative group">
                  <CarouselContent>
                    {(product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls.map((url, index) => (
                      <CarouselItem key={index}>
                        <div className="relative w-full h-60 cursor-pointer" onClick={() => openFullscreen(product.imageUrls, index)}>
                          <Image
                            src={url}
                            alt={`${product.name} - image ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </CarouselItem>
                    )) : (
                       <CarouselItem>
                         <div className="relative w-full h-60" onClick={() => openFullscreen(['https://placehold.co/600x400.png'], 0)}>
                            <Image
                                src={'https://placehold.co/600x400.png'}
                                alt={product.name}
                                fill
                                className="object-cover"
                            />
                         </div>
                       </CarouselItem>
                    )}
                  </CarouselContent>
                  {product.imageUrls && product.imageUrls.length > 1 && (
                    <CarouselDots className="absolute bottom-2 left-1/2 -translate-x-1/2" />
                  )}
                </Carousel>
                <CardHeader>
                  <CardTitle className="font-headline">{product.name}</CardTitle>
                  <CardDescription>{t('admin_product_quantity')}: {product.quantity}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">
          {t('products_page_title')}
        </h1>
      </div>

      <div className="max-w-md mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin_product_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {renderContent()}
    </div>
    <ImageFullscreenViewer 
        isOpen={!!fullscreenState}
        onClose={closeFullscreen}
        imageUrls={fullscreenState?.imageUrls}
        startIndex={fullscreenState?.startIndex}
    />
    </>
  );
}
