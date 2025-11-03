
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, FileText, BadgeDollarSign, ArrowUpDown, RefreshCw, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { format, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const DEBT_DOC_ID = "utang_data";
const DISTRIBUTOR_DOC_ID = "Ao1AOituA9BLIVdduMKe";
const EXPENSES_DOC_ID = "expenses_data";
const PURCHASE_DETAIL_DOC_ID = "pembelian_detail_data";
const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";


export default function LaporanUtangPage() {
  const [user, setUser] = useState<User | null>(null);
  const [debtData, setDebtData] = useState<any[]>([]);
  const [distributorData, setDistributorData] = useState<any[]>([]);
  const [purchaseDetails, setPurchaseDetails] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailItems, setDetailItems] = useState<any[]>([]);

  const paymentDifference = useMemo(() => {
    if (!selectedDebt) return 0;
    const sisaTagihan = parseFloat(selectedDebt.sisa_tagihan || 0);
    const amountPaid = parseFloat(paymentAmount.replace(/,/g, '') || 0);
    return amountPaid - sisaTagihan;
  }, [selectedDebt, paymentAmount]);

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

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [debtSnap, distSnap, detailSnap, productsSnap] = await Promise.all([
        getDoc(doc(database, "migrated_data", DEBT_DOC_ID)),
        getDoc(doc(database, "migrated_data", DISTRIBUTOR_DOC_ID)),
        getDoc(doc(database, "migrated_data", PURCHASE_DETAIL_DOC_ID)),
        getDoc(doc(database, "migrated_data", PRODUCTS_DOC_ID)),
      ]);

      const getArrayData = (snap: any) => snap.exists() && snap.data()?.data ? snap.data().data : [];
      
      setDebtData(getArrayData(debtSnap));
      setDistributorData(getArrayData(distSnap));
      setPurchaseDetails(getArrayData(detailSnap));
      setProducts(getArrayData(productsSnap));

    } catch (err: any) {
       const friendlyMessage =
        err.code === "permission-denied"
          ? "Permission denied. Please check your Firestore security rules to allow reads."
          : `An unexpected error occurred: ${err.message}`;
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  useEffect(() => {
    const outstandingDebts = debtData.filter(
      (item) => item.status !== 'Lunas' && parseFloat(item.sisa_tagihan || 0) > 0
    );

    let sortedData = [...outstandingDebts];
    if (sortConfig !== null) {
        sortedData.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (['total_tagihan', 'sisa_tagihan'].includes(sortConfig.key)) {
                valA = parseFloat(valA || 0);
                valB = parseFloat(valB || 0);
            } else if (sortConfig.key === 'tanggal_pembelian') {
                valA = a.tanggal_pembelian ? new Date(a.tanggal_pembelian).getTime() : 0;
                valB = b.tanggal_pembelian ? new Date(b.tanggal_pembelian).getTime() : 0;
            }

            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }

    const filteredData = sortedData.filter((item) =>
        item.no_nota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDistributorName(item.id_supplier)?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [debtData, searchTerm, itemsPerPage, currentPage, sortConfig]);

  const handleOpenPaymentModal = (debt: any) => {
    setSelectedDebt(debt);
    setPaymentAmount("");
  };

  const handleOpenDetailModal = (debt: any) => {
    const details = purchaseDetails.filter(d => d.id_pembelian === debt.id_pembelian);
    setDetailItems(details);
    setIsDetailModalOpen(true);
  };

  const getProductName = (id_produk: string) => {
    const product = products.find(p => p.id_produk === id_produk);
    return product ? product.nama_produk : `ID: ${id_produk}`;
  };

  const handlePaymentConfirmation = async () => {
    if (!selectedDebt || !user) return;
    setIsProcessing(true);

    const amountPaid = parseFloat(paymentAmount.replace(/,/g, '') || "0");
    if (amountPaid <= 0) {
        toast({ variant: "destructive", title: "Jumlah tidak valid", description: "Jumlah pembayaran harus lebih dari nol." });
        setIsProcessing(false);
        return;
    }
    
    const originalDebtData = [...debtData];

    try {
        const sisaTagihanAwal = parseFloat(selectedDebt.sisa_tagihan || 0);
        const sisaTagihanBaru = Math.max(0, sisaTagihanAwal - amountPaid);
        
        // Step 1: Update the debt document
        const updatedDebts = debtData.map(d => 
            d.id_pembelian === selectedDebt.id_pembelian ? {
                ...d,
                sisa_tagihan: sisaTagihanBaru.toString(),
                status: sisaTagihanBaru === 0 ? "Lunas" : "Belum Lunas",
            } : d
        );
        const debtDocRef = doc(database, "migrated_data", DEBT_DOC_ID);
        await updateDoc(debtDocRef, { data: updatedDebts });

        // Step 2: Add a new expense record for this payment
        const expensesDocRef = doc(database, "migrated_data", EXPENSES_DOC_ID);
        const expenseData = {
            id: `payment_utang_${Date.now()}`,
            no_ref: selectedDebt.no_nota,
            tanggal: format(new Date(), "yyyy-MM-dd"),
            judul: `Pembayaran Utang ke ${getDistributorName(selectedDebt.id_supplier)}`,
            kategori: "Pembayaran Utang",
            jumlah: String(amountPaid),
            keterangan: `Pembayaran utang untuk nota #${selectedDebt.no_nota}`,
            createdAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            createdBy: user.uid,
        };
        const expensesSnap = await getDoc(expensesDocRef);
        const currentExpenses = expensesSnap.exists() ? expensesSnap.data()?.data || [] : [];
        await setDoc(expensesDocRef, { data: [...currentExpenses, expenseData] });


        toast({ title: "Sukses", description: `Pembayaran utang untuk nota #${selectedDebt.no_nota} berhasil dicatat.` });
        setDebtData(updatedDebts);
        setSelectedDebt(null);

    } catch (err: any) {
        setDebtData(originalDebtData);
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: `Terjadi kesalahan: ${err.message}` });
    } finally {
        setIsProcessing(false);
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
      if (!distributorData || !id) return 'N/A';
      const distributor = distributorData.find(d => d.id_supplier === id);
      return distributor ? distributor.nama_supplier : `ID: ${id}`;
  }

  const formatCurrency = (value: string | number) => {
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return "Rp 0";
    return `Rp ${numberValue.toLocaleString('id-ID')}`;
  };
  
  const formatTanggal = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch {
      return dateString;
    }
  };
  
  const totalPages = Math.ceil(debtData.filter(item => item.status !== 'Lunas').length / itemsPerPage);

  const renderTableContent = () => {
    if (paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center">
            Tidak ada data utang.
          </TableCell>
        </TableRow>
      );
    }
    
    return paginatedData.map((item) => (
          <TableRow key={item.id_pembelian}>
            <TableCell>{formatTanggal(item.tanggal_pembelian)}</TableCell>
            <TableCell className="font-semibold">{item.no_nota}</TableCell>
            <TableCell>{getDistributorName(item.id_supplier)}</TableCell>
            <TableCell>{formatCurrency(item.total_tagihan)}</TableCell>
            <TableCell className="font-bold text-red-600">{formatCurrency(item.sisa_tagihan)}</TableCell>
            <TableCell className="flex gap-2">
               <Button onClick={() => handleOpenPaymentModal(item)} variant="outline" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                  <BadgeDollarSign className="h-4 w-4 mr-1" /> Bayar Utang
               </Button>
               <Button onClick={() => handleOpenDetailModal(item)} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" /> Detail
               </Button>
            </TableCell>
          </TableRow>
        ));
  };
  
  const paginationInfo = useMemo(() => {
    const totalFilteredItems = debtData.filter(item => item.status !== 'Lunas').length;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalFilteredItems);
    return `Tampilan ${totalFilteredItems > 0 ? startItem : 0}-${endItem} dari ${totalFilteredItems} Utang`;
  }, [debtData, currentPage, itemsPerPage]);

  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4" />;
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
              <CardTitle className="text-xl flex items-center gap-2"><FileText /> Laporan Utang Usaha</CardTitle>
              <Button onClick={fetchAllData} variant="outline" size="sm" disabled={isLoading}><RefreshCw className="mr-2 h-4 w-4"/> Refresh</Button>
            </div>
            <CardDescription>Daftar utang ke distributor yang belum lunas.</CardDescription>
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
                    <span className="text-sm">Cari Utang:</span>
                    <Input className="h-8 w-48" placeholder="Nama distributor, no nota..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
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
                        <TableHead className="text-white"><Button variant="ghost" onClick={() => requestSort('tanggal_pembelian')} className="text-white hover:text-gray-300">Tgl Pembelian {getSortIndicator('tanggal_pembelian')}</Button></TableHead>
                        <TableHead className="text-white"><Button variant="ghost" onClick={() => requestSort('no_nota')} className="text-white hover:text-gray-300">No. Nota {getSortIndicator('no_nota')}</Button></TableHead>
                        <TableHead className="text-white"><Button variant="ghost" onClick={() => requestSort('id_supplier')} className="text-white hover:text-gray-300">Distributor {getSortIndicator('id_supplier')}</Button></TableHead>
                        <TableHead className="text-white"><Button variant="ghost" onClick={() => requestSort('total_tagihan')} className="text-white hover:text-gray-300">Total Tagihan {getSortIndicator('total_tagihan')}</Button></TableHead>
                        <TableHead className="text-white"><Button variant="ghost" onClick={() => requestSort('sisa_tagihan')} className="text-white hover:text-gray-300">Sisa Tagihan {getSortIndicator('sisa_tagihan')}</Button></TableHead>
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
        <Dialog open={!!selectedDebt} onOpenChange={(isOpen) => !isOpen && setSelectedDebt(null)}>
            <DialogContent className="sm:max-w-md">
                {selectedDebt && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Pembayaran Utang</DialogTitle>
                            <DialogDescription>Distributor: {getDistributorName(selectedDebt.id_supplier)} (Nota #{selectedDebt.no_nota})</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center bg-red-100 p-3 rounded-md">
                                <Label className="text-lg text-red-700">Sisa Tagihan:</Label>
                                <span className="text-2xl font-bold text-red-600">{formatCurrency(selectedDebt.sisa_tagihan)}</span>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="payment_amount" className="text-base">Jumlah Dibayar:</Label>
                                <Input 
                                    id="payment_amount" 
                                    type="text"
                                    value={paymentAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    onChange={(e) => setPaymentAmount(e.target.value.replace(/,/g, ''))}
                                    className="h-12 text-lg font-bold text-right"
                                    placeholder="Masukkan jumlah..."
                                />
                             </div>
                              {parseFloat(paymentAmount.replace(/,/g, '') || "0") > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <Label className="text-lg">
                                        {paymentDifference >= 0 ? "Kelebihan Bayar:" : "Sisa Tagihan Baru:"}
                                    </Label>
                                    <span className={`text-2xl font-bold ${paymentDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {formatCurrency(Math.abs(paymentDifference))}
                                    </span>
                                </div>
                              )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" onClick={() => setSelectedDebt(null)}>Batal</Button>
                            </DialogClose>
                            <Button onClick={handlePaymentConfirmation} disabled={isProcessing || !paymentAmount}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Konfirmasi Pembayaran
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
        
        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Detail Pembelian</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead>Jumlah</TableHead>
                                <TableHead className="text-right">Harga Beli</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {detailItems.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Detail produk tidak ditemukan.</TableCell></TableRow>
                            ) : (
                                detailItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{getProductName(item.id_produk)}</TableCell>
                                        <TableCell>{item.jumlah}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.harga_modal)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(parseFloat(item.harga_modal || 0) * parseInt(item.jumlah || 1))}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>

    </PageWrapper>
  );
}
