
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, FileText, Eye, ArrowUpDown, Download, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { format, parse } from "date-fns";
import Link from "next/link";
import NotaPrint from "@/components/print/NotaPrint";
import ResepPrint from "@/components/print/ResepPrint";

const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const SALES_DETAIL_DOC_ID = "oQu7zep2d8jM7ChPE3Ja";
const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";
const USERS_DOC_ID = "b7ojJpFKj4RNIkQneCpu";
const DOCTORS_DOC_ID = "txmviRt0A56SFQ5EpQIV";
const OPTIK_DOC_ID = "JXof497VgWYludHMt5Uc";
const INSTANSI_DOC_ID = "dzpok016Hnin9V6VQUTk";
const PRESCRIPTION_DOC_ID = "iXtZdfZU2pziTQDoWtYB";

export default function LaporanlPage() {
  const [user, setUser] = useState<User | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [salesDetailData, setSalesDetailData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [penggunaData, setPenggunaData] = useState<any[] | null>(null);
  const [doctorsData, setDoctorsData] = useState<any[]>([]);
  const [optikData, setOptikData] = useState<any[]>([]);
  const [prescriptionData, setPrescriptionData] = useState<any[]>([]);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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
            } else if (sortConfig.key === 'id_user') {
                valA = getNamaKaryawan(a.id_user, a);
                valB = getNamaKaryawan(b.id_user, b);
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
        item.alamat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getNamaKaryawan(item.id_user, item)?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [salesData, salesDetailData, productsData, penggunaData, searchTerm, itemsPerPage, currentPage, sortConfig]);


  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        salesSnap,
        penggunaSnap,
        detailsSnap,
        productsSnap,
        doctorsSnap,
        optikSnap,
        prescriptionSnap,
        instansiSnap
      ] = await Promise.all([
        getDoc(doc(database, "migrated_data", SALES_DOC_ID)),
        getDoc(doc(database, "migrated_data", USERS_DOC_ID)),
        getDoc(doc(database, "migrated_data", SALES_DETAIL_DOC_ID)),
        getDoc(doc(database, "migrated_data", PRODUCTS_DOC_ID)),
        getDoc(doc(database, "migrated_data", DOCTORS_DOC_ID)),
        getDoc(doc(database, "migrated_data", OPTIK_DOC_ID)),
        getDoc(doc(database, "migrated_data", PRESCRIPTION_DOC_ID)),
        getDoc(doc(database, "migrated_data", INSTANSI_DOC_ID)),
      ]);
      
      const getArrayData = (snap: any) => {
        if (snap.exists()) {
          const snapData = snap.data();
          if (snapData && Array.isArray(snapData.data)) {
            return snapData.data;
          }
          return [];
        }
        return [];
      };

      setSalesData(getArrayData(salesSnap).map((p: any, index: number) => ({ no: index + 1, ...p })));
      setPenggunaData(getArrayData(penggunaSnap));
      setSalesDetailData(getArrayData(detailsSnap));
      setProductsData(getArrayData(productsSnap));
      setDoctorsData(getArrayData(doctorsSnap));
      setPrescriptionData(getArrayData(prescriptionSnap));

      const optikList = getArrayData(optikSnap);
      const instansiList = getArrayData(instansiSnap);
      setOptikData([...optikList, ...instansiList]);

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
      setDoctorsData([]);
      setOptikData([]);
      setPrescriptionData([]);
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

    if (user && (user.uid === cleanId || user.email === cleanId)) {
      return user.displayName || user.email || cleanId;
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

  const getReferenceData = (dataArray: any[], id: string, idField: string, nameField: string) => {
    if (!dataArray || dataArray.length === 0 || !id) return `ID: ${id || 'N/A'}`;
    // eslint-disable-next-line eqeqeq
    const item = dataArray.find(d => d && d[idField] == id);
    return item ? item[nameField] : `ID: ${id}`;
  };

  const getDoctorName = (doctorId: string) => {
    return getReferenceData(doctorsData, doctorId, "id_dokter", "nama_dokter");
  };

  const getOptik = (optikId: string) => {
    if (!optikData || optikData.length === 0 || !optikId) return null;
    // eslint-disable-next-line eqeqeq
    const optik = optikData.find(o => o && o.id_instansi == optikId);
    return optik || null;
  };

  const getProductPrice = (productId: string) => {
    if (!productsData || productsData.length === 0 || !productId) return 0;
    // eslint-disable-next-line eqeqeq
    const product = productsData.find(p => p && p.id_produk == productId);
    return product ? parseFloat(product.harga || 0) : 0;
  };

  const getProductName = (productId: string) => {
    if (!productsData || productsData.length === 0 || !productId) return `ID: ${productId || 'N/A'}`;
    // eslint-disable-next-line eqeqeq
    const product = productsData.find(p => p && p.id_produk == productId);
    return product ? product.nama_produk : `ID: ${productId}`;
  };

  const formatLensValue = (value: string | number | undefined) => {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      return `+${value}`;
    }
    return String(value);
  };

  const handleOpenDetailModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailModalOpen(true);
  };

  const handlePrint = (type: 'nota' | 'resep') => {
    const printClass = type === 'nota' ? 'print-nota' : 'print-resep';
    document.body.classList.add(printClass);
    window.print();
    setTimeout(() => {
      document.body.classList.remove(printClass);
    }, 100);
  };

  const selectedSale = useMemo(() => {
    if (!selectedOrderId || salesData.length === 0) return null;
    return salesData.find(s => s.id_orders === selectedOrderId) || null;
  }, [selectedOrderId, salesData]);

  const selectedSaleDetails = useMemo(() => {
    if (!selectedOrderId || salesDetailData.length === 0) return [];
    return salesDetailData.filter(d => d.id_orders === selectedOrderId);
  }, [selectedOrderId, salesDetailData]);

  const selectedPrescription = useMemo(() => {
    if (!selectedOrderId || prescriptionData.length === 0) return null;
    return prescriptionData.find(p => p.id_orders === selectedOrderId) || null;
  }, [selectedOrderId, prescriptionData]);

  const optikInfo = useMemo(() => {
    return getOptik(selectedSale?.id_instansi);
  }, [selectedSale, optikData]);

  const detailSubTotal = useMemo(() => {
    if (selectedSaleDetails.length === 0 || productsData.length === 0) return 0;
    return selectedSaleDetails.reduce((sum, item) => {
      const price = getProductPrice(item.id_produk);
      return sum + (parseFloat(item.jumlah || 0) * price);
    }, 0);
  }, [selectedSaleDetails, productsData]);

  const detailFinancialSummary = useMemo(() => {
    if (!selectedSale) return null;
    const diskon = parseFloat(selectedSale.diskon || 0);
    const bayarInstansi = parseFloat(selectedSale.bayar_instansi || 0);
    const totalBayar = parseFloat(selectedSale.jumlah_bayar || 0);
    const sisaBayar = parseFloat(selectedSale.sisa_bayar || 0);
    return {
      subTotal: detailSubTotal,
      diskon,
      bayarInstansi,
      totalBayar,
      sisaBayar,
    };
  }, [selectedSale, detailSubTotal]);

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
                "Karyawan": getNamaKaryawan(sale.id_user, sale),
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
            "Karyawan": getNamaKaryawan(sale.id_user, sale),
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
        item.alamat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getNamaKaryawan(item.id_user, item)?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length;
  }, [salesData, searchTerm, penggunaData]);
  
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
            <TableCell>{getNamaKaryawan(item.id_user, item)}</TableCell>
           <TableCell className="text-red-500">{formatCurrency(item.jumlah_bayar)}</TableCell>
            <TableCell className="text-red-500 font-bold">{formatCurrency(item.sisa_bayar)}</TableCell>
            <TableCell>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => handleOpenDetailModal(item.id_orders)}
              >
                <Eye className="h-4 w-4 mr-1" /> Lihat Detail
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

      {/* Hidden print areas */}
      <div id="print-content">
        <div id="resep-print-area">
          {selectedSale && <ResepPrint sale={selectedSale} prescription={selectedPrescription} optik={optikInfo} />}
        </div>
        <div id="nota-print-area">
          {selectedSale && (
            <NotaPrint
              sale={selectedSale}
              saleDetails={selectedSaleDetails}
              financialSummary={detailFinancialSummary}
              formatCurrency={formatCurrency}
              getProductName={getProductName}
              getProductPrice={getProductPrice}
              optik={optikInfo}
            />
          )}
        </div>
      </div>

      {/* Detail Laporan Terjual Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Detail Laporan Pemesanan: {selectedSale?.nama_pemesan || '...'}
            </DialogTitle>
            <DialogDescription>
              No. Pesanan: {selectedSale?.id_orders || '-'} | No. Ref: {selectedSale?.no_ref || '-'}
            </DialogDescription>
          </DialogHeader>

          {selectedSale ? (
            <div className="flex-grow overflow-y-auto pr-2 space-y-6 my-2">
              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {/* Left Column */}
                <div className="space-y-3">
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Nomor Pesanan</Label>
                    <Input readOnly value={selectedSale.id_orders || ''} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Nomor Ref</Label>
                    <Input readOnly value={selectedSale.no_ref || ''} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Nama Pemesan</Label>
                    <Input readOnly value={selectedSale.nama_pemesan || ''} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Alamat</Label>
                    <Input readOnly value={selectedSale.alamat || ''} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Telpon</Label>
                    <Input readOnly value={selectedSale.telpon || ''} className="bg-muted h-8" />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Tanggal Pesan</Label>
                    <Input readOnly value={formatTanggal(selectedSale.tanggal_pesan) || ''} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Nama Instansi</Label>
                    <Input readOnly value={optikInfo?.nama_instansi || selectedSale.id_instansi || ''} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Dokter/RO</Label>
                    <Input readOnly value={getDoctorName(selectedSale.id_dokter)} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Karyawan</Label>
                    <Input readOnly value={getNamaKaryawan(selectedSale.id_user, selectedSale)} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Tanggal Selesai</Label>
                    <Input readOnly value={formatTanggal(selectedSale.tanggal_selesai) || '-'} className="bg-muted h-8" />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                    <Label className="text-muted-foreground">Tanggal Ambil</Label>
                    <Input readOnly value={formatTanggal(selectedSale.tanggal_ambil) || '-'} className="bg-muted h-8" />
                  </div>
                </div>
              </div>

              {/* Lens Details */}
              <Card>
                <CardHeader className="p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
                  <CardTitle className="text-sm font-semibold">Detail Ukuran Lensa (Resep)</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {/* Right Eye */}
                  <div className="flex items-center gap-2 p-2 bg-gray-800 text-white rounded-md">
                    <span className="font-bold w-6 text-center">R</span>
                    <div className="grid grid-cols-5 gap-1.5 text-xs w-full">
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">SPH</span>
                        <Input readOnly value={formatLensValue(selectedPrescription?.R_SPH) || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">CYL</span>
                        <Input readOnly value={formatLensValue(selectedPrescription?.R_CYL) || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">AXS</span>
                        <Input readOnly value={selectedPrescription?.R_AXS || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">ADD</span>
                        <Input readOnly value={formatLensValue(selectedPrescription?.R_ADD) || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">PD</span>
                        <Input readOnly value={selectedPrescription?.PD || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                    </div>
                  </div>

                  {/* Left Eye */}
                  <div className="flex items-center gap-2 p-2 bg-gray-800 text-white rounded-md">
                    <span className="font-bold w-6 text-center">L</span>
                    <div className="grid grid-cols-5 gap-1.5 text-xs w-full">
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">SPH</span>
                        <Input readOnly value={formatLensValue(selectedPrescription?.L_SPH) || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">CYL</span>
                        <Input readOnly value={formatLensValue(selectedPrescription?.L_CYL) || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">AXS</span>
                        <Input readOnly value={selectedPrescription?.L_AXS || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">ADD</span>
                        <Input readOnly value={formatLensValue(selectedPrescription?.L_ADD) || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-300 block mb-0.5">PD</span>
                        <Input readOnly value={selectedPrescription?.PD2 || '-'} className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-xs font-bold text-center" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Table */}
              <div>
                <Label className="font-semibold block mb-2">Daftar Produk Pesanan</Label>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-800">
                      <TableRow>
                        <TableHead className="text-white w-12">No</TableHead>
                        <TableHead className="text-white">Nama Produk</TableHead>
                        <TableHead className="text-white w-20 text-center">Jumlah</TableHead>
                        <TableHead className="text-white w-32 text-right">Harga</TableHead>
                        <TableHead className="text-white w-36 text-right">Total Harga</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSaleDetails.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Tidak ada produk pada pesanan ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedSaleDetails.map((detail: any, idx: number) => {
                          const price = getProductPrice(detail.id_produk);
                          const total = parseFloat(detail.jumlah || 0) * price;
                          return (
                            <TableRow key={detail.id_order_detail || idx}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell className="font-medium">{getProductName(detail.id_produk)}</TableCell>
                              <TableCell className="text-center">{detail.jumlah}</TableCell>
                              <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Financial Summary */}
              {detailFinancialSummary && (
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-1.5 text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sub Total</span>
                      <span>{formatCurrency(detailFinancialSummary.subTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Diskon</span>
                      <span className="text-red-500 font-medium">-{formatCurrency(detailFinancialSummary.diskon)}</span>
                    </div>
                    {detailFinancialSummary.bayarInstansi > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bayar Instansi</span>
                        <span>{formatCurrency(detailFinancialSummary.bayarInstansi)}</span>
                      </div>
                    )}
                    <div className="border-t pt-1.5 flex justify-between font-bold">
                      <span>Total Tagihan</span>
                      <span className="text-red-600">{formatCurrency(detailFinancialSummary.totalBayar)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah Bayar</span>
                      <span className="font-semibold text-green-600">{formatCurrency(selectedSale.jumlah_bayar)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-600">
                      <span>Sisa Kurang Bayar</span>
                      <span>{formatCurrency(detailFinancialSummary.sisaBayar)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          <DialogFooter className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={() => handlePrint('resep')}
                variant="secondary"
                className="bg-gray-700 hover:bg-gray-800 text-white flex-1 sm:flex-none"
              >
                <Printer className="mr-1.5 h-4 w-4" /> Print Resep
              </Button>
              <Button
                type="button"
                onClick={() => handlePrint('nota')}
                variant="secondary"
                className="bg-gray-700 hover:bg-gray-800 text-white flex-1 sm:flex-none"
              >
                <Printer className="mr-1.5 h-4 w-4" /> Print Nota
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
