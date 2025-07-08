'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminContainersPage() {
  const { t } = useLanguage();
  
  // Dummy data - in a real app this would come from an API
  const containers = [
    { name: t('container_1_title'), products: 3 },
    { name: t('container_2_title'), products: 5 },
    { name: t('container_3_title'), products: 1 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin_containers_title')}</h1>
        <p className="text-muted-foreground">{t('admin_containers_desc')}</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle>{t('admin_sidebar_containers')}</CardTitle>
                <CardDescription>
                  {t('admin_containers_desc')}
                </CardDescription>
            </div>
            <Button asChild>
              <Link href="/admin/containers/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('admin_containers_add')}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin_containers_table_name')}</TableHead>
                <TableHead className="text-center">{t('admin_containers_table_products')}</TableHead>
                <TableHead className="text-right">{t('admin_containers_table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {containers.map((container, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{container.name}</TableCell>
                  <TableCell className="text-center">{container.products}</TableCell>
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
