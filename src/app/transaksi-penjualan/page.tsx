
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, setDoc, getDocs, collection, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import PageWrapper from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle, ArrowLeft, Trash2, PlusCircle, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Data sources for dropdowns and saving
const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const SALES_DETAIL_DOC_ID = "oQu7zep2d8jM7ChPE3Ja";
const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";
const USERS_DOC_ID = "b7ojJpFKj4RNIkQneCpu";
const DOCTORS_DOC_ID = "txmviRt0A56SFQ5EpQIV";
const OPTIK_DOC_ID = "JXof497VgWYludHMt5Uc";
const INSTANSI_DOC_ID = "dzpok016Hnin9V6VQUTk";
const PRESCRIPTION_DOC_ID = "iXtZdfZU2pziTQDoWtYB";
const LENS_SETTINGS_DOC_ID = "cMS8QhEyQ25DxIIP2X60";
const CATEGORIES_DOC_ID = "XgGV6xmYVMHK9SDuc1s0";

interface LensaSetting {
  sph_dari: string; sph_sampai: string;
  cyl_dari: string; cyl_sampai: string;
  axs_dari: string; axs_sampai: string;
  add_dari: string; add_sampai: string;
}

const initialCustomerDetails = { nama_pemesan: "", alamat: "", telpon: "", no_ref: "" };
const initialOrderAndStaff = (uid: string | null = null) => ({
  tanggal_pesan: format(new Date(), "yyyy-MM-dd"), id_instansi: "", id_dokter: "", id_user: uid || "",
  tanggal_selesai: "", tanggal_ambil: "",
});
const initialPrescription = {
  R_SPH: "", R_CYL: "", R_AXS: "", R_ADD: "",
  L_SPH: "", L_CYL: "", L_AXS: "", L_ADD: "",
  PD: "", PD2: "",
};
const initialFinancials = { diskon: "0", bayar_instansi: "0", jumlah_bayar: "0" };

const formatLensValue = (value: string | number | undefined) => {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (!isNaN(num) && num > 0) return `+${value}`;
    return String(value);
};

