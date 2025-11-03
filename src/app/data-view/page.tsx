
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertTriangle, ArrowLeft, DatabaseZap } from "lucide-react";

export default function DataViewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchData();
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(database, "migrated_data"));
      if (!querySnapshot.empty) {
        const dataArray = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(dataArray);

        if (dataArray.length > 0) {
          const allHeaders = new Set<string>();
          dataArray.forEach(item => {
            Object.keys(item).forEach(key => allHeaders.add(key));
          });
          setHeaders(Array.from(allHeaders));
        }
      } else {
        setData([]);
      }
    } catch (err: any) {
      const friendlyMessage = err.code === 'permission-denied'
        ? "Permission denied. Please check your Firestore security rules to allow reads."
        : `An unexpected error occurred: ${err.message}`;
      setError(friendlyMessage);
    }
    setIsLoading(false);
  };
  
  const renderTableContent = () => {
    if (!data || data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={headers.length || 1} className="text-center">No data available.</TableCell>
        </TableRow>
      );
    }
    
    return data.map((item, index) => (
      <TableRow key={item.id || index}>
        {headers.map(header => (
          <TableCell key={header}>
            {typeof item[header] === 'object' && item[header] !== null
              ? <pre className="text-xs bg-muted/50 p-2 rounded-md">{JSON.stringify(item[header], null, 2)}</pre>
              : String(item[header] ?? '')}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <DatabaseZap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Database View</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Migration
          </Link>
        </Button>
      </header>
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Data from Firestore</CardTitle>
            <CardDescription>
              This is the data currently stored in your 'migrated_data' collection in Firestore.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">{error}</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map(header => (
                          <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderTableContent()}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
