
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import PageWrapper from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { format, parse } from "date-fns";
import NotaPrint from "@/components/print/NotaPrint";
import ResepPrint from "@/components/print/ResepPrint";
import { cn } from "@/lib/utils";


// Data sources
const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const SALES_DETAIL_DOC_ID = "oQu7zep2d8jM7ChPE3Ja";
const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";
const USERS_DOC_ID = "b7ojJpFKj4RNIkQneCpu";
const DOCTORS_DOC_ID = "txmviRt0A56SFQ5EpQIV";
const OPTIK_DOC_ID = "JXof497VgWYludHMt5Uc";
const INSTANSI_DOC_ID = "dzpok016Hnin9V6VQUTk";
const PRESCRIPTION_DOC_ID = "iXtZdfZU2pziTQDoWtYB";


export default function LaporanDetailTerjualPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sale, setSale] = useState<any | null>(null);
  const [prescription, setPrescription] = useState<any | null>(null);
  const [saleDetails, setSaleDetails] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [allOptik, setAllOptik] = useState<any[]>([]);
  const [subTotal, setSubTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

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
    if (user && orderId) {
      fetchData();
    }
  }, [user, orderId]);
  
  useEffect(() => {
    if (saleDetails.length > 0 && allProducts.length > 0) {
      const total = saleDetails.reduce((sum, item) => {
        const price = getProductPrice(item.id_produk);
        return sum + (parseFloat(item.jumlah) * price);
      }, 0);
      setSubTotal(total);
    }
  }, [saleDetails, allProducts]);


  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docRefs = [
        doc(database, "migrated_data", SALES_DOC_ID),
        doc(database, "migrated_data", SALES_DETAIL_DOC_ID),
        doc(database, "migrated_data", PRODUCTS_DOC_ID),
        doc(database, "migrated_data", USERS_DOC_ID),
        doc(database, "migrated_data", DOCTORS_DOC_ID),
        doc(database, "migrated_data", OPTIK_DOC_ID),
        doc(database, "migrated_data", PRESCRIPTION_DOC_ID),
        doc(database, "migrated_data", INSTANSI_DOC_ID),
      ];

      const [
        salesSnap,
        detailsSnap,
        productsSnap,
        usersSnap,
        doctorsSnap,
        optikSnap,
        prescriptionSnap,
        instansiSnap,
      ] = await Promise.all(docRefs.map(getDoc));

      const salesData = salesSnap.data()?.data || [];
      const detailsData = detailsSnap.data()?.data || [];
      const prescriptionData = prescriptionSnap.data()?.data || [];
      
      setAllProducts(productsSnap.data()?.data || []);
      setAllUsers(usersSnap.data()?.data || []);
      setAllDoctors(doctorsSnap.data()?.data || []);

      const optikData = optikSnap.data()?.data || [];
      const instansiData = instansiSnap.data()?.data || [];
      setAllOptik([...optikData, ...instansiData]);


      const currentSale = salesData.find((s: any) => s.id_orders === orderId);
      if (!currentSale) {
        throw new Error(`Order with ID ${orderId} not found.`);
      }
      setSale(currentSale);

      const currentPrescription = prescriptionData.find((p: any) => p.id_orders === orderId);
      setPrescription(currentPrescription);


      const currentSaleDetails = detailsData.filter(
        (d: any) => d.id_orders === orderId
      );
      setSaleDetails(currentSaleDetails);

    } catch (err: any) {
      const friendlyMessage =
        err.code === "permission-denied"
          ? "Permission denied. Please check your Firestore security rules."
          : `An unexpected error occurred: ${err.message}`;
      setError(friendlyMessage);
    }
    setIsLoading(false);
  };
  
  const getReferenceData = (dataArray: any[], id: string, idField: string, nameField: string) => {
    if (!dataArray || dataArray.length === 0 || !id) return `ID: ${id || 'N/A'}`;
    // eslint-disable-next-line eqeqeq
    const item = dataArray.find(d => d && d[idField] == id);
    return item ? item[nameField] : `ID: ${id}`;
  };

  const getProductName = (productId: string) => {
    return getReferenceData(allProducts, productId, "id_produk", "nama_produk");
  };
  
  const getProductPrice = (productId: string) => {
    if (!allProducts || allProducts.length === 0 || !productId) return 0;
    // eslint-disable-next-line eqeqeq
    const product = allProducts.find(p => p && p.id_produk == productId);
    return product ? parseFloat(product.harga || 0) : 0;
  };
  
  const getDoctorName = (doctorId: string) => {
    return getReferenceData(allDoctors, doctorId, "id_dokter", "nama_dokter");
  };
  
  const getOptik = (optikId: string) => {
    if (!allOptik || allOptik.length === 0 || !optikId) return null;
    // eslint-disable-next-line eqeqeq
    const optik = allOptik.find(o => o && o.id_instansi == optikId);
    return optik || null;
  };
  
  const getKaryawanName = (userId: string) => {
    return getReferenceData(allUsers, userId, "id_user", "nama_lengkap");
  }

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

  const formatLensValue = (value: string | number | undefined) => {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      return `+${value}`;
    }
    return String(value);
  };

  const renderProductTable = () => {
    if (saleDetails.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center">No product details found for this order.</TableCell>
        </TableRow>
      );
    }
    return saleDetails.map((item, index) => {
      const price = getProductPrice(item.id_produk);
      const total = parseFloat(item.jumlah) * price;
      return (
        <TableRow key={index}>
          <TableCell>{index + 1}</TableCell>
          <TableCell>{getProductName(item.id_produk)}</TableCell>
          <TableCell>{item.jumlah}</TableCell>
          <TableCell>{formatCurrency(price)}</TableCell>
          <TableCell>{formatCurrency(total)}</TableCell>
        </TableRow>
      );
    });
  };
  
  const financialSummary = useMemo(() => {
    if (!sale) return null;

    const diskon = parseFloat(sale.diskon || 0);
    const bayarInstansi = parseFloat(sale.bayar_instansi || 0);
    const totalBayar = parseFloat(sale.jumlah_bayar || 0);
    const sisaBayar = parseFloat(sale.sisa_bayar || 0);

    return {
      subTotal,
      diskon,
      bayarInstansi,
      totalBayar,
      sisaBayar,
    };
  }, [sale, subTotal]);

  const handlePrint = (type: 'nota' | 'resep') => {
    const printClass = type === 'nota' ? 'print-nota' : 'print-resep';
    document.body.classList.add(printClass);
    window.print();
    setTimeout(() => {
      document.body.classList.remove(printClass);
    }, 100);
  };
  
  const optikInfo = useMemo(() => getOptik(sale?.id_instansi), [sale, allOptik]);
  
  if (!user) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }

  if (isLoading || !sale || allUsers.length === 0 || allOptik.length === 0 || allDoctors.length === 0) {
    return <PageWrapper><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></PageWrapper>;
  }

  if (error) {
    return (
      <PageWrapper>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-md">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
             <Button asChild className="mt-4">
                <Link href="/laporan-terjual">
                    <ArrowLeft className="mr-2"/> Back
                </Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div id="print-content">
        <div id="resep-print-area">
          <ResepPrint sale={sale} prescription={prescription} optik={optikInfo} />
        </div>
        <div id="nota-print-area">
          <NotaPrint
              sale={sale}
              saleDetails={saleDetails}
              financialSummary={financialSummary}
              formatCurrency={formatCurrency}
              getProductName={getProductName}
              getProductPrice={getProductPrice}
              optik={optikInfo}
            />
        </div>
      </div>

      <Card className="shadow-lg no-print">
        <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle className="text-xl">
                Detail laporan Pemesanan oleh Bpk/Ibk: {sale?.nama_pemesan || '...'}
             </CardTitle>
             <Link href="/laporan-terjual" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2"/> Kembali</Button>
             </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Customer Details */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Left Column */}
                <div className="space-y-4">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Nomor Pesanan</Label>
                        <Input readOnly value={sale.id_orders || ''} className="bg-muted"/>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Nomor Ref</Label>
                        <Input readOnly value={sale.no_ref || ''} className="bg-muted"/>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Nama Pemesan</Label>
                        <Input readOnly value={sale.nama_pemesan || ''} className="bg-muted"/>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Alamat</Label>
                        <Input readOnly value={sale.alamat || ''} className="bg-muted"/>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Telpon</Label>
                        <Input readOnly value={sale.telpon || ''} className="bg-muted"/>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Tanggal</Label>
                        <Input readOnly value={formatTanggal(sale.tanggal_pesan) || ''} className="bg-muted"/>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Nama Instansi</Label>
                        <Input readOnly value={optikInfo?.nama_instansi || sale.id_instansi} className="bg-muted"/>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Dokter/RO</Label>
                        <Input readOnly value={getDoctorName(sale.id_dokter)} className="bg-muted"/>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Karyawan</Label>
                        <Input readOnly value={getKaryawanName(sale.id_user)} className="bg-muted"/>
                    </div>
                     <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Tanggal Selesai</Label>
                        <Input readOnly value={formatTanggal(sale.tanggal_selesai) || ''} className="bg-muted"/>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Tanggal Ambil</Label>
                        <Input readOnly value={formatTanggal(sale.tanggal_ambil) || ''} className="bg-muted"/>
                    </div>
                </div>
            </div>

            {/* Lens and Dates Section */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Lens Details */}
                <div className="w-full md:w-1/2">
                    <Card>
                        <CardHeader className="p-4 bg-gray-50 rounded-t-lg">
                            <CardTitle className="text-base">Detail Lensa</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 gap-4">
                            {/* Right Eye */}
                            <div className="flex items-center gap-2 p-2 bg-gray-800 text-white rounded-md mb-2">
                                <span className="font-bold w-6 text-center">R</span>
                                <div className="grid grid-cols-5 gap-1 text-xs w-full">
                                    <Input readOnly value={formatLensValue(prescription?.R_SPH) || ''} placeholder="SPH" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                    <Input readOnly value={formatLensValue(prescription?.R_CYL) || ''} placeholder="CYL" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                    <Input readOnly value={prescription?.R_AXS || ''} placeholder="AXS" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                    <Input readOnly value={formatLensValue(prescription?.R_ADD) || ''} placeholder="ADD" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                    <Input readOnly value={prescription?.PD || ''} placeholder="PD"  className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold" />
                                </div>
                            </div>
                            {/* Left Eye */}
                            <div className="flex items-center gap-2 p-2 bg-gray-800 text-white rounded-md">
                                <span className="font-bold w-6 text-center">L</span>
                                <div className="grid grid-cols-5 gap-1 text-xs w-full">
                                    <Input readOnly value={formatLensValue(prescription?.L_SPH) || ''} placeholder="SPH" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                    <Input readOnly value={formatLensValue(prescription?.L_CYL) || ''} placeholder="CYL" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                    <Input readOnly value={prescription?.L_AXS || ''} placeholder="AXS" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                    <Input readOnly value={formatLensValue(prescription?.L_ADD) || ''} placeholder="ADD" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                    <Input readOnly value={prescription?.PD2 || ''} placeholder="PD"  className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm font-bold"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {/* Products Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader className="bg-gray-800">
                        <TableRow>
                            <TableHead className="text-white">No</TableHead>
                            <TableHead className="text-white">Nama Produk</TableHead>
                            <TableHead className="text-white">Jumlah</TableHead>
                            <TableHead className="text-white">Harga</TableHead>
                            <TableHead className="text-white">Total Harga</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderProductTable()}
                    </TableBody>
                </Table>
            </div>
            
            {/* Financial Summary */}
             <div className="flex justify-end">
                {financialSummary && (
                  <div className="w-full max-w-sm space-y-2 text-sm">
                      <div className="flex justify-between">
                          <span className="font-medium">Total Rp</span>
                          <span className="font-bold text-red-600">{formatCurrency(financialSummary.totalBayar)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="font-medium">Sub Total Rp</span>
                          <span>{formatCurrency(financialSummary.subTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="font-medium">Diskon Rp</span>
                          <span className="text-red-600">{formatCurrency(financialSummary.diskon)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="font-medium">Bayar Instansi Rp</span>
                          <span>{formatCurrency(financialSummary.bayarInstansi)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                          <span className="font-medium">Total yang harus dibayar Rp</span>
                          <span>{formatCurrency(financialSummary.totalBayar)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="font-medium">Sisa Rp</span>
                          <span className="text-red-600">{formatCurrency(financialSummary.sisaBayar)}</span>
                      </div>
                  </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                <div className="flex gap-2">
                     <Button onClick={() => handlePrint('resep')} variant="secondary" className="bg-gray-700 hover:bg-gray-800 text-white">
                        Print Resep
                     </Button>
                     <Button onClick={() => handlePrint('nota')} variant="secondary" className="bg-gray-700 hover:bg-gray-800 text-white">
                        Print Nota
                     </Button>
                </div>
                <div className="flex gap-2">
                     <Button className="bg-green-600 hover:bg-green-700 text-white">Sudah Di Ambil</Button>
                     <Link href="/laporan-terjual" passHref>
                        <Button variant="outline">Kembali</Button>
                     </Link>
                </div>
            </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
