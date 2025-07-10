'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page just redirects to the main admin dashboard page.
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/acceptance');
  }, [router]);

  return null; // Or a loading spinner
}
