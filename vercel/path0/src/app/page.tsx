
"use client";

import { useState, useEffect, useMemo } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, ShoppingBag, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";

export default function ProdukPage() {
  const [user, setUser] = useState<User | null>(null);
  const [productData, setProductData] = useState<any[]>([]);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [kategoriData, setKategoriData] = useState<any[]>([]);
  const [distributorData, setDistributorData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const categoryQuery = searchParams.get('kategori');
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  useEffect(() => {
    if (categoryQuery) {
      setSelectedCategory(categoryQuery);
    } else {
      setSelectedCategory("all");
    }
  }, [categoryQuery]);


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
      fetchKategori();
      fetchDistributors();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...productData];

    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.id_kategori === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.nama_produk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_produk?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (sortConfig !== null) {
        filtered.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (sortConfig.key === 'harga' || sortConfig.key === 'stok') {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            }
            if (sortConfig.key === 'id_supplier') {
                valA = getDistributorName(valA);
                valB = getDistributorName(valB);
            }

            if (valA < valB) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    setPaginatedData(filtered.slice(startIndex, endIndex));
    
  }, [productData, selectedCategory, searchTerm, itemsPerPage, currentPage, sortConfig]);


  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const docRef = doc(database, "migrated_data", PRODUCTS_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const docData = docSnap.data();
        if (docData && Array.isArray(docData.data)) {
          const products = docData.data.map((p: any, index: number) => ({ no: index + 1, ...p }));
          setProductData(products);
        } else {
           setError(`Document with ID ${PRODUCTS_DOC_ID} does not contain a 'data' array field.`);
           setProductData([]);
        }
      } else {
        setError(`No document found with ID: ${PRODUCTS_DOC_ID}`);
        setProductData([]);
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
  
  const fetchKategori = async () => {
    try {
      const docId = "XgGV6xmYVMHK9SDuc1s0";
      const docRef = doc(database, "migrated_data", docId);
      const docSnap = await getDoc(docRef);
       if (docSnap.exists()) {
        const docData = docSnap.data();
        if (docData && Array.isArray(docData.data)) {
          setKategoriData(docData.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }

  const fetchDistributors = async () => {
    try {
      const docId = "Ao1AOituA9BLIVdduMKe";
      const docRef = doc(database, "migrated_data", docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const docData = docSnap.data();
        if (docData && Array.isArray(docData.data)) {
          setDistributorData(docData.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch distributors:", err);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getDistributorName = (id: string) => {
    const distributor = distributorData.find(d => d.id_supplier === id);
    return distributor ? distributor.nama_supplier : `ID: ${id}`;
  };
  
  const formatCurrency = (value: string | number) => {
    const numberValue = typeof value === 'string' ? parseInt(value, 10) : value;
    if (isNaN(numberValue)) return "Rp 0";
    return `Rp ${numberValue.toLocaleString('id-ID')}`;
  }
  
  const handleDelete = async (itemNo: number) => {
    setIsDeleting(true);
    try {
        const docRef = doc(database, "migrated_data", PRODUCTS_DOC_ID);
        const currentData = productData.filter(item => item.no !== itemNo);
        const updatedDataForFirestore = currentData.map(({ no, ...rest }) => rest);

        await updateDoc(docRef, { data: updatedDataForFirestore });

        toast({ title: "Sukses", description: "Data produk berhasil dihapus." });
        setProductData(currentData.map((item, index) => ({...item, no: index + 1})));
    } catch (err: any) {
        toast({
            variant: "destructive",
            title: "Gagal Menghapus",
            description: `Terjadi kesalahan: ${err.message}`,
        });
    } finally {
        setIsDeleting(false);
    }
  };

  const totalItemsAfterFilter = useMemo(() => {
    let filtered = productData;
     if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.id_kategori === selectedCategory);
    }
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.nama_produk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_produk?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered.length;
  }, [productData, selectedCategory, searchTerm]);

  const totalPages = Math.ceil(totalItemsAfterFilter / itemsPerPage);

  const renderTableContent = () => {
    if (paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center">
            No data available for the selected filters.
          </TableCell>
        </TableRow>
      );
    }
    
    const totalHarga = paginatedData.reduce((sum, item) => sum + parseInt(item.harga || 0, 10), 0);
    const totalStok = paginatedData.reduce((sum, item) => sum + parseInt(item.stok || 0, 10), 0);

    return (
      <>
        {paginatedData.map((item, index) => (
          <TableRow key={item.id_produk || item.no}>
            <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
            <TableCell className="text-blue-600 font-semibold">{item.kode_produk}</TableCell>
            <TableCell>{item.nama_produk}</TableCell>
            <TableCell>{getDistributorName(item.id_supplier)}</TableCell>
            <TableCell>{formatCurrency(item.harga)}</TableCell>
            <TableCell>
              <span className={item.stok === "0" ? "bg-red-500 text-white px-4 py-1 rounded" : ""}>
                {item.stok}
              </span>
            </TableCell>
            <TableCell className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                    <Trash2 className="h-4 w-4 mr-1" /> Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data produk secara permanen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(item.no)} disabled={isDeleting}>
                       {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Hapus"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-slate-200">
            <TableCell colSpan={4} className="text-center">Total</TableCell>
            <TableCell>{formatCurrency(totalHarga)}</TableCell>
            <TableCell>{totalStok}</TableCell>
            <TableCell></TableCell>
        </TableRow>
      </>
    );
  };
  
  const paginationInfo = useMemo(() => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalItemsAfterFilter);
    return `Tampilan ${totalItemsAfterFilter > 0 ? startItem : 0}-${endItem} dari ${totalItemsAfterFilter} Data`;
  }, [totalItemsAfterFilter, currentPage, itemsPerPage]);

  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
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
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2"><ShoppingBag /> List atau Daftar Semua Frame Pada Optik</CardTitle>
                    <CardDescription>Tambah, Edit, atau Hapus Data Produk</CardDescription>
                </div>
                <div className="flex gap-2">
                     <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                        <Link href="/produk/tambah">Tambah Produk</Link>
                     </Button>
                     <Button variant="link" className="text-red-600">Print Data Frame</Button>
                </div>
            </div>
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm">Tampilkan</span>
                     <Select defaultValue={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm">Data dari dari Semua.</span>
                </div>
                <div className="flex items-center gap-2">
                    <Select onValueChange={(value) => { setSelectedCategory(value); setCurrentPage(1); }} value={selectedCategory}>
                        <SelectTrigger className="h-8 w-48">
                            <SelectValue placeholder="Pilih Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {kategoriData.map((kategori) => (
                                <SelectItem key={kategori.id_kategori} value={kategori.id_kategori}>
                                    {kategori.nama_kategori}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-sm">Cari Frame:</span>
                    <Input className="h-8 w-48" placeholder="cari" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                </div>
            </div>
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
                  <TableHeader className="bg-gray-800">
                    <TableRow>
                        <TableHead className="text-white">
                            <Button variant="ghost" onClick={() => requestSort('no')} className="text-white hover:text-gray-300">
                                No {getSortIndicator('no')}
                            </Button>
                        </TableHead>
                        <TableHead className="text-white">
                            <Button variant="ghost" onClick={() => requestSort('kode_produk')} className="text-white hover:text-gray-300">
                                kode {getSortIndicator('kode_produk')}
                            </Button>
                        </TableHead>
                        <TableHead className="text-white">
                            <Button variant="ghost" onClick={() => requestSort('nama_produk')} className="text-white hover:text-gray-300">
                                Nama Produk {getSortIndicator('nama_produk')}
                            </Button>
                        </TableHead>
                        <TableHead className="text-white">
                            <Button variant="ghost" onClick={() => requestSort('id_supplier')} className="text-white hover:text-gray-300">
                                Nama Distributor {getSortIndicator('id_supplier')}
                            </Button>
                        </TableHead>
                        <TableHead className="text-white">
                            <Button variant="ghost" onClick={() => requestSort('harga')} className="text-white hover:text-gray-300">
                                Harga Jual {getSortIndicator('harga')}
                            </Button>
                        </TableHead>
                        <TableHead className="text-white">
                            <Button variant="ghost" onClick={() => requestSort('stok')} className="text-white hover:text-gray-300">
                                Stok {getSortIndicator('stok')}
                            </Button>
                        </TableHead>
                        <TableHead className="text-white">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderTableContent()}
                  </TableBody>
                </Table>
              </div>
            )}
             <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                <span>{paginationInfo}</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
                </div>
            </div>
          </CardContent>
        </Card>
    </PageWrapper>
  );
}

    