
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, PackageCheck, ArrowUpDown, CheckCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { format, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const USERS_DOC_ID = "b7ojJpFKj4RNIkQneCpu";

export default function LaporanPengambilanPage() {
  const [user, setUser] = useState<User | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [penggunaData, setPenggunaData] = useState<any[] | null>(null);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const paymentDifference = useMemo(() => {
    if (!selectedOrder) return 0;
    const sisaBayar = parseFloat(selectedOrder.sisa_bayar || 0);
    const amountPaid = parseFloat(paymentAmount || 0);
    return amountPaid - sisaBayar;
  }, [selectedOrder, paymentAmount]);

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

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesSnap, penggunaSnap] = await Promise.all([
        getDoc(doc(database, "migrated_data", SALES_DOC_ID)),
        getDoc(doc(database, "migrated_data", USERS_DOC_ID)),
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
  }, []);

  const filteredAndSortedData = useMemo(() => {
    if (!salesData) return [];
    
    const readyForPickupOrders = salesData.filter(item => 
      item.tanggal_selesai && item.tanggal_selesai.trim() !== "" && 
      (!item.tanggal_ambil || item.tanggal_ambil.trim() === "")
    );

    let sortedData = [...readyForPickupOrders];
    if (sortConfig !== null) {
        sortedData.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (['total_jual', 'sisa_bayar'].includes(sortConfig.key)) {
                valA = parseFloat(valA || 0);
                valB = parseFloat(valB || 0);
            } else if (['tanggal_pesan', 'tanggal_selesai'].includes(sortConfig.key)) {
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
        item.id_orders?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleOpenPaymentModal = (order: any) => {
    setSelectedOrder(order);
    const sisaBayar = parseFloat(order.sisa_bayar || 0);
    setPaymentAmount(sisaBayar > 0 ? "" : "0");
  };
  
  const handlePaymentConfirmation = async () => {
    if (!selectedOrder) return;
    setIsProcessing(selectedOrder.id_orders);

    const originalSalesData = [...salesData];
    
    const updatedSalesDataOptimistic = salesData.map((sale: any) => {
        if (sale.id_orders === selectedOrder.id_orders) {
            const currentTotalBayar = parseFloat(sale.jumlah_bayar || 0);
            const sisaDibayar = parseFloat(paymentAmount || 0);
            return { 
                ...sale, 
                tanggal_ambil: format(new Date(), "dd/MM/yyyy"),
                jumlah_bayar: (currentTotalBayar + sisaDibayar).toString(),
                sisa_bayar: "0",
                status: "lunas",
            };
        }
        return sale;
    });

    setSalesData(updatedSalesDataOptimistic);
    setSelectedOrder(null);

    try {
      const salesDocRef = doc(database, "migrated_data", SALES_DOC_ID);
      // Remove `no` field if it exists, as it's a client-side addition
      const dataToSave = updatedSalesDataOptimistic.map(({ no, ...rest }) => rest);
      await updateDoc(salesDocRef, { data: dataToSave });

      toast({
        title: "Sukses",
        description: `Pesanan #${selectedOrder.id_orders} telah lunas dan ditandai sudah diambil.`,
      });

    } catch (err: any) {
      setSalesData(originalSalesData);
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: `Terjadi kesalahan: ${err.message}`,
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getNamaKaryawan = (id: string, item?: any) => {
    if (item?.nama_karyawan) return item.nama_karyawan;
    if (item?.nama_user) return item.nama_user;
    if (item?.karyawan) return item.karyawan;
    if (item?.kasir) return item.kasir;
    if (!id || id === "undefined" || id === "null") return "-";
    const cleanId = String(id).trim();
    if (penggunaData && Array.isArray(penggunaData)) {
      const pengguna = penggunaData.find((p) => {
        if (!p) return false;
        return (
          (p.id_pengguna && String(p.id_pengguna).trim() === cleanId) ||
          (p.id_user && String(p.id_user).trim() === cleanId) ||
          (p.uid && String(p.uid).trim() === cleanId) ||
          (p.email && String(p.email).toLowerCase().trim() === cleanId.toLowerCase()) ||
          (p.username && String(p.username).toLowerCase().trim() === cleanId.toLowerCase())
        );
      });
      if (pengguna) {
        return pengguna.nama_lengkap || pengguna.username || pengguna.email || cleanId;
      }
    }
    return cleanId;
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
    if (!paginatedData || paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center">
            Tidak ada pesanan yang siap diambil.
          </TableCell>
        </TableRow>
      );
    }
    
    return (
      <>
        {paginatedData.map((item) => (
          <TableRow key={item.id_orders}>
            <TableCell className="font-semibold text-red-600">{item.id_orders}</TableCell>
            <TableCell>{item.nama_pemesan}</TableCell>
            <TableCell>{formatTanggal(item.tanggal_pesan)}</TableCell>
            <TableCell>{formatTanggal(item.tanggal_selesai)}</TableCell>
            <TableCell>{getNamaKaryawan(item.id_user, item)}</TableCell>
            <TableCell className="text-red-500 font-bold">{formatCurrency(item.sisa_bayar)}</TableCell>
            <TableCell className="flex gap-2">
              <Button onClick={() => handleOpenPaymentModal(item)} variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white" disabled={isProcessing === item.id_orders}>
                  {isProcessing === item.id_orders ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Diambil
              </Button>
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
    return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }

  return (
    <PageWrapper>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                  <PackageCheck />
                  Laporan Pengambilan Barang
              </CardTitle>
              <Button onClick={fetchAllData} variant="outline" size="sm" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                 Refresh
              </Button>
            </div>
            <CardDescription>Daftar pesanan yang telah selesai dan siap untuk diambil oleh pelanggan.</CardDescription>
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm">Tampilkan</span>
                     <Select defaultValue={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                        <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
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
                    <Input className="h-8 w-48" placeholder="Nama, no ref..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                           <Button variant="ghost" onClick={() => requestSort('nama_pemesan')} className="text-white hover:text-gray-300">
                             Nama Pemesan {getSortIndicator('nama_pemesan')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('tanggal_pesan')} className="text-white hover:text-gray-300">
                             Tanggal Pesan {getSortIndicator('tanggal_pesan')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('tanggal_selesai')} className="text-white hover:text-gray-300">
                             Tanggal Selesai {getSortIndicator('tanggal_selesai')}
                           </Button>
                        </TableHead>
                         <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('id_user')} className="text-white hover:text-gray-300">
                             Karyawan {getSortIndicator('id_user')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('sisa_bayar')} className="text-white hover:text-gray-300">
                             Sisa Bayar {getSortIndicator('sisa_bayar')}
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

        {/* Payment Confirmation Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)}>
            <DialogContent className="sm:max-w-md">
                {selectedOrder && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Konfirmasi Pembayaran & Pengambilan</DialogTitle>
                            <DialogDescription>
                                Pesanan #{selectedOrder.id_orders} a/n {selectedOrder.nama_pemesan}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-lg">Sisa Pembayaran:</Label>
                                <span className="text-2xl font-bold text-red-600">{formatCurrency(selectedOrder.sisa_bayar)}</span>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="payment_amount" className="text-base">Jumlah Dibayar:</Label>
                                <Input 
                                    id="payment_amount" 
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="h-12 text-lg font-bold text-right"
                                    placeholder="Masukkan jumlah..."
                                    disabled={parseFloat(selectedOrder.sisa_bayar || 0) === 0}
                                />
                             </div>
                              {parseFloat(paymentAmount) > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <Label className="text-lg">
                                        {paymentDifference >= 0 ? "Kembalian:" : "Sisa Pembayaran:"}
                                    </Label>
                                    <span className={`text-2xl font-bold ${paymentDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {formatCurrency(Math.abs(paymentDifference))}
                                    </span>
                                </div>
                              )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Batal</Button>
                            </DialogClose>
                            <Button 
                                onClick={handlePaymentConfirmation} 
                                disabled={isProcessing === selectedOrder.id_orders || parseFloat(paymentAmount || 0) < parseFloat(selectedOrder.sisa_bayar || 0)}
                            >
                                {isProcessing === selectedOrder.id_orders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Konfirmasi Pembayaran & Selesaikan
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    </PageWrapper>
  );
}
