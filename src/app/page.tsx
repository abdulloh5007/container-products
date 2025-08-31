
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewSwitcher } from '@/hooks/use-view-switcher';
import { ViewSwitcher } from '@/components/admin/view-switcher';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';

type ProductType = 'kit' | 'unit' | 'area';
interface Product {
    id: string;
    name: string;
    quantity: number;
    type: ProductType;
    m2PerKit?: number;
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const EPSILON = 1e-9; // Small tolerance for float comparisons

export default function Home() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { view, setView } = useViewSwitcher('home', 'grid');

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, "products"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: doc.data().type || 'unit' } as Product));
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
    const sortOrder: Record<ProductType, number> = { 'area': 1, 'kit': 2, 'unit': 3 };

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return filtered.sort((a, b) => {
        const typeA = a.type || 'unit';
        const typeB = b.type || 'unit';
        const orderA = sortOrder[typeA] || 99;
        const orderB = sortOrder[typeB] || 99;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
    });
  }, [products, searchQuery]);
  
  const renderProductQuantity = (product: Product) => {
    const quantity = Math.abs(product.quantity) < EPSILON ? 0 : product.quantity;
    if (product.type === 'kit') {
      const totalM2Value = quantity * (product.m2PerKit || 0);
      const totalM2 = (Math.abs(totalM2Value) < EPSILON ? 0 : totalM2Value).toFixed(2);
      
      return `${t('admin_product_quantity')}: ${quantity} ${t('admin_kit_unit')} (${totalM2} ${t('admin_m2_unit')})`;
    }
     if (product.type === 'area') {
      return `${t('admin_product_quantity')}: ${quantity.toFixed(2)} ${t('admin_m2_unit')}`;
    }
    return `${t('admin_product_quantity')}: ${quantity}`;
  }

  const renderContent = () => {
    if (isLoading) {
        if (view === 'grid') {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="overflow-hidden shadow-lg">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          );
        }
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin_products_table_name')}</TableHead>
                        <TableHead>{t('admin_product_quantity')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center col-span-full py-12">
          <p className="text-muted-foreground">{t('admin_product_no_products')}</p>
        </div>
      );
    }

    if (view === 'table') {
        return (
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin_products_table_name')}</TableHead>
                                <TableHead>{t('admin_product_quantity')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>{renderProductQuantity(product).replace(`${t('admin_product_quantity')}: `, '')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
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
                <CardHeader>
                  <CardTitle className="font-headline">{product.name}</CardTitle>
                  <CardDescription>{renderProductQuantity(product)}</CardDescription>
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

      <div className="max-w-md mx-auto mb-12 flex items-center gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin_product_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <ViewSwitcher view={view} setView={setView} />
      </div>

      {renderContent()}
    </div>
    </>
  );
}
