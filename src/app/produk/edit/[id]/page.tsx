
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageWrapper from "@/components/layout/PageWrapper";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Distributor {
  id_supplier: string;
  nama_supplier: string;
}

interface Kategori {
    id_kategori: string;
    nama_kategori: string;
}

const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";

export default function EditProdukPage() {
  const [user, setUser] = useState<User | null>(null);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const productId = params.id as string;

  const [formData, setFormData] = useState({
    kode_produk: "",
    nama_produk: "",
    harga: "",
    harga_modal: "",
    stok: "",
    id_supplier: "",
    warning: "",
    keterangan: "",
    id_kategori: "",
    id_produk: productId,
  });

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
      fetchInitialData();
    }
  }, [user]);
  
  useEffect(() => {
      if (allProducts.length > 0 && productId) {
          const productToEdit = allProducts.find(p => p.id_produk === productId);
          if (productToEdit) {
              setFormData({
                  ...productToEdit,
                  harga: productToEdit.harga || "",
                  harga_modal: productToEdit.harga_modal || "",
                  stok: productToEdit.stok || "",
                  warning: productToEdit.warning || "",
              });
          } else {
              setError("Produk tidak ditemukan.");
          }
      }
  }, [allProducts, productId]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [distDocSnap, catDocSnap, prodDocSnap] = await Promise.all([
        getDoc(doc(database, "migrated_data", "Ao1AOituA9BLIVdduMKe")),
        getDoc(doc(database, "migrated_data", "XgGV6xmYVMHK9SDuc1s0")),
        getDoc(doc(database, "migrated_data", PRODUCTS_DOC_ID)),
      ]);
      
      if (distDocSnap.exists() && distDocSnap.data()?.data) {
        setDistributors(distDocSnap.data().data);
      }
      if (catDocSnap.exists() && catDocSnap.data()?.data) {
        setCategories(catDocSnap.data().data);
      }
      if (prodDocSnap.exists() && prodDocSnap.data()?.data) {
        setAllProducts(prodDocSnap.data().data);
      }

    } catch (err: any) {
      setError(`Gagal memuat data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleCancel = () => {
    router.back();
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "Anda harus login terlebih dahulu" });
      return;
    }
    
    setIsSaving(true);
    
    try {
        const productDocRef = doc(database, "migrated_data", PRODUCTS_DOC_ID);
        const updatedProducts = allProducts.map(p => {
            if (p.id_produk === productId) {
                return formData;
            }
            return p;
        });

        await updateDoc(productDocRef, { data: updatedProducts });

      toast({ title: "Sukses", description: "Produk berhasil diperbarui." });
      router.push("/produk");

    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: `Terjadi kesalahan: ${err.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <PageWrapper>
      <Card className="shadow-lg max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Edit Produk: {formData.nama_produk}</CardTitle>
            <Button onClick={() => router.back()} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && !formData.nama_produk ? (
            <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-md mb-4">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="kode_produk">Kode Produk</Label>
                <Input id="kode_produk" name="kode_produk" value={formData.kode_produk} onChange={handleInputChange} />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="nama_produk">Nama Produk</Label>
                <Input id="nama_produk" name="nama_produk" value={formData.nama_produk} onChange={handleInputChange} required />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="id_kategori">Kategori Produk</Label>
                <Select name="id_kategori" onValueChange={(value) => handleSelectChange("id_kategori", value)} value={formData.id_kategori}>
                    <SelectTrigger>
                        <SelectValue placeholder="- Pilih Kategori -" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id_kategori} value={cat.id_kategori}>{cat.nama_kategori}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="id_supplier">Nama Distributor</Label>
                <Select name="id_supplier" onValueChange={(value) => handleSelectChange("id_supplier", value)} value={formData.id_supplier}>
                    <SelectTrigger>
                        <SelectValue placeholder="- Pilih Nama Distributor -" />
                    </SelectTrigger>
                    <SelectContent>
                        {distributors.map((dist) => (
                            <SelectItem key={dist.id_supplier} value={dist.id_supplier}>{dist.nama_supplier}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="harga">Harga Jual</Label>
                <Input id="harga" name="harga" type="number" value={formData.harga} onChange={handleInputChange} />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="harga_modal">Harga Modal</Label>
                <Input id="harga_modal" name="harga_modal" type="number" value={formData.harga_modal} onChange={handleInputChange} />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="stok">Jumlah/Stok</Label>
                <Input id="stok" name="stok" type="number" value={formData.stok} onChange={handleInputChange} />
              </div>
              
               <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="warning">Warning</Label>
                <Input id="warning" name="warning" type="number" value={formData.warning} onChange={handleInputChange} />
              </div>

              <div className="grid w-full items-center gap-1.5 md:col-span-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea id="keterangan" name="keterangan" value={formData.keterangan} onChange={handleInputChange} />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="submit" disabled={isSaving} className="bg-gray-800 hover:bg-gray-900 text-white">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="bg-gray-600 hover:bg-gray-700 text-white">
                Batal
              </Button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
