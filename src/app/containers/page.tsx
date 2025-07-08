'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function ContainersPage() {
  const { t } = useLanguage();

  const containerTypes = [
    {
      title: t('container_1_title'),
      description: t('container_1_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'standard container'
    },
    {
      title: t('container_2_title'),
      description: t('container_2_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'high container'
    },
    {
      title: t('container_3_title'),
      description: t('container_3_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'refrigerated container'
    },
    {
      title: t('container_4_title'),
      description: t('container_4_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'open top container'
    },
    {
      title: t('container_5_title'),
      description: t('container_5_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'flat rack container'
    },
    {
      title: t('container_6_title'),
      description: t('container_6_desc'),
      image: 'https://placehold.co/600x400.png',
      hint: 'small container'
    },
  ];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">
          {t('containers_page_title')}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          {t('containers_page_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {containerTypes.map((container, index) => (
          <Card key={index} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="relative w-full h-60">
              <Image
                src={container.image}
                alt={container.title}
                data-ai-hint={container.hint}
                fill
                className="object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="font-headline">{container.title}</CardTitle>
              <CardDescription>{container.description}</CardDescription>
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
