
"use client";

import { Suspense } from 'react';
import ProdukPageContent from '@/components/ProdukPageContent';
import { Loader2 } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';

export default function ProdukPage() {
  return (
    <PageWrapper>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
        <ProdukPageContent />
      </Suspense>
    </PageWrapper>
  );
}
