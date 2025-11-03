
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, FileText, ArrowUpDown, PlusCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { format, parse, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const EXPENSES_DOC_ID = "expenses_data";
const PAYMENTS_DOC_ID = "payments_data";

export default function LaporanKasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'tanggal', direction: 'descending' });
  const router = useRouter();
  const { toast } = useToast();
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [newExpenseData, setNewExpenseData] = useState({
    tanggal: format(new Date(), "yyyy-MM-dd"),
    judul: "",
    kategori: "Operasional",
    jumlah: "",
    no_nota: "",
    keterangan: "",
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
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    let processedTransactions: any[] = [];
    let runningBalance = 0;
    
    const sortedForBalance = [...transactions].sort((a, b) => {
        const timeA = a.tanggal ? a.tanggal.getTime() : 0;
        const timeB = b.tanggal ? b.tanggal.getTime() : 0;
        return timeA - timeB;
    });
    
    processedTransactions = sortedForBalance.map(tx => {
        runningBalance += (tx.debit || 0) - (tx.kredit || 0);
        return { ...tx, saldo: runningBalance };
    });

    let sortedData = [...processedTransactions];
     if (sortConfig !== null) {
        sortedData.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (['debit', 'kredit', 'saldo'].includes(sortConfig.key)) {
                valA = valA || 0;
                valB = valB || 0;
            } else if (sortConfig.key === 'tanggal') {
                valA = a.tanggal ? a.tanggal.getTime() : 0;
                valB = b.tanggal ? b.tanggal.getTime() : 0;
            }

            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }

    const filteredData = sortedData.filter(
      (item) =>
        item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_ref?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [transactions, searchTerm, itemsPerPage, currentPage, sortConfig]);

  const parseDateString = (dateString: string): Date | null => {
      if (!dateString) return null;
      // Try parsing dd/MM/yyyy first
      let date = parse(dateString, "dd/MM/yyyy", new Date());
      if (isValid(date)) {
          return date;
      }
      // Fallback to parsing yyyy-MM-dd or other ISO-like formats
      date = new Date(dateString);
      if (isValid(date)) {
          return date;
      }
      return null;
  }

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesSnap, expensesSnap, paymentsSnap] = await Promise.all([
        getDoc(doc(database, "migrated_data", SALES_DOC_ID)),
        getDoc(doc(database, "migrated_data", EXPENSES_DOC_ID)),
        getDoc(doc(database, "migrated_data", PAYMENTS_DOC_ID)),
      ]);
      
      let allTransactions: any[] = [];

      if (salesSnap.exists()) {
        const salesData = salesSnap.data()?.data || [];
        const salesTransactions = salesData.map((sale: any, index: number) => ({
            id: `sale-${sale.id_orders || index}`,
            tanggal: parseDateString(sale.tanggal_pesan),
            no_ref: sale.no_ref,
            keterangan: `Penjualan Awal: ${sale.nama_pemesan} (Nota #${sale.id_orders})`,
            debit: parseFloat(sale.jumlah_bayar || 0),
            kredit: 0,
        }));
        allTransactions.push(...salesTransactions);
      }
      
      if (expensesSnap.exists()) {
        const expensesData = expensesSnap.data()?.data || [];
        const expenseTransactions = expensesData.map((expense: any, index: number) => ({
            id: `expense-${expense.id || index}`,
            tanggal: parseDateString(expense.tanggal),
            no_ref: expense.no_ref,
            keterangan: `${expense.kategori}: ${expense.judul}`,
            debit: 0,
            kredit: parseFloat(expense.jumlah || 0),
        }));
        allTransactions.push(...expenseTransactions);
      }
      
      if (paymentsSnap.exists()) {
        const paymentsData = paymentsSnap.data()?.data || [];
        const paymentTransactions = paymentsData.map((payment: any, index: number) => ({
            id: `payment-${payment.id || index}`,
            tanggal: parseDateString(payment.tanggal_bayar),
            no_ref: payment.no_ref,
            keterangan: payment.keterangan || `Pelunasan Nota #${payment.no_ref}`,
            debit: parseFloat(payment.jumlah || 0),
            kredit: 0,
        }));
        allTransactions.push(...paymentTransactions);
      }


      setTransactions(allTransactions);

    } catch (err: any) {
       const friendlyMessage =
        err.code === "permission-denied"
          ? "Permission denied. Please check your Firestore security rules."
          : `An unexpected error occurred: ${err.message}`;
      setError(friendlyMessage);
    }
    setIsLoading(false);
  };
  
    const handleExpenseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'jumlah') {
            const rawValue = value.replace(/[^0-9]/g, '');
            setNewExpenseData(prev => ({ ...prev, [name]: rawValue }));
        } else {
            setNewExpenseData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleExpenseSelectChange = (name: string, value: string) => {
        setNewExpenseData(prev => ({ ...prev, [name]: value }));
    }

    const formatNumberInput = (value: string) => {
        if (!value) return '';
        const numberValue = parseInt(value, 10);
        return isNaN(numberValue) ? '' : numberValue.toLocaleString('id-ID');
    };


    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: "destructive", title: "Anda harus login terlebih dahulu" });
            return;
        }

        setIsSavingExpense(true);
        const expenseDocRef = doc(database, "migrated_data", EXPENSES_DOC_ID);
        
        const generatedId = `exp_${Date.now()}`;
        const now = new Date();

        const expenseData = {
            id: generatedId,
            no_ref: newExpenseData.no_nota || generatedId,
            tanggal: newExpenseData.tanggal,
            judul: newExpenseData.judul,
            kategori: newExpenseData.kategori,
            jumlah: newExpenseData.jumlah.replace(/,/g, ''),
            keterangan: newExpenseData.keterangan,
            createdAt: format(now, "yyyy-MM-dd HH:mm:ss"),
            createdBy: user.uid,
            updatedAt: format(now, "yyyy-MM-dd HH:mm:ss"),
            updatedBy: user.uid,
        };

        try {
            const docSnap = await getDoc(expenseDocRef);
            let updatedData = [];
            if (docSnap.exists() && Array.isArray(docSnap.data().data)) {
                updatedData = [...docSnap.data().data, expenseData];
            } else {
                updatedData = [expenseData];
            }
            
            await setDoc(expenseDocRef, { data: updatedData });
            
            toast({ title: "Sukses", description: "Data pengeluaran berhasil disimpan." });
            fetchData();
            setIsExpenseModalOpen(false);
            setNewExpenseData({
              tanggal: format(new Date(), "yyyy-MM-dd"),
              judul: "",
              kategori: "Operasional",
              jumlah: "",
              no_nota: "",
              keterangan: "",
            });
        } catch (err: any) {
             toast({
                variant: "destructive",
                title: "Gagal Menyimpan",
                description: `Terjadi kesalahan: ${err.message}`,
            });
        } finally {
            setIsSavingExpense(false);
        }
    };


  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || typeof value === 'undefined') return "-";
    return `Rp ${value.toLocaleString('id-ID')}`;
  };
  
  const formatTanggal = (date: Date) => {
    if (!date || !isValid(date)) return "-";
    return format(date, "dd MMM yyyy");
  };
  
  const totalPages = Math.ceil(transactions.filter(
      (item) =>
        item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_ref?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length / itemsPerPage);

  const renderTableContent = () => {
    if (!paginatedData || paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center">
            Tidak ada data transaksi kas.
          </TableCell>
        </TableRow>
      );
    }
    
    return paginatedData.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{formatTanggal(item.tanggal)}</TableCell>
        <TableCell>{item.no_ref}</TableCell>
        <TableCell>{item.keterangan}</TableCell>
        <TableCell className="text-green-600">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</TableCell>
        <TableCell className="text-red-600">{item.kredit > 0 ? formatCurrency(item.kredit) : '-'}</TableCell>
        <TableCell className="font-bold">{formatCurrency(item.saldo)}</TableCell>
      </TableRow>
    ));
  };
  
  const paginationInfo = useMemo(() => {
    const totalFilteredItems = transactions.filter(
      (item) =>
        item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_ref?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalFilteredItems);
    return `Menampilkan ${totalFilteredItems > 0 ? startItem : 0}-${endItem} dari ${totalFilteredItems} transaksi`;
  }, [transactions, searchTerm, currentPage, itemsPerPage]);

  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4" />;
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
                <CardTitle className="text-xl flex items-center gap-2">
                    <FileText />
                    Laporan Buku Kas
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                      <PlusCircle className="mr-2 h-4 w-4"/>
                      Tambah Pengeluaran
                  </Button>
                  <Button onClick={fetchData} variant="outline" size="icon" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
            </div>
            <CardDescription>
                Melihat semua transaksi pemasukan dan pengeluaran.
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
                             <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm">Data</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm">Cari Transaksi:</span>
                    <Input className="h-8 w-48" placeholder="Keterangan, no nota..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                           <Button variant="ghost" onClick={() => requestSort('tanggal')} className="text-white hover:text-gray-300">
                             Tanggal {getSortIndicator('tanggal')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('no_ref')} className="text-white hover:text-gray-300">
                             No. Nota {getSortIndicator('no_ref')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('keterangan')} className="text-white hover:text-gray-300">
                             Keterangan {getSortIndicator('keterangan')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('debit')} className="text-white hover:text-gray-300">
                             Debit {getSortIndicator('debit')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('kredit')} className="text-white hover:text-gray-300">
                             Kredit {getSortIndicator('kredit')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('saldo')} className="text-white hover:text-gray-300">
                             Saldo {getSortIndicator('saldo')}
                           </Button>
                        </TableHead>
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
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Sebelumnya</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Selanjutnya</Button>
                </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Add Expense Modal */}
        <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSaveExpense}>
                    <DialogHeader>
                        <DialogTitle>Tambah Pengeluaran Baru</DialogTitle>
                        <DialogDescription>
                            Catat pengeluaran operasional atau biaya lainnya.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tanggal" className="text-right">Tanggal</Label>
                            <Input id="tanggal" name="tanggal" type="date" value={newExpenseData.tanggal} onChange={handleExpenseInputChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="no_nota" className="text-right">No. Nota</Label>
                            <Input id="no_nota" name="no_nota" value={newExpenseData.no_nota} onChange={handleExpenseInputChange} className="col-span-3" placeholder="Opsional"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="judul" className="text-right">Judul</Label>
                            <Input id="judul" name="judul" value={newExpenseData.judul} onChange={handleExpenseInputChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="kategori" className="text-right">Kategori</Label>
                             <Select name="kategori" onValueChange={(value) => handleExpenseSelectChange("kategori", value)} value={newExpenseData.kategori}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Operasional">Operasional</SelectItem>
                                    <SelectItem value="Pembelian Stok">Pembelian Stok</SelectItem>
                                    <SelectItem value="Gaji">Gaji</SelectItem>
                                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="jumlah" className="text-right">Jumlah (Rp)</Label>
                            <Input id="jumlah" name="jumlah" type="text" value={formatNumberInput(newExpenseData.jumlah)} onChange={handleExpenseInputChange} className="col-span-3 text-right" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="keterangan" className="text-right">Keterangan</Label>
                            <Textarea id="keterangan" name="keterangan" value={newExpenseData.keterangan} onChange={handleExpenseInputChange} className="col-span-3" placeholder="Opsional..."/>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Batal</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSavingExpense}>
                            {isSavingExpense && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Pengeluaran
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

    </PageWrapper>
  );
}
