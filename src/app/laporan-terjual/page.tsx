
"use client";

import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, FileText, Eye, ArrowUpDown, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { format, parse } from "date-fns";
import Link from "next/link";

const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const SALES_DETAIL_DOC_ID = "oQu7zep2d8jM7ChPE3Ja";
const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";
const USERS_DOC_ID = "b7ojJpFKj4RNIkQneCpu";

export default function LaporanlPage() {
  const [user, setUser] = useState<User | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [salesDetailData, setSalesDetailData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [penggunaData, setPenggunaData] = useState<any[] | null>(null);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
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
      fetchAllData();
    }
  }, [user]);

  useEffect(() => {
    if (!salesData || productsData.length === 0 || salesDetailData.length === 0) return;
    
    let processedSales = salesData.map(sale => {
      const details = salesDetailData.filter(d => d.id_orders === sale.id_orders);
      const totalModal = details.reduce((sum, detail) => {
        const product = productsData.find(p => p.id_produk === detail.id_produk);
        const modal = parseFloat(product?.harga_modal || 0);
        const jumlah = parseInt(detail.jumlah, 10);
        return sum + (modal * jumlah);
      }, 0);
      return { ...sale, total_modal_calculated: totalModal };
    });

    let sortedData = [...processedSales];
    if (sortConfig !== null) {
        sortedData.sort((a, b) => {
            let valA, valB;

            if (sortConfig.key === 'tanggal_pesan') {
                try {
                    valA = parse(a.tanggal_pesan, "dd/MM/yyyy", new Date()).getTime();
                    valB = parse(b.tanggal_pesan, "dd/MM/yyyy", new Date()).getTime();
                } catch(e) {
                    valA = 0; valB = 0;
                }
            } else {
                valA = a[sortConfig.key];
                valB = b[sortConfig.key];
            }

            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }

    const filteredData = sortedData.filter(
      (item) =>
        item.nama_pemesan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id_orders?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.alamat?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [salesData, salesDetailData, productsData, searchTerm, itemsPerPage, currentPage, sortConfig]);


  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesSnap, penggunaSnap, detailsSnap, productsSnap] = await Promise.all([
        getDoc(doc(database, "migrated_data", SALES_DOC_ID)),
        getDoc(doc(database, "migrated_data", USERS_DOC_ID)),
        getDoc(doc(database, "migrated_data", SALES_DETAIL_DOC_ID)),
        getDoc(doc(database, "migrated_data", PRODUCTS_DOC_ID)),
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

      setSalesData(getArrayData(salesSnap, SALES_DOC_ID).map((p: any, index: number) => ({ no: index + 1, ...p })));
      setPenggunaData(getArrayData(penggunaSnap, USERS_DOC_ID));
      setSalesDetailData(getArrayData(detailsSnap, SALES_DETAIL_DOC_ID));
      setProductsData(getArrayData(productsSnap, PRODUCTS_DOC_ID));

    } catch (err: any) {
       const friendlyMessage =
        err.code === "permission-denied"
          ? "Permission denied. Please check your Firestore security rules to allow reads."
          : `An unexpected error occurred: ${err.message}`;
      setError(friendlyMessage);
      setSalesData([]);
      setPenggunaData([]);
      setSalesDetailData([]);
      setProductsData([]);
    }
    setIsLoading(false);
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
    // Using non-strict equality to handle potential type mismatch (e.g., "28" vs 28)
    // eslint-disable-next-line eqeqeq
    const pengguna = penggunaData.find(p => p.id_user == id);
    return pengguna ? pengguna.nama_lengkap : `ID: ${id}`;
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

  const handleExportCSV = () => {
    if (!salesData || !salesDetailData || !productsData) return;

    const getProductName = (id: string) => {
        const product = productsData.find(p => p.id_produk === id);
        return product ? product.nama_produk : `ID: ${id}`;
    };

    const headers = [
      "No Orders", "No Ref", "Nama Pemesan", "Alamat", "Tanggal Pesan",
      "Karyawan", "Status", "Kode Produk", "Nama Produk", "Jumlah", "Harga Satuan", "Total Harga Item",
      "Total Bayar Transaksi", 
    ];

    const dataForCSV = salesData.flatMap(sale => {
        const details = salesDetailData.filter(d => d.id_orders === sale.id_orders);
        if (details.length === 0) {
            return [{
                "No Orders": sale.id_orders,
                "No Ref": sale.no_ref,
                "Nama Pemesan": sale.nama_pemesan,
                "Alamat": sale.alamat,
                "Tanggal Pesan": sale.tanggal_pesan,
                "Karyawan": getNamaKaryawan(sale.id_user),
                "Status": sale.status,
                "Kode Produk": "",
                "Nama Produk": "N/A",
                "Jumlah": "0",
                "Harga Satuan": "0",
                "Total Harga Item": "0",
               "Total Bayar Transaksi": sale.jumlah_bayar || "0",
            }];
        }
        return details.map(detail => ({
            "No Orders": sale.id_orders,
            "No Ref": sale.no_ref,
            "Nama Pemesan": sale.nama_pemesan,
            "Alamat": sale.alamat,
            "Tanggal Pesan": sale.tanggal_pesan,
            "Karyawan": getNamaKaryawan(sale.id_user),
            "Status": sale.status,
            "Kode Produk": productsData.find(p => p.id_produk === detail.id_produk)?.kode_produk || detail.id_produk,
            "Nama Produk": getProductName(detail.id_produk),
            "Jumlah": detail.jumlah,
            "Harga Satuan": detail.harga,
            "Total Harga Item": (parseFloat(detail.jumlah) * parseFloat(detail.harga)).toString(),
           "Total Bayar Transaksi": sale.jumlah_bayar || "0",
        }));
    });

    const csvContent = [
      headers.join(','),
      ...dataForCSV.map(row => 
        headers.map(header => {
          let value = String(row[header as keyof typeof row] ?? '');
          // Escape commas and quotes
          if (value.includes(',')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'laporan-penjualan-detail.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const totalItemsAfterFilter = useMemo(() => {
    return salesData.filter(
      (item) =>
        item.nama_pemesan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id_orders?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.alamat?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length;
  }, [salesData, searchTerm]);
  
  const totalPages = Math.ceil(totalItemsAfterFilter / itemsPerPage);

  const renderTableContent = () => {
    if (!paginatedData || paginatedData.length === 0 || !penggunaData) {
      return (
        <TableRow>
          <TableCell colSpan={11} className="text-center">
            No data available.
          </TableCell>
        </TableRow>
      );
    }
    
    const totalBayar = paginatedData.reduce((sum, item) => sum + parseFloat(item.jumlah_bayar || 0), 0);
    const totalSisaBayar = paginatedData.reduce((sum, item) => sum + parseFloat(item.sisa_bayar || 0), 0);

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
           <TableCell className="text-red-500">{formatCurrency(item.jumlah_bayar)}</TableCell>
            <TableCell className="text-red-500 font-bold">{formatCurrency(item.sisa_bayar)}</TableCell>
            <TableCell>
              <Button asChild variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                <Link href={`/laporan-terjual/${item.id_orders}`}target="_blank">
                  <Eye className="h-4 w-4 mr-1" /> Lihat Detail
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
         <TableRow className="font-bold bg-slate-200">
            <TableCell colSpan={6} className="text-center">Total</TableCell>
            <TableCell className="text-red-500">{formatCurrency(totalBayar)}</TableCell>
            <TableCell className="text-red-500">{formatCurrency(totalSisaBayar)}</TableCell>
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
              <CardTitle className="text-xl flex items-center gap-2">
                  <FileText />
                  Laporan Data Penjualan Eceran Pada Optik
              </CardTitle>
              <Button onClick={handleExportCSV} variant="outline" disabled={isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Export Detailed CSV
              </Button>
            </div>
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
                           <Button variant="ghost" onClick={() => requestSort('jumlah_bayar')} className="text-white hover:text-gray-300">
                             Total Bayar {getSortIndicator('jumlah_bayar')}
                           </Button>
                        </TableHead>
                        <TableHead className="text-white">
                           <Button variant="ghost" onClick={() => requestSort('sisa_bayar')} className="text-white hover:text-gray-300">
                             Kurang Bayar {getSortIndicator('sisa_bayar')}
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
