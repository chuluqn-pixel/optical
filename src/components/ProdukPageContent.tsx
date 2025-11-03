
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle, ShoppingBag, Pencil, Trash2, ArrowUpDown, PlusCircle, Search, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";


const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";
const EXPENSES_DOC_ID = "expenses_data";
const DEBT_DOC_ID = "utang_data";
const PURCHASE_DETAIL_DOC_ID = "pembelian_detail_data";


export default function ProdukPageContent() {
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

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isSavingTx, setIsSavingTx] = useState(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  
  // New state for multi-product transaction
  const [poHeader, setPoHeader] = useState({
    no_nota: "",
    id_supplier: "",
    tanggal_pembelian: format(new Date(), "yyyy-MM-dd"),
    jenis_pembayaran: "Tunai"
  });
  const [poCart, setPoCart] = useState<any[]>([]);
  const [poFinancials, setPoFinancials] = useState({
    diskon: "0",
    lain_lain: "0",
    jumlah_bayar: "0"
  });

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
            
            if (['harga', 'stok', 'warning'].includes(sortConfig.key)) {
                valA = parseFloat(valA || 0);
                valB = parseFloat(valB || 0);
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
  
  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: "destructive", title: "Anda harus login terlebih dahulu" });
        return;
    }
    if (poCart.length === 0) {
        toast({ variant: "destructive", title: "Data tidak lengkap", description: "Pilih minimal satu produk." });
        return;
    }
    
    setIsSavingTx(true);
    
    const { totalTagihan, sisaTagihan } = poFinancialSummary;
    const { diskon, lain_lain, jumlah_bayar } = poFinancials;
    const purchaseId = `PO-${Date.now()}`;
    
    try {
        const now = new Date();

        // Step 1: Update product stocks
        const productDocRef = doc(database, "migrated_data", PRODUCTS_DOC_ID);
        const updatedProducts = productData.map(p => {
            const itemInCart = poCart.find(cartItem => cartItem.id_produk === p.id_produk);
            if (itemInCart) {
                const currentStock = parseInt(p.stok || "0", 10);
                const newStock = currentStock + parseInt(itemInCart.jumlah, 10);
                return { ...p, stok: String(newStock) };
            }
            return p;
        });
        await updateDoc(productDocRef, { data: updatedProducts });

        // Step 2: Save purchase details
        const purchaseDetailDocRef = doc(database, "migrated_data", PURCHASE_DETAIL_DOC_ID);
        const purchaseDetails = poCart.map(item => ({
            id_pembelian: purchaseId,
            id_produk: item.id_produk,
            jumlah: item.jumlah,
            harga_modal: item.harga_modal,
        }));
        const detailSnap = await getDoc(purchaseDetailDocRef);
        const currentDetails = detailSnap.exists() ? detailSnap.data()?.data || [] : [];
        await setDoc(purchaseDetailDocRef, { data: [...currentDetails, ...purchaseDetails] });


        // Step 3: Handle payment and debt
        if (poHeader.jenis_pembayaran === 'Tunai' || (parseFloat(jumlah_bayar) > 0)) {
            const cartCategoryIds = new Set(poCart.map(item => {
                const product = productData.find(p => p.id_produk === item.id_produk);
                return product?.id_kategori;
            }));

            let expenseCategory = "Pembelian Stok Campuran";
            if (cartCategoryIds.size === 1) {
                const categoryId = [...cartCategoryIds][0];
                const category = kategoriData.find(k => k.id_kategori === categoryId);
                if (category) {
                    expenseCategory = `Pembelian Stok ${category.nama_kategori}`;
                }
            }
            
            const expenseDocRef = doc(database, "migrated_data", EXPENSES_DOC_ID);
            const expenseData = {
                id: `purchase_payment_${Date.now()}`,
                no_ref: poHeader.no_nota || purchaseId,
                tanggal: poHeader.tanggal_pembelian,
                judul: `Pembelian Stok dari ${getDistributorName(poHeader.id_supplier)}`,
                kategori: expenseCategory,
                jumlah: jumlah_bayar,
                keterangan: `Nota #${poHeader.no_nota}. Diskon: ${diskon}, Biaya Lain: ${lain_lain}`,
                createdAt: format(now, "yyyy-MM-dd HH:mm:ss"),
                createdBy: user.uid,
            };
            const expenseDocSnap = await getDoc(expenseDocRef);
            const currentExpenses = expenseDocSnap.exists() ? expenseDocSnap.data()?.data || [] : [];
            await setDoc(expenseDocRef, { data: [...currentExpenses, expenseData] });
        }
        
        if (poHeader.jenis_pembayaran === 'Kredit' && sisaTagihan > 0) {
            const debtDocRef = doc(database, "migrated_data", DEBT_DOC_ID);
            const debtData = {
                id_pembelian: purchaseId,
                no_nota: poHeader.no_nota || purchaseId,
                id_supplier: poHeader.id_supplier,
                tanggal_pembelian: poHeader.tanggal_pembelian,
                total_tagihan: String(totalTagihan),
                sisa_tagihan: String(sisaTagihan),
                status: "Belum Lunas",
                createdAt: format(now, "yyyy-MM-dd HH:mm:ss"),
                createdBy: user.uid,
            };
            const debtDocSnap = await getDoc(debtDocRef);
            const currentDebts = debtDocSnap.exists() ? debtDocSnap.data()?.data || [] : [];
            await setDoc(debtDocRef, { data: [...currentDebts, debtData] });
        }

        toast({ title: "Sukses", description: "Transaksi pembelian berhasil disimpan dan stok diperbarui." });
        setProductData(updatedProducts);
        setIsTxModalOpen(false);
        setPoHeader({ no_nota: "", id_supplier: "", tanggal_pembelian: format(new Date(), "yyyy-MM-dd"), jenis_pembayaran: "Tunai" });
        setPoCart([]);
        setPoFinancials({ diskon: "0", lain_lain: "0", jumlah_bayar: "0" });

    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: `Terjadi kesalahan: ${err.message}`,
      });
    } finally {
      setIsSavingTx(false);
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
    if (!distributorData) return `ID: ${id}`;
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

  const getStockColorClass = (stok: string, warning: string) => {
    const stokNum = parseInt(stok, 10);
    const warningNum = parseInt(warning, 10);

    if (isNaN(stokNum) || isNaN(warningNum)) {
      return "";
    }

    if (stokNum < warningNum) {
      return "bg-red-500 text-white";
    } else if (stokNum === warningNum) {
      return "bg-yellow-400 text-black";
    } else {
      return "bg-green-500 text-white";
    }
  };

  const poFinancialSummary = useMemo(() => {
    const subTotal = poCart.reduce((sum, item) => sum + (parseFloat(item.harga_modal || 0) * parseInt(item.jumlah || 1, 10)), 0);
    const diskon = parseFloat(poFinancials.diskon) || 0;
    const lainLain = parseFloat(poFinancials.lain_lain) || 0;
    const totalTagihan = subTotal - diskon + lainLain;
    const jumlahBayar = parseFloat(poFinancials.jumlah_bayar) || 0;
    const sisaTagihan = totalTagihan - jumlahBayar;

    return { subTotal, totalTagihan, sisaTagihan };
  }, [poCart, poFinancials]);

  const renderTableContent = () => {
    if (paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center">
            No data available for the selected filters.
          </TableCell>
        </TableRow>
      );
    }
    
    const totalHarga = paginatedData.reduce((sum, item) => sum + parseInt(item.harga || 0, 10), 0);
    const totalStok = paginatedData.reduce((sum, item) => sum + parseInt(item.stok || 0, 10), 0);
    const totalWarning = paginatedData.reduce((sum, item) => sum + parseInt(item.warning || 0, 10), 0);

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
              <span className={`px-4 py-1 rounded ${getStockColorClass(item.stok, item.warning)}`}>
                {item.stok}
              </span>
            </TableCell>
            <TableCell>{item.warning}</TableCell>
            <TableCell className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                <Link href={`/produk/edit/${item.id_produk}`}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Link>
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
            <TableCell>{totalWarning}</TableCell>
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

  if (!user || isLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <Loader2 className="h-10 w-10 animate-spin" />
        </div>
    );
  }

  return (
    <>
    <Card className="shadow-lg">
        <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-xl flex items-center gap-2"><ShoppingBag /> List atau Daftar Semua Produk Pada Optik</CardTitle>
                <CardDescription>Tambah, Edit, atau Hapus Data Produk</CardDescription>
            </div>
            <div className="flex gap-2">
                    <Button onClick={() => setIsTxModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Transaksi Produk
                    </Button>
                    <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                        <Link href="/produk/tambah">Tambah Produk</Link>
                    </Button>
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
                <span className="text-sm">Cari Produk:</span>
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
                    <TableHead className="text-white">
                        <Button variant="ghost" onClick={() => requestSort('warning')} className="text-white hover:text-gray-300">
                            Warning {getSortIndicator('warning')}
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

    <ProductTransactionModal 
      isOpen={isTxModalOpen}
      onOpenChange={setIsTxModalOpen}
      distributors={distributorData}
      products={productData}
      onSave={handleSaveTransaction}
      poHeader={poHeader}
      setPoHeader={setPoHeader}
      poCart={poCart}
      setPoCart={setPoCart}
      poFinancials={poFinancials}
      setPoFinancials={setPoFinancials}
      financialSummary={poFinancialSummary}
    />
    </>
  );
}

