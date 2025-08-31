import { AuthProvider } from '@/contexts/auth-context';
import { ReactNode } from 'react';
import { AppRestorer } from '@/components/app-restorer';

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppRestorer />
      {children}
    </AuthProvider>
  );
}
