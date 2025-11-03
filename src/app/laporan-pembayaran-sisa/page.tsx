
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, AlertTriangle, FileText, Eye, BadgeDollarSign, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { format, parse } from "date-fns";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const PAYMENTS_DOC_ID = "payments_data";

export default function LaporanPembayaranSisaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
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
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);


  const paymentDifference = useMemo(() => {
    if (!selectedOrder) return 0;
    const sisaBayar = parseFloat(selectedOrder.sisa_bayar || 0);
    const amountPaid = parseFloat(paymentAmount.replace(/,/g, '') || 0);
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

  useEffect(() => {
    if (!salesData) return;

    const outstandingPayments = salesData.filter(
      (item) => parseFloat(item.sisa_bayar || 0) > 0
    );

    let sortedData = [...outstandingPayments];
    if (sortConfig !== null) {
        sortedData.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (['total_jual', 'jumlah_bayar', 'sisa_bayar'].includes(sortConfig.key)) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            } else if (sortConfig.key === 'tanggal_pesan') {
                valA = parse(valA, "dd/MM/yyyy", new Date()).getTime();
                valB = parse(valB, "dd/MM/yyyy", new Date()).getTime();
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

    const filteredData = sortedData.filter(
      (item) =>
        item.nama_pemesan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_ref?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [salesData, searchTerm, itemsPerPage, currentPage, sortConfig]);


  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const salesDocRef = doc(database, "migrated_data", SALES_DOC_ID);
      const salesSnap = await getDoc(salesDocRef);
      
      let sales: any[] = [];
      if (salesSnap.exists()) {
        const salesDocData = salesSnap.data();
        if (salesDocData && Array.isArray(salesDocData.data)) {
          sales = salesDocData.data.map((p: any, index: number) => ({ no: index + 1, ...p }));
        } else {
           throw new Error(`Document with ID ${SALES_DOC_ID} does not contain a 'data' array field.`);
        }
      } else {
         throw new Error(`No document found with ID: ${SALES_DOC_ID}`);
      }
      
      setSalesData(sales);

    } catch (err: any) {
       const friendlyMessage =
        err.code === "permission-denied"
          ? "Permission denied. Please check your Firestore security rules to allow reads."
          : `An unexpected error occurred: ${err.message}`;
      setError(friendlyMessage);
      setSalesData([]);
    }
    setIsLoading(false);
  };
  
  const handleOpenPaymentModal = async (order: any) => {
    setSelectedOrder(order);
    setPaymentAmount("");
    setPaymentHistory([]);
    setIsHistoryLoading(true);
    
    try {
        const paymentsDocRef = doc(database, "migrated_data", PAYMENTS_DOC_ID);
        const paymentsSnap = await getDoc(paymentsDocRef);
        if (paymentsSnap.exists() && paymentsSnap.data()?.data) {
            const allPayments = paymentsSnap.data().data;
            const history = allPayments.filter((p: any) => p.no_ref === order.no_ref);
            setPaymentHistory(history);
        }
    } catch(err: any) {
        console.error("Gagal memuat riwayat pembayaran:", err);
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat riwayat pembayaran." });
    } finally {
        setIsHistoryLoading(false);
    }
  };


    const handlePaymentConfirmation = async () => {
        if (!selectedOrder || !user) return;
        setIsProcessing(true);

        const amountPaid = parseFloat(paymentAmount.replace(/,/g, '') || "0");
        if (amountPaid <= 0) {
            toast({ variant: "destructive", title: "Jumlah tidak valid", description: "Jumlah pembayaran harus lebih dari nol." });
            setIsProcessing(false);
            return;
        }

        const originalSalesData = [...salesData];
        let updatedSalesData;

        try {
            // Step 1: Update the original sales order
            const sisaBayarAwal = parseFloat(selectedOrder.sisa_bayar || 0);
            const totalBayarAwal = parseFloat(selectedOrder.jumlah_bayar || 0);
            const sisaBayarBaru = Math.max(0, sisaBayarAwal - amountPaid);
            const totalBayarBaru = totalBayarAwal + amountPaid;
            
            updatedSalesData = salesData.map(sale => {
                if (sale.no_ref === selectedOrder.no_ref) {
                    return {
                        ...sale,
                        jumlah_bayar: String(totalBayarBaru),
                        sisa_bayar: String(sisaBayarBaru),
                        status: sisaBayarBaru === 0 ? "lunas" : sale.status,
                    };
                }
                return sale;
            });
            const salesDocRef = doc(database, "migrated_data", SALES_DOC_ID);
            await updateDoc(salesDocRef, { data: updatedSalesData.map(({no, ...rest}) => rest) });
            
            // Step 2: Add a new record to the payments collection for cash flow tracking
            const paymentsDocRef = doc(database, "migrated_data", PAYMENTS_DOC_ID);
            const paymentData = {
                id: `pay_${Date.now()}`,
                no_ref: selectedOrder.no_ref,
                tanggal_bayar: format(new Date(), "dd/MM/yyyy"),
                jumlah: String(amountPaid),
                keterangan: `Pembayaran Sisa Bayar untuk Nota #${selectedOrder.no_ref}`,
                createdBy: user.uid,
            };

            const paymentsSnap = await getDoc(paymentsDocRef);
            let currentPayments = [];
            if (paymentsSnap.exists() && Array.isArray(paymentsSnap.data()?.data)) {
                currentPayments = paymentsSnap.data().data;
            }
             // Use setDoc with merge to create the document if it doesn't exist
            await setDoc(paymentsDocRef, { data: [...currentPayments, paymentData] }, { merge: true });

            toast({ title: "Sukses", description: `Pembayaran untuk nota #${selectedOrder.no_ref} berhasil dicatat.` });
            setSalesData(updatedSalesData);
            setSelectedOrder(null);

        } catch (err: any) {
            setSalesData(originalSalesData);
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
  
  const totalPages = Math.ceil(paginatedData.length / itemsPerPage);

  const renderTableContent = () => {
    if (!paginatedData || paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center">
            Tidak ada data sisa pembayaran.
          </TableCell>
        </TableRow>
      );
    }
    
    return (
      <>
        {paginatedData.map((item) => (
          <TableRow key={item.no_ref}>
            <TableCell className="font-semibold">{item.no_ref}</TableCell>
            <TableCell>{formatTanggal(item.tanggal_pesan)}</TableCell>
            <TableCell>{item.nama_pemesan}</TableCell>
            <TableCell>{formatCurrency(item.total_jual)}</TableCell>
            <TableCell>{formatCurrency(item.jumlah_bayar)}</TableCell>
            <TableCell className="font-bold text-red-600">{formatCurrency(item.sisa_bayar)}</TableCell>
            <TableCell>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    item.status === 'lunas' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                    {item.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                </span>
            </TableCell>
            <TableCell className="flex gap-2">
               <Button onClick={() => handleOpenPaymentModal(item)} variant="outline" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                  <BadgeDollarSign className="h-4 w-4 mr-1" /> Bayar Sisa
               </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/laporan-terjual/${item.no_ref}`}>
                  <Eye className="h-4 w-4 mr-1" /> Detail
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  };
  
  const paginationInfo = useMemo(() => {
    const totalFilteredItems = salesData.filter(item => parseFloat(item.sisa_bayar || 0) > 0).length;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalFilteredItems);
    return `Tampilan ${totalFilteredItems > 0 ? startItem : 0}-${endItem} dari ${totalFilteredItems} Data`;
  }, [salesData, currentPage, itemsPerPage]);

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
            <CardTitle className="text-xl flex items-center gap-2">
                <BadgeDollarSign />
                Laporan Pembayaran Sisa
            </CardTitle>
            <CardDescription>
                Melihat dan mengelola sisa pembayaran dari transaksi pelanggan.
            </CardDescription>
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
                    <span className="text-sm">Cari Laporan:</span>
                    <Input className="h-8 w-48" placeholder="Nama, no order..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                           <Button variant="ghost" onClick={() => requestSort('no_ref')} className="text-white hover:text-gray-300">
                             No Nota {getSortIndicator('no_ref')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('tanggal_pesan')} className="text-white hover:text-gray-300">
                             Tanggal Pesan {getSortIndicator('tanggal_pesan')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('nama_pemesan')} className="text-white hover:text-gray-300">
                             Nama Pemesan {getSortIndicator('nama_pemesan')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('total_jual')} className="text-white hover:text-gray-300">
                             Total Tagihan {getSortIndicator('total_jual')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('jumlah_bayar')} className="text-white hover:text-gray-300">
                             Total Bayar {getSortIndicator('jumlah_bayar')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('sisa_bayar')} className="text-white hover:text-gray-300">
                             Sisa Bayar {getSortIndicator('sisa_bayar')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('status')} className="text-white hover:text-gray-300">
                             Status {getSortIndicator('status')}
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
                            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
                            <DialogDescription>
                                Nota Ref #{selectedOrder.no_ref} a/n {selectedOrder.nama_pemesan}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            
                            {isHistoryLoading ? (
                                <div className="flex justify-center items-center h-24">
                                    <Loader2 className="h-6 w-6 animate-spin"/>
                                </div>
                            ) : paymentHistory.length > 0 && (
                                <div>
                                    <Label className="text-base">Riwayat Pembayaran</Label>
                                    <div className="border rounded-md mt-2 max-h-32 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tanggal</TableHead>
                                                    <TableHead className="text-right">Jumlah</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paymentHistory.map((p, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>{formatTanggal(p.tanggal_bayar)}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(p.jumlah)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center bg-red-100 p-3 rounded-md">
                                <Label className="text-lg text-red-700">Sisa Pembayaran:</Label>
                                <span className="text-2xl font-bold text-red-600">{formatCurrency(selectedOrder.sisa_bayar)}</span>
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
                                        {paymentDifference >= 0 ? "Kembalian:" : "Sisa Setelah Bayar:"}
                                    </Label>
                                    <span className={`text-2xl font-bold ${paymentDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {formatCurrency(Math.abs(paymentDifference))}
                                    </span>
                                </div>
                              )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" onClick={() => setSelectedOrder(null)}>Batal</Button>
                            </DialogClose>
                            <Button 
                                onClick={handlePaymentConfirmation} 
                                disabled={isProcessing || !paymentAmount}
                            >
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Konfirmasi Pembayaran
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>

    </PageWrapper>
  );
}
