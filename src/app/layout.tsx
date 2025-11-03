
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './print.css';
import { Toaster } from "@/components/ui/toaster"
import { doc, getDoc } from 'firebase/firestore';
import { database } from '@/lib/firebase';
import { FirebaseClientProvider } from '@/firebase/client-provider';

// Data optik document ID
const OPTIK_DOC_ID = "JXof497VgWYludHMt5Uc";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const docRef = doc(database, "migrated_data", OPTIK_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data()?.data;
      if (data && Array.isArray(data) && data.length > 0) {
        // Use the first optik name as the title
        const firstOptikName = data[0]?.nama_instansi || 'Dian Optik';
        return {
          title: firstOptikName,
          description: `Sistem Manajemen untuk ${firstOptikName}`,
        };
      }
    }
  } catch (error) {
    // We will not log this error on the server. The error will be caught and handled on the client.
  }

  // Fallback metadata
  return {
    title: 'Dian Optik',
    description: 'Sistem Manajemen Optik.',
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
