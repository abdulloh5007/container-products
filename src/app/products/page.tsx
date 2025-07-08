'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function ProductsPage() {
  const { t } = useLanguage();

  const productTypes = [
    {
      title: t('product_1_title'),
      description: t('product_1_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'container office'
    },
    {
      title: t('product_2_title'),
      description: t('product_2_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'container home'
    },
    {
      title: t('product_3_title'),
      description: t('product_3_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'container shop'
    },
    {
      title: t('product_4_title'),
      description: t('product_4_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'storage container'
    },
  ];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">
          {t('products_page_title')}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          {t('products_page_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {productTypes.map((product, index) => (
          <Card key={index} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="relative w-full h-60">
              <Image
                src={product.image}
                alt={product.title}
                data-ai-hint={product.hint}
                fill
                className="object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="font-headline">{product.title}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow"></CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                {t('learn_more')}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