// New Component for the Purchase Order Modal
const ProductTransactionModal = ({ isOpen, onOpenChange, distributors, products, onSave, poHeader, setPoHeader, poCart, setPoCart, poFinancials, setPoFinancials, financialSummary }: any) => {
    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

    const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setPoHeader((prev:any) => ({ ...prev, [name]: value }));
    };
    
    const handleHeaderSelectChange = (name: string, value: string) => {
      setPoHeader((prev:any) => ({ ...prev, [name]: value }));
    };

    const handleFinancialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setPoFinancials((prev:any) => ({...prev, [name]: value.replace(/[^0-9]/g, '') }));
    };

    const handleCartChange = (id_produk: string, field: 'jumlah' | 'harga_modal', value: string) => {
        setPoCart((prevCart: any) => prevCart.map((item:any) => 
            item.id_produk === id_produk ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveFromCart = (id_produk: string) => {
        setPoCart((prev:any) => prev.filter((item:any) => item.id_produk !== id_produk));
    };
    
    const handleAddProductsToCart = (selectedIds: string[]) => {
        const productsToAdd = products.filter((p:any) => selectedIds.includes(p.id_produk));
        const newItems = productsToAdd.filter((p:any) => !poCart.some((item:any) => item.id_produk === p.id_produk))
            .map((p:any) => ({
                id_produk: p.id_produk,
                nama_produk: p.nama_produk,
                jumlah: "1",
                harga_modal: p.harga_modal || "0"
            }));
        setPoCart((prev:any) => [...prev, ...newItems]);
    };

    return (
      <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Transaksi Produk Masuk / Purchase Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSave} className="flex flex-col flex-grow min-h-0">
                    <div className="grid md:grid-cols-2 gap-4 border-b pb-4">
                        <div className="space-y-2">
                           <Label htmlFor="no_nota">No. Nota</Label>
                           <Input id="no_nota" name="no_nota" value={poHeader.no_nota} onChange={handleHeaderChange} />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="id_supplier">Distributor</Label>
                           <Select name="id_supplier" onValueChange={(v) => handleHeaderSelectChange('id_supplier', v)} value={poHeader.id_supplier} required>
                               <SelectTrigger><SelectValue placeholder="- Pilih Distributor -" /></SelectTrigger>
                               <SelectContent>
                                   {distributors.map((d:any) => <SelectItem key={d.id_supplier} value={d.id_supplier}>{d.nama_supplier}</SelectItem>)}
                               </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="tanggal_pembelian">Tanggal</Label>
                           <Input id="tanggal_pembelian" name="tanggal_pembelian" type="date" value={poHeader.tanggal_pembelian} onChange={handleHeaderChange}/>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="jenis_pembayaran">Jenis Bayar</Label>
                           <Select name="jenis_pembayaran" onValueChange={(v) => handleHeaderSelectChange('jenis_pembayaran', v)} value={poHeader.jenis_pembayaran}>
                               <SelectTrigger><SelectValue/></SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="Tunai">Tunai</SelectItem>
                                   <SelectItem value="Kredit">Kredit</SelectItem>
                               </SelectContent>
                           </Select>
                        </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto my-4 space-y-4">
                        <Button type="button" onClick={() => setIsProductSelectorOpen(true)}><PlusCircle className="mr-2"/>Pilih Produk</Button>
                        <div className="border rounded-md">
                          <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Produk</TableHead>
                                  <TableHead className="w-24">Jumlah</TableHead>
                                  <TableHead className="w-40">Harga Beli</TableHead>
                                  <TableHead className="w-40">Total</TableHead>
                                  <TableHead className="w-12">Aksi</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {poCart.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center">Tidak ada produk dipilih.</TableCell></TableRow>
                                ) : (
                                    poCart.map((item:any) => (
                                        <TableRow key={item.id_produk}>
                                            <TableCell>{item.nama_produk}</TableCell>
                                            <TableCell>
                                                <Input type="number" value={item.jumlah} onChange={e => handleCartChange(item.id_produk, 'jumlah', e.target.value)} className="h-8"/>
                                            </TableCell>
                                             <TableCell>
                                                <Input type="number" value={item.harga_modal} onChange={e => handleCartChange(item.id_produk, 'harga_modal', e.target.value)} className="h-8"/>
                                            </TableCell>
                                            <TableCell>
                                                Rp {(parseInt(item.jumlah || 0) * parseFloat(item.harga_modal || 0)).toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell>
                                                <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveFromCart(item.id_produk)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                              </TableBody>
                          </Table>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center"><Label>Diskon (Rp)</Label><Input name="diskon" value={poFinancials.diskon} onChange={handleFinancialsChange} className="h-8 w-40 text-right"/></div>
                          <div className="flex justify-between items-center"><Label>Lain-lain (Rp)</Label><Input name="lain_lain" value={poFinancials.lain_lain} onChange={handleFinancialsChange} className="h-8 w-40 text-right"/></div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center"><span className="font-medium">Sub-Total</span><span className="font-bold">Rp {financialSummary.subTotal.toLocaleString('id-ID')}</span></div>
                           <div className="flex justify-between items-center text-lg"><span className="font-medium">Total</span><span className="font-bold text-red-600">Rp {financialSummary.totalTagihan.toLocaleString('id-ID')}</span></div>
                           <hr/>
                           <div className="flex justify-between items-center"><Label>Jumlah Bayar</Label><Input name="jumlah_bayar" value={poFinancials.jumlah_bayar} onChange={handleFinancialsChange} className="h-10 w-40 text-right font-bold"/></div>
                           <div className="flex justify-between items-center font-bold"><Label>Sisa / Kembalian</Label><span className={financialSummary.sisaTagihan < 0 ? "text-green-600" : ""}>Rp {financialSummary.sisaTagihan.toLocaleString('id-ID')}</span></div>
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                        <Button type="submit">Simpan Transaksi</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        
        <ProductSelectorModal
            isOpen={isProductSelectorOpen}
            onOpenChange={setIsProductSelectorOpen}
            products={products}
            onAddProducts={handleAddProductsToCart}
        />
      </>
    );
}

const ProductSelectorModal = ({ isOpen, onOpenChange, products, onAddProducts }: any) => {
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        return products.filter((p: any) => 
            p.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.kode_produk && p.kode_produk.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [products, searchTerm]);

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    const handleConfirm = () => {
        onAddProducts(Array.from(selectedProducts));
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
                <DialogHeader><DialogTitle>Pilih Produk</DialogTitle></DialogHeader>
                <Input placeholder="Cari produk..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div className="flex-grow overflow-y-auto border rounded-md">
                  <Table>
                      <TableHeader><TableRow><TableHead>Pilih</TableHead><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Stok</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {paginatedProducts.map((p:any) => (
                           <TableRow key={p.id_produk}>
                              <TableCell>
                                <Checkbox checked={selectedProducts.has(p.id_produk)} onCheckedChange={() => {
                                  setSelectedProducts(prev => {
                                    const newSet = new Set(prev);
                                    if(newSet.has(p.id_produk)) newSet.delete(p.id_produk);
                                    else newSet.add(p.id_produk);
                                    return newSet;
                                  })
                                }}/>
                              </TableCell>
                              <TableCell>{p.kode_produk}</TableCell>
                              <TableCell>{p.nama_produk}</TableCell>
                              <TableCell>{p.stok}</TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                  </Table>
                </div>
                 <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Halaman {currentPage} dari {totalPages}</span>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Sebelumnya</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Berikutnya</Button>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                    <Button type="button" onClick={handleConfirm}>Tambahkan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
