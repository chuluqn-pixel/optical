
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, FileText, Eye, ArrowUpDown, CheckCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { format, parse } from "date-fns";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const SALES_DETAIL_DOC_ID = "oQu7zep2d8jM7ChPE3Ja";
const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";
const USERS_DOC_ID = "b7ojJpFKj4RNIkQneCpu";

export default function LaporanPemesananPage() {
  const [user, setUser] = useState<User | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [penggunaData, setPenggunaData] = useState<any[] | null>(null);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);


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
      fetchAllData();
    }
  }, [user]);

  const filteredAndSortedData = useMemo(() => {
    if (!salesData) return [];
    
    const pendingOrders = salesData.filter(item => !item.tanggal_selesai || item.tanggal_selesai.trim() === "");

    let sortedData = [...pendingOrders];
    if (sortConfig !== null) {
        sortedData.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (['total_jual', 'jumlah_bayar'].includes(sortConfig.key)) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            } else if (sortConfig.key === 'tanggal_pesan') {
                try {
                    valA = parse(valA, "dd/MM/yyyy", new Date()).getTime();
                    valB = parse(valB, "dd/MM/yyyy", new Date()).getTime();
                } catch(e) {
                    valA = 0;
                    valB = 0;
                }
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

    return sortedData.filter(
      (item) =>
        item.nama_pemesan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id_orders?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.alamat?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [salesData, searchTerm, sortConfig]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedData.length / itemsPerPage);
  }, [filteredAndSortedData, itemsPerPage]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredAndSortedData.slice(startIndex, endIndex));
  }, [filteredAndSortedData, currentPage, itemsPerPage]);


  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesSnap, penggunaSnap, productsSnap, detailsSnap] = await Promise.all([
        getDoc(doc(database, "migrated_data", SALES_DOC_ID)),
        getDoc(doc(database, "migrated_data", USERS_DOC_ID)),
        getDoc(doc(database, "migrated_data", PRODUCTS_DOC_ID)),
        getDoc(doc(database, "migrated_data", SALES_DETAIL_DOC_ID))
      ]);
      
      const getArrayData = (snap: any, docId: string) => {
        if (snap.exists()) {
          const snapData = snap.data();
          if (snapData && Array.isArray(snapData.data)) {
            return snapData.data;
          }
          throw new Error(`Document with ID ${docId} does not contain a 'data' array field.`);
        }
        throw new Error(`No document found with ID: ${docId}`);
      };

      setSalesData(getArrayData(salesSnap, SALES_DOC_ID));
      setPenggunaData(getArrayData(penggunaSnap, USERS_DOC_ID));
      setAllProducts(getArrayData(productsSnap, PRODUCTS_DOC_ID));
      // Prefetch details to avoid re-fetching in modal
      setSelectedOrderDetails(getArrayData(detailsSnap, SALES_DETAIL_DOC_ID));

    } catch (err: any) {
       const friendlyMessage =
        err.code === "permission-denied"
          ? "Permission denied. Please check your Firestore security rules to allow reads."
          : `An unexpected error occurred: ${err.message}`;
      setError(friendlyMessage);
      setSalesData([]);
      setPenggunaData([]);
    }
    setIsLoading(false);
  };
  
    const handleShowDetail = (order: any) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

  const handleMarkAsFinished = async (orderId: string) => {
    setIsCompleting(orderId);

    // Optimistic UI update
    const originalSalesData = [...salesData];
    const updatedSalesDataOptimistic = salesData.map((sale: any) => {
        if (sale.id_orders === orderId) {
            return { ...sale, tanggal_selesai: format(new Date(), "dd/MM/yyyy") };
        }
        return sale;
    });
    setSalesData(updatedSalesDataOptimistic);
    
    try {
      const salesDocRef = doc(database, "migrated_data", SALES_DOC_ID);
      // The Firestore update happens in the background.
      await updateDoc(salesDocRef, { data: updatedSalesDataOptimistic });

      toast({
        title: "Sukses",
        description: `Pesanan #${orderId} telah ditandai selesai.`,
      });

    } catch (err: any) {
      // If error, revert the UI state
      setSalesData(originalSalesData);
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: `Terjadi kesalahan: ${err.message}`,
      });
    } finally {
      setIsCompleting(null);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getNamaKaryawan = (id: string) => {
    if (!penggunaData) return `ID: ${id}`;
    // eslint-disable-next-line eqeqeq
    const pengguna = penggunaData.find(p => p.id_user == id);
    return pengguna ? pengguna.nama_lengkap : `ID: ${id}`;
  };
  
  const getProductName = (id_produk: string) => {
    const product = allProducts.find(p => p.id_produk === id_produk);
    return product ? product.nama_produk : 'Produk tidak ditemukan';
  };

  const formatCurrency = (value: string | number) => {
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return "Rp 0";
    return `Rp ${numberValue.toLocaleString('id-ID')}`;
  };
  
  const formatTanggal = (dateString: string) => {
    if (!dateString || dateString.trim() === "") return "-";
    try {
      const date = parse(dateString, "dd/MM/yyyy", new Date());
      if (isNaN(date.getTime())) {
         const isoDate = new Date(dateString);
        if(!isNaN(isoDate.getTime())) return format(isoDate, "dd MMM yyyy");
        return dateString;
      }
      return format(date, "dd MMM yyyy");
    } catch (error) {
      return dateString;
    }
  };

  const renderTableContent = () => {
    if (!paginatedData || paginatedData.length === 0 || !penggunaData) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="text-center">
            Tidak ada pesanan yang sedang diproses.
          </TableCell>
        </TableRow>
      );
    }
    
    return (
      <>
        {paginatedData.map((item) => (
          <TableRow key={item.id_orders}>
            <TableCell className="font-semibold text-red-600">{item.id_orders}</TableCell>
            <TableCell>{item.no_ref}</TableCell>
            <TableCell>{item.nama_pemesan}</TableCell>
            <TableCell>{item.alamat}</TableCell>
            <TableCell>{formatTanggal(item.tanggal_pesan)}</TableCell>
            <TableCell>{getNamaKaryawan(item.id_user)}</TableCell>
            <TableCell>{formatCurrency(item.total_jual)}</TableCell>
            <TableCell className="text-red-500">{formatCurrency(item.jumlah_bayar)}</TableCell>
            <TableCell className="flex gap-2">
              <Button onClick={() => handleShowDetail(item)} variant="outline" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                <Eye className="h-4 w-4 mr-1" /> Lihat
              </Button>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                   <Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white" disabled={isCompleting === item.id_orders}>
                     {isCompleting === item.id_orders ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                     Selesai
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tandai Pesanan Selesai?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini akan mengisi tanggal selesai dengan hari ini untuk pesanan #{item.id_orders}. Anda tidak bisa membatalkan tindakan ini.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleMarkAsFinished(item.id_orders)}>
                      Ya, Tandai Selesai
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  };
  
  const paginationInfo = useMemo(() => {
    const totalFilteredItems = filteredAndSortedData.length;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalFilteredItems);
    return `Tampilan ${totalFilteredItems > 0 ? startItem : 0}-${endItem} dari ${totalFilteredItems} Data`;
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

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

  const orderDetailsForModal = selectedOrderDetails.filter(d => d.id_orders === selectedOrder?.id_orders);
  const subTotalModal = orderDetailsForModal.reduce((sum, item) => sum + (parseFloat(item.harga) * parseInt(item.jumlah)), 0);

  return (
    <PageWrapper>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                  <FileText />
                  Laporan Data Pemesanan
              </CardTitle>
              <Button onClick={fetchAllData} variant="outline" size="sm" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                 Refresh
              </Button>
            </div>
            <CardDescription>Daftar pesanan yang sedang dalam proses pengerjaan (tanggal selesai masih kosong).</CardDescription>
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm">Tampilkan</span>
                     <Select defaultValue={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                        <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm">Data</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm">Cari Pesanan:</span>
                    <Input className="h-8 w-48" placeholder="Nama, no ref, alamat..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || !penggunaData || !salesData ? (
              <div className="flex items-center justify-center h-64">
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
                           <Button variant="ghost" onClick={() => requestSort('id_orders')} className="text-white hover:text-gray-300">
                             No Orders {getSortIndicator('id_orders')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('no_ref')} className="text-white hover:text-gray-300">
                             No Ref {getSortIndicator('no_ref')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('nama_pemesan')} className="text-white hover:text-gray-300">
                             Nama Pemesan {getSortIndicator('nama_pemesan')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('alamat')} className="text-white hover:text-gray-300">
                             Alamat {getSortIndicator('alamat')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('tanggal_pesan')} className="text-white hover:text-gray-300">
                             Tanggal Pesan {getSortIndicator('tanggal_pesan')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('id_user')} className="text-white hover:text-gray-300">
                             Karyawan {getSortIndicator('id_user')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('total_jual')} className="text-white hover:text-gray-300">
                             Total Jual {getSortIndicator('total_jual')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('jumlah_bayar')} className="text-white hover:text-gray-300">
                             Total Bayar {getSortIndicator('jumlah_bayar')}
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

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Detail Pesanan #{selectedOrder?.id_orders}</DialogTitle>
                    <DialogDescription>
                        Pemesan: {selectedOrder?.nama_pemesan}
                    </DialogDescription>
                </DialogHeader>
                {isLoadingDetail ? (
                     <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead>Jumlah</TableHead>
                                    <TableHead className="text-right">Harga</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orderDetailsForModal.map(detail => (
                                    <TableRow key={detail.id_produk}>
                                        <TableCell>{getProductName(detail.id_produk)}</TableCell>
                                        <TableCell>{detail.jumlah}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(detail.harga)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(parseFloat(detail.harga) * parseInt(detail.jumlah))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex justify-end">
                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between">
                                    <span>Sub Total</span>
                                    <span>{formatCurrency(subTotalModal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Diskon</span>
                                    <span>- {formatCurrency(selectedOrder?.diskon || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Bayar Instansi</span>
                                    <span>{formatCurrency(selectedOrder?.bayar_instansi || 0)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total Tagihan</span>
                                    <span>{formatCurrency(selectedOrder?.total_jual || 0)}</span>
                                </div>
                                <hr/>
                                 <div className="flex justify-between">
                                    <span>Sudah Dibayar</span>
                                    <span>{formatCurrency(selectedOrder?.jumlah_bayar || 0)}</span>
                                </div>
                                <div className="flex justify-between text-red-600 font-bold">
                                    <span>Sisa Bayar</span>
                                    <span>{formatCurrency(selectedOrder?.sisa_bayar || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

    </PageWrapper>
  );
}
