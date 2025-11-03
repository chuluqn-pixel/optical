
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";

interface LensaSetting {
  sph_dari: string;
  sph_sampai: string;
  cyl_dari: string;
  cyl_sampai: string;
  axs_dari: string;
  axs_sampai: string;
  add_dari: string;
  add_sampai: string;
}

export default function SettingLensaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<LensaSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docId = "cMS8QhEyQ25DxIIP2X60";
      const docRef = doc(database, "migrated_data", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const docData = docSnap.data();
        if (docData && Array.isArray(docData.data) && docData.data.length > 0) {
           setSettings(docData.data[0]);
        } else {
           setError(`Document with ID ${docId} has invalid data structure.`);
           setSettings(null);
        }
      } else {
        setError(`No document found with ID: ${docId}`);
        setSettings(null);
      }
    } catch (err: any) {
      const friendlyMessage =
        err.code === "permission-denied"
          ? "Permission denied. Please check your Firestore security rules to allow reads."
          : `An unexpected error occurred: ${err.message}`;
      setError(friendlyMessage);
    }
    setIsLoading(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (settings) {
      setSettings({ ...settings, [name]: value });
    }
  };


  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <PageWrapper>
        <Card className="shadow-lg max-w-2xl mx-auto">
          <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                  <Settings />
                  Setting Lensa untuk Transaksi Penjualan Optik
              </CardTitle>
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
            ) : settings ? (
              <form className="space-y-4">
                <div className="grid grid-cols-[80px_1fr_40px_1fr] items-center gap-4">
                  <Label htmlFor="sph_dari">SPH</Label>
                  <Input id="sph_dari" name="sph_dari" value={settings.sph_dari} onChange={handleInputChange} />
                  <span className="text-center">s/d</span>
                  <Input id="sph_sampai" name="sph_sampai" value={settings.sph_sampai} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-[80px_1fr_40px_1fr] items-center gap-4">
                  <Label htmlFor="cyl_dari">CYL</Label>
                  <Input id="cyl_dari" name="cyl_dari" value={settings.cyl_dari} onChange={handleInputChange} />
                  <span className="text-center">s/d</span>
                  <Input id="cyl_sampai" name="cyl_sampai" value={settings.cyl_sampai} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-[80px_1fr_40px_1fr] items-center gap-4">
                  <Label htmlFor="axs_dari">AXS</Label>
                  <Input id="axs_dari" name="axs_dari" value={settings.axs_dari} onChange={handleInputChange} />
                  <span className="text-center">s/d</span>
                  <Input id="axs_sampai" name="axs_sampai" value={settings.axs_sampai} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-[80px_1fr_40px_1fr] items-center gap-4">
                  <Label htmlFor="add_dari">ADD</Label>
                  <Input id="add_dari" name="add_dari" value={settings.add_dari} onChange={handleInputChange} />
                  <span className="text-center">s/d</span>
                  <Input id="add_sampai" name="add_sampai" value={settings.add_sampai} onChange={handleInputChange} />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="submit" className="bg-gray-800 hover:bg-gray-900 text-white">Simpan</Button>
                    <Button type="button" variant="outline" className="bg-gray-600 hover:bg-gray-700 text-white">Batal</Button>
                </div>
              </form>
            ) : (
                <div className="text-center p-4">No settings data available.</div>
            )}
          </CardContent>
        </Card>
    </PageWrapper>
  );
}
