'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import { ArrowRight, Truck, HardHat, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const { t } = useLanguage();

  const features = [
    {
      icon: <Truck className="h-10 w-10 text-primary" />,
      title: t('features_quality_title'),
      description: t('features_quality_desc'),
    },
    {
      icon: <HardHat className="h-10 w-10 text-primary" />,
      title: t('features_customization_title'),
      description: t('features_customization_desc'),
    },
    {
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      title: t('features_reliability_title'),
      description: t('features_reliability_desc'),
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="relative w-full py-20 md:py-32 lg:py-40 bg-card">
        <div className="absolute inset-0 bg-primary/90 z-10"></div>
        <Image
          src="https://placehold.co/1920x1080.png"
          alt="Container Yard"
          data-ai-hint="container yard"
          fill
          className="object-cover"
        />
        <div className="container mx-auto px-4 md:px-6 text-center relative z-20">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl md:text-6xl font-headline">
              {t('hero_title')}
            </h1>
            <p className="mt-6 text-lg leading-8 text-primary-foreground/90">
              {t('hero_subtitle')}
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg">
                <Link href="/products">
                  {t('hero_secondary_button')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-headline">
              {t('features_section_title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('features_section_subtitle')}
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="items-center">
                  <div className="bg-secondary p-4 rounded-full">
                    {feature.icon}
                  </div>
                  <CardTitle className="mt-4 font-headline">{feature.title}</CardTitle>
                  <CardDescription className="mt-2">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-headline">
                {t('cta_section_title')}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t('cta_section_subtitle')}
              </p>
              <div className="mt-8">
                <Button asChild size="lg">
                  <Link href="/products">
                    {t('cta_section_button')}
                  </Link>
                </Button>
              </div>
            </div>
            <div className="w-full h-80 relative rounded-lg overflow-hidden shadow-2xl">
              <Image
                src="https://placehold.co/600x400.png"
                alt="Customized container"
                data-ai-hint="customized container"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