// Memoized Customer Section
const CustomerSection = React.memo(({ customerDetails, orderAndStaff, onCustomerChange, onOrderChange, allOptik, allDoctors, allUsers }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 border-b pb-6">
            <div className="space-y-4">
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="no_ref">Nomor Ref</Label>
                    <Input id="no_ref" name="no_ref" value={customerDetails.no_ref} onChange={(e) => onCustomerChange('no_ref', e.target.value)}/>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="nama_pemesan">Nama Pemesan</Label>
                    <Input id="nama_pemesan" name="nama_pemesan" value={customerDetails.nama_pemesan} onChange={(e) => onCustomerChange('nama_pemesan', e.target.value)} required/>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="alamat">Alamat</Label>
                    <Input id="alamat" name="alamat" value={customerDetails.alamat} onChange={(e) => onCustomerChange('alamat', e.target.value)}/>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="telpon">Telpon</Label>
                    <Input id="telpon" name="telpon" value={customerDetails.telpon} onChange={(e) => onCustomerChange('telpon', e.target.value)}/>
                </div>
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="tanggal_pesan">Tanggal</Label>
                    <Input id="tanggal_pesan" type="date" value={orderAndStaff.tanggal_pesan} onChange={e => onOrderChange('tanggal_pesan', e.target.value)}/>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="id_instansi">Nama Instansi</Label>
                    <Select value={orderAndStaff.id_instansi} onValueChange={v => onOrderChange('id_instansi', v)}>
                        <SelectTrigger><SelectValue placeholder="- Pilih Instansi -" /></SelectTrigger>
                        <SelectContent>{allOptik.map((o:any, index:number) => <SelectItem key={`${o.id_instansi}-${index}`} value={o.id_instansi}>{o.nama_instansi}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="id_dokter">Dokter/RO</Label>
                     <Select value={orderAndStaff.id_dokter} onValueChange={v => onOrderChange('id_dokter', v)}>
                        <SelectTrigger><SelectValue placeholder="- Pilih Dokter -" /></SelectTrigger>
                        <SelectContent>{allDoctors.map((d:any) => <SelectItem key={d.id_dokter} value={d.id_dokter}>{d.nama_dokter}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="id_user">Karyawan</Label>
                     <Select value={orderAndStaff.id_user} onValueChange={v => onOrderChange('id_user', v)}>
                        <SelectTrigger><SelectValue placeholder="- Pilih Karyawan -" /></SelectTrigger>
                        <SelectContent>{allUsers.map((u:any, index: number) => <SelectItem key={`${u.id_pengguna || u.id_user}-${index}`} value={u.id_pengguna || u.id_user}>{u.nama_lengkap}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
});
CustomerSection.displayName = "CustomerSection";


// Memoized Prescription Section
const PrescriptionSection = React.memo(({ prescription, onPrescriptionChange, orderAndStaff, onOrderChange, lensOptions }: any) => {
    
  const LensSelect = ({ value, onValueChange, placeholder, options }: { value: string, onValueChange: (value: string) => void, placeholder: string, options: { value: string, label: string }[] | undefined }) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm">
        <SelectValue placeholder={placeholder}>{formatLensValue(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const AxisSelect = ({ value, onValueChange, placeholder, options }: { value: string, onValueChange: (value: string) => void, placeholder: string, options: string[] | undefined }) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm">
        <SelectValue placeholder={placeholder}>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
      </SelectContent>
    </Select>
  );

    return (
        <div className="flex flex-col md:flex-row gap-6 border-b pb-6">
            <div className="w-full md:w-1/2">
                <Card>
                    <CardHeader className="p-4 bg-gray-50 rounded-t-lg"><CardTitle className="text-base">Detail Lensa</CardTitle></CardHeader>
                    <CardContent className="p-4 grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-2 p-2 bg-gray-800 text-white rounded-md mb-2">
                            <span className="font-bold w-6 text-center">R</span>
                            <div className="grid grid-cols-5 gap-1 text-xs w-full">
                                <LensSelect value={prescription.R_SPH} onValueChange={v => onPrescriptionChange('R_SPH', v)} placeholder="SPH" options={lensOptions?.sph} />
                                <LensSelect value={prescription.R_CYL} onValueChange={v => onPrescriptionChange('R_CYL', v)} placeholder="CYL" options={lensOptions?.cyl} />
                                <AxisSelect value={prescription.R_AXS} onValueChange={v => onPrescriptionChange('R_AXS', v)} placeholder="AXS" options={lensOptions?.axs} />
                                <LensSelect value={prescription.R_ADD} onValueChange={v => onPrescriptionChange('R_ADD', v)} placeholder="ADD" options={lensOptions?.add} />
                                <Input value={prescription.PD} onChange={e => onPrescriptionChange('PD', e.target.value)} placeholder="PD"  className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm"/>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-800 text-white rounded-md">
                            <span className="font-bold w-6 text-center">L</span>
                            <div className="grid grid-cols-5 gap-1 text-xs w-full">
                                <LensSelect value={prescription.L_SPH} onValueChange={v => onPrescriptionChange('L_SPH', v)} placeholder="SPH" options={lensOptions?.sph} />
                                <LensSelect value={prescription.L_CYL} onValueChange={v => onPrescriptionChange('L_CYL', v)} placeholder="CYL" options={lensOptions?.cyl} />
                                <AxisSelect value={prescription.L_AXS} onValueChange={v => onPrescriptionChange('L_AXS', v)} placeholder="AXS" options={lensOptions?.axs} />
                                <LensSelect value={prescription.L_ADD} onValueChange={v => onPrescriptionChange('L_ADD', v)} placeholder="ADD" options={lensOptions?.add} />
                                <Input value={prescription.PD2} onChange={e => onPrescriptionChange('PD2', e.target.value)} placeholder="PD" className="bg-gray-100 text-gray-800 border-gray-300 h-7 text-sm"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
             <div className="w-full md:w-1/2 space-y-4">
                 <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
                    <Input id="tanggal_selesai" type="date" value={orderAndStaff.tanggal_selesai} onChange={e => onOrderChange('tanggal_selesai', e.target.value)}/>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="tanggal_ambil">Tanggal Ambil</Label>
                    <Input id="tanggal_ambil" type="date" value={orderAndStaff.tanggal_ambil} onChange={e => onOrderChange('tanggal_ambil', e.target.value)}/>
                </div>
            </div>
        </div>
    )
});
PrescriptionSection.displayName = "PrescriptionSection";

const CartTable = React.memo(({ cart, onQuantityChange, onRemoveFromCart, onOpenProductModal }: any) => {
    return (
        <div className="space-y-4">
            <Button onClick={onOpenProductModal}><PlusCircle className="mr-2"/> Tambah Produk</Button>
            <div className="border rounded-md">
                <Table>
                    <TableHeader className="bg-gray-800">
                        <TableRow>
                            <TableHead className="text-white">No</TableHead>
                            <TableHead className="text-white">Nama Produk</TableHead>
                            <TableHead className="text-white w-[100px]">Jumlah</TableHead>
                            <TableHead className="text-white">Harga</TableHead>
                            <TableHead className="text-white">Total</TableHead>
                            <TableHead className="text-white w-[50px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cart.length > 0 ? cart.map((item: any, index: number) => (
                            <TableRow key={item.id_produk}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{item.nama_produk}</TableCell>
                                <TableCell>
                                    <Input type="number" value={item.jumlah} onChange={e => onQuantityChange(item.id_produk, parseInt(e.target.value, 10))} className="h-8 w-20"/>
                                </TableCell>
                                <TableCell>Rp {parseFloat(item.harga || 0).toLocaleString('id-ID')}</TableCell>
                                <TableCell>Rp {(parseFloat(item.harga || 0) * item.jumlah).toLocaleString('id-ID')}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => onRemoveFromCart(item.id_produk)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={6} className="text-center">Belum ada produk ditambahkan.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
});
CartTable.displayName = "CartTable";

// Memoized Financial Summary
const FinancialSummary = React.memo(({ financials, onFinancialsChange, subTotal, totalBayar, paymentDifference }: any) => {
    const formatNumber = (numStr: string) => {
        if (!numStr) return "0";
        return Number(numStr).toLocaleString('en-US');
    };
    
    return (
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="w-full md:w-1/2 space-y-2">
                 <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="diskon">Diskon (Rp)</Label>
                    <Input id="diskon" name="diskon" type="text" value={formatNumber(financials.diskon)} onChange={(e) => onFinancialsChange('diskon', e.target.value.replace(/,/g, ''))} className="font-bold text-right"/>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <Label htmlFor="bayar_instansi">Bayar Instansi (Rp)</Label>
                    <Input id="bayar_instansi" name="bayar_instansi" type="text" value={formatNumber(financials.bayar_instansi)} onChange={(e) => onFinancialsChange('bayar_instansi', e.target.value.replace(/,/g, ''))} className="font-bold text-right"/>
                </div>
            </div>
            <div className="w-full md:w-1/3 space-y-2 text-sm">
                <div className="flex justify-between items-center bg-gray-100 p-2 rounded">
                    <span className="font-medium">Sub Total</span>
                    <span className="font-bold">Rp {subTotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center p-2">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-lg text-red-600">Rp {totalBayar.toLocaleString('id-ID')}</span>
                </div>
                 <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="jumlah_bayar" className="text-base">Jumlah Bayar</Label>
                    <Input id="jumlah_bayar" name="jumlah_bayar" type="text" value={formatNumber(financials.jumlah_bayar)} onChange={(e) => onFinancialsChange('jumlah_bayar', e.target.value.replace(/,/g, ''))} className="h-12 text-lg font-bold text-right" />
                 </div>
                 <div className="flex justify-between items-center p-2 font-bold text-base">
                    <span>{paymentDifference >= 0 ? "Sisa" : "Kembalian"}</span>
                    <span className={paymentDifference >= 0 ? "text-red-600" : "text-green-600"}>
                        Rp {Math.abs(paymentDifference).toLocaleString('id-ID')}
                    </span>
                </div>
            </div>
        </div>
    )
});
FinancialSummary.displayName = "FinancialSummary";

const ProductSelectionModal = ({ open, onOpenChange, allProducts, onAddProducts, cart, onRefresh, isRefreshing }: any) => {
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);


    useEffect(() => {
        const cartProductIds = new Set(cart.map((p:any) => p.id_produk));
        setSelectedProducts(cartProductIds);
    }, [open, cart]);
    
    const handleSelectProduct = (productId: string) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    const handleAddClick = () => {
        onAddProducts(Array.from(selectedProducts));
        onOpenChange(false);
    };

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return allProducts;
        return allProducts.filter((p: any) => 
            p.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.kode_produk && p.kode_produk.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [allProducts, searchTerm]);

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Pilih Produk</DialogTitle>
                </DialogHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Cari produk..."
                                className="w-full pl-8"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing}>
                            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                     <div className="flex items-center gap-2">
                        <span className="text-sm">Tampilkan</span>
                        <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                            <SelectTrigger className="w-20 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex-grow overflow-auto border rounded-md">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary">
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox 
                                        checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.has(p.id_produk))}
                                        onCheckedChange={(checked) => {
                                            setSelectedProducts(prev => {
                                                const newSet = new Set(prev);
                                                paginatedProducts.forEach(p => {
                                                    const isOutOfStock = parseInt(p.stok || "0", 10) <= 0;
                                                    if(checked && !isOutOfStock) {
                                                        newSet.add(p.id_produk)
                                                    } else {
                                                        newSet.delete(p.id_produk)
                                                    }
                                                });
                                                return newSet;
                                            });
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Kode Produk</TableHead>
                                <TableHead>Nama Produk</TableHead>
                                <TableHead>Harga Jual</TableHead>
                                <TableHead>Stok</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProducts.map((p: any) => (
                                <TableRow key={p.id_produk} className={parseInt(p.stok || "0", 10) <= 0 ? 'bg-gray-100 opacity-50' : ''}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedProducts.has(p.id_produk)}
                                            onCheckedChange={() => handleSelectProduct(p.id_produk)}
                                            disabled={parseInt(p.stok || "0", 10) <= 0}
                                        />
                                    </TableCell>
                                    <TableCell>{p.kode_produk}</TableCell>
                                    <TableCell>{p.nama_produk}</TableCell>
                                    <TableCell>Rp {parseFloat(p.harga || 0).toLocaleString('id-ID')}</TableCell>
                                    <TableCell>{p.stok}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                            Sebelumnya
                        </Button>
                         <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                            Berikutnya
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Batal</Button>
                    </DialogClose>
                    <Button onClick={handleAddClick}>Tambahkan ke Keranjang</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function TransaksiPenjualanPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [customerDetails, setCustomerDetails] = useState(initialCustomerDetails);
  const [orderAndStaff, setOrderAndStaff] = useState(initialOrderAndStaff());
  const [prescription, setPrescription] = useState(initialPrescription);
  const [cart, setCart] = useState<any[]>([]);
  const [financials, setFinancials] = useState(initialFinancials);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [allOptik, setAllOptik] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [lensSettings, setLensSettings] = useState<LensaSetting | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const fetchMasterData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true);
    }
    
    try {
        const querySnapshot = await getDocs(collection(database, "migrated_data"));
        
        let users: any[] = [];
        let doctors: any[] = [];
        let optik: any[] = [];
        let instansi: any[] = [];
        let lensSettingsData: any[] = [];
        let products: any[] = [];
        let categories: any[] = [];

        querySnapshot.forEach((doc) => {
            const docData = doc.data();
            // Check by doc ID first
            switch(doc.id) {
                case USERS_DOC_ID:
                    users = docData.data || [];
                    break;
                case DOCTORS_DOC_ID:
                    doctors = docData.data || [];
                    break;
                case OPTIK_DOC_ID:
                    optik = docData.data || [];
                    break;
                case INSTANSI_DOC_ID:
                    instansi = docData.data || [];
                    break;
                case LENS_SETTINGS_DOC_ID:
                    lensSettingsData = docData.data || [];
                    break;
                case PRODUCTS_DOC_ID:
                    products = docData.data || [];
                    break;
                case CATEGORIES_DOC_ID:
                    categories = docData.data || [];
                    break;
            }
            
            // Fallback to checking the name property inside data if it exists
            if (docData.data && docData.data.name) {
                 switch(docData.data.name) {
                    case 'rb_user':
                        users = docData.data.data || [];
                        break;
                    case 'rb_dokter':
                        doctors = docData.data.data || [];
                        break;
                    case 'rb_optik':
                        optik = docData.data.data || [];
                        break;
                     case 'rb_instansi':
                        instansi = docData.data.data || [];
                        break;
                    case 'rb_setting_lensa':
                        lensSettingsData = docData.data.data || [];
                        break;
                    case 'rb_produk':
                        products = docData.data.data || [];
                        break;
                    case 'rb_kategori':
                        categories = docData.data.data || [];
                        break;
                }
            }
        });

        setAllUsers(users);
        setAllDoctors(doctors);
        setAllProducts(products);
        setAllCategories(categories);
        setAllOptik([...optik, ...instansi]);
        setLensSettings(lensSettingsData && lensSettingsData.length > 0 ? lensSettingsData[0] : null);


        if (isRefresh) {
            toast({ title: "Data diperbarui", description: "Daftar produk telah berhasil diperbarui." });
        }
    } catch(err: any) {
        setError(`Gagal memuat data master: ${err.message}`);
    } finally {
        if (isRefresh) {
            setIsRefreshing(false);
        } else {
            setIsLoading(false);
        }
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Find the corresponding user from the fetched user list to get the id_user
        const userDocRef = doc(database, "migrated_data", USERS_DOC_ID);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const usersData = userDocSnap.data()?.data;
            if (Array.isArray(usersData)) {
                 const appUser = usersData.find(u => u.id_pengguna === currentUser.uid || u.email === currentUser.email);
                 if (appUser) {
                    setOrderAndStaff(prev => ({ ...prev, id_user: appUser.id_user }));
                 } else {
                    setOrderAndStaff(prev => ({ ...prev, id_user: currentUser.uid }));
                 }
            }
        } else {
             setOrderAndStaff(prev => ({ ...prev, id_user: currentUser.uid }));
        }

      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetchMasterData();
  }, [user, fetchMasterData]);

    const generateOptions = (start: number, end: number, step: number) => {
        const options = [];
        for (let i = start; i <= end; i = parseFloat((i + step).toFixed(2))) {
            const value = i.toFixed(step === 1 || step === 10 ? 0 : 2)
            options.push({ value: value, label: formatLensValue(value) });
        }
        return options;
    };
    
    const lensOptions = useMemo(() => {
        if (!lensSettings) return null;
        return {
            sph: generateOptions(parseFloat(lensSettings.sph_dari), parseFloat(lensSettings.sph_sampai), 0.25),
            cyl: generateOptions(parseFloat(lensSettings.cyl_dari), parseFloat(lensSettings.cyl_sampai), 0.25),
            axs: Array.from({length: parseInt(lensSettings.axs_sampai, 10) - parseInt(lensSettings.axs_dari, 10) + 1}, (_, i) => String(i + parseInt(lensSettings.axs_dari, 10))),
            add: generateOptions(parseFloat(lensSettings.add_dari), parseFloat(lensSettings.add_sampai), 0.25),
        };
    }, [lensSettings]);

  const handleAddProductsToCart = useCallback((productIds: string[]) => {
    const productsToAdd = allProducts.filter(p => productIds.includes(p.id_produk));
    
    setCart(currentCart => {
        const newCart = [...currentCart];
        const existingIds = new Set(currentCart.map(item => item.id_produk));
        
        productsToAdd.forEach(product => {
            if (!existingIds.has(product.id_produk)) {
                newCart.push({ ...product, jumlah: 1 });
            }
        });
        return newCart;
    });
  }, [allProducts]);
  
  const handleRemoveFromCart = useCallback((productId: string) => {
    setCart(currentCart => currentCart.filter(item => item.id_produk !== productId));
  }, []);
  
  const handleQuantityChange = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
        handleRemoveFromCart(productId);
    } else {
        setCart(currentCart => currentCart.map(item => item.id_produk === productId ? {...item, jumlah: newQuantity} : item));
    }
  }, [handleRemoveFromCart]);
  
  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.harga || 0) * item.jumlah), 0);
  }, [cart]);

  const totalBayar = useMemo(() => {
    const diskon = parseFloat(financials.diskon.replace(/,/g, '') || "0");
    const bayarInstansi = parseFloat(financials.bayar_instansi.replace(/,/g, '') || "0");
    const total = subTotal - diskon + bayarInstansi;
    return total > 0 ? total : 0;
  }, [subTotal, financials.diskon, financials.bayar_instansi]);
  
  const paymentDifference = useMemo(() => {
    const jumlahBayar = parseFloat(financials.jumlah_bayar.replace(/,/g, '') || "0");
    return totalBayar - jumlahBayar ;
  }, [totalBayar, financials.jumlah_bayar]);

  const handleCustomerDetailsChange = useCallback((field: keyof typeof customerDetails, value: string) => {
    setCustomerDetails(prev => ({ ...prev, [field]: value }));
  }, []);
  
  const handleOrderAndStaffChange = useCallback((field: keyof typeof orderAndStaff, value: string) => {
      setOrderAndStaff(prev => ({...prev, [field]: value}))
  }, []);

  const handlePrescriptionChange = useCallback((field: keyof typeof prescription, value: string) => {
      setPrescription(prev => ({...prev, [field]: value}))
  }, []);

  const handleFinancialsChange = useCallback((field: keyof typeof financials, value: string) => {
      const rawValue = value.replace(/,/g, '');
      if (!isNaN(Number(rawValue))) {
          setFinancials(prev => ({ ...prev, [field]: rawValue }));
      }
  }, []);

  const resetForm = useCallback(() => {
    setCustomerDetails(initialCustomerDetails);
    setOrderAndStaff(initialOrderAndStaff(user?.uid));
    setPrescription(initialPrescription);
    setCart([]);
    setFinancials(initialFinancials);
  }, [user]);

  const handleSave = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Anda tidak login." });
        return;
    }
    if (!customerDetails.nama_pemesan) {
        toast({ variant: "destructive", title: "Error", description: "Nama pemesan harus diisi." });
        return;
    }
    if (cart.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "Tambahkan minimal satu produk." });
        return;
    }

    setIsSaving(true);
    const newOrderId = `E${Date.now()}`;
    
    const sisaBayarValue = paymentDifference > 0 ? paymentDifference : 0;

    const cartProductCategories = new Set(cart.map(item => {
        const product = allProducts.find(p => p.id_produk === item.id_produk);
        const category = allCategories.find(c => c.id_kategori === product?.id_kategori);
        return category ? category.nama_kategori.toLowerCase() : null;
    }));

    let kategori_penjualan = "Lainnya";
    if(cartProductCategories.has("frame") && cartProductCategories.has("lensa")) {
        kategori_penjualan = "Kacamata";
    } else if (cartProductCategories.size === 1) {
        const singleCategory = allCategories.find(c => c.nama_kategori.toLowerCase() === [...cartProductCategories][0]);
        if(singleCategory) kategori_penjualan = singleCategory.nama_kategori;
    }


    const salesHeaderData = {
        id_orders: newOrderId,
        ...customerDetails,
        ...orderAndStaff,
        kategori_penjualan,
        dibuat_pada: new Date().toISOString(),
        tanggal_pesan: format(new Date(orderAndStaff.tanggal_pesan), "dd/MM/yyyy"),
        tanggal_selesai: orderAndStaff.tanggal_selesai ? format(new Date(orderAndStaff.tanggal_selesai), "dd/MM/yyyy") : "",
        tanggal_ambil: orderAndStaff.tanggal_ambil ? format(new Date(orderAndStaff.tanggal_ambil), "dd/MM/yyyy") : "",
        diskon: financials.diskon.replace(/,/g, '') || "0",
        bayar_instansi: financials.bayar_instansi.replace(/,/g, '') || "0",
        jumlah_bayar: financials.jumlah_bayar.replace(/,/g, '') || "0",
        total_jual: totalBayar.toString(),
        total_modal: "0", 
        sisa_bayar: sisaBayarValue.toString(),
        status: sisaBayarValue > 0 ? "panjar" : "lunas",
    };
    
    const salesDetailData = cart.map(item => ({
        id_orders: newOrderId, id_produk: item.id_produk,
        jumlah: item.jumlah.toString(), harga: item.harga.toString(),
    }));

    const prescriptionData = { id_orders: newOrderId, ...prescription };

    try {
        await updateDoc(doc(database, "migrated_data", SALES_DOC_ID), {
            data: arrayUnion(salesHeaderData)
        });
        await updateDoc(doc(database, "migrated_data", SALES_DETAIL_DOC_ID), {
            data: arrayUnion(...salesDetailData)
        });
        await updateDoc(doc(database, "migrated_data", PRESCRIPTION_DOC_ID), {
            data: arrayUnion(prescriptionData)
        });

        const productDocRef = doc(database, "migrated_data", PRODUCTS_DOC_ID);
        const productsSnap = await getDoc(productDocRef);
        const currentProducts = productsSnap.data()?.data || [];
        
        const updatedProducts = currentProducts.map((p: any) => {
            const itemInCart = cart.find(cartItem => cartItem.id_produk === p.id_produk);
            if (itemInCart) {
                const newStock = parseInt(p.stok || "0", 10) - itemInCart.jumlah;
                return { ...p, stok: String(newStock) };
            }
            return p;
        });

        await updateDoc(productDocRef, { data: updatedProducts });
        setAllProducts(updatedProducts);

        toast({ title: "Sukses!", description: "Transaksi berhasil disimpan dan stok telah diperbarui." });
        resetForm();

    } catch(err: any) {
        console.error(err);
        setError(`Gagal menyimpan transaksi: ${err.message}`);
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: `Terjadi kesalahan: ${err.message}` });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }

  return (
    <PageWrapper>
      <ProductSelectionModal 
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        allProducts={allProducts}
        onAddProducts={handleAddProductsToCart}
        cart={cart}
        onRefresh={() => fetchMasterData(true)}
        isRefreshing={isRefreshing}
      />

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle className="text-xl">Form Transaksi Penjualan</CardTitle>
             <Button onClick={() => router.back()} variant="outline"><ArrowLeft className="mr-2"/> Kembali</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {error && (
                 <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-md">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="font-medium">{error}</p>
                </div>
            )}
            
            <CustomerSection 
                customerDetails={customerDetails}
                orderAndStaff={orderAndStaff}
                onCustomerChange={handleCustomerDetailsChange}
                onOrderChange={handleOrderAndStaffChange}
                allOptik={allOptik}
                allDoctors={allDoctors}
                allUsers={allUsers}
            />
            
            <PrescriptionSection
                prescription={prescription}
                onPrescriptionChange={handlePrescriptionChange}
                orderAndStaff={orderAndStaff}
                onOrderChange={handleOrderAndStaffChange}
                lensOptions={lensOptions}
            />

            <CartTable
                cart={cart}
                onQuantityChange={handleQuantityChange}
                onRemoveFromCart={handleRemoveFromCart}
                onOpenProductModal={() => setIsProductModalOpen(true)}
            />
            
            <FinancialSummary
                financials={financials}
                onFinancialsChange={handleFinancialsChange}
                subTotal={subTotal}
                totalBayar={totalBayar}
                paymentDifference={paymentDifference}
            />
        </CardContent>
        <CardFooter className="flex justify-end gap-4 pt-6 border-t">
             <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                Batal
              </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Transaksi
            </Button>
        </CardFooter>
      </Card>
    </PageWrapper>
  );
}
