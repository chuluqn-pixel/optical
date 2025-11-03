
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Building, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const DOC_ID = "JXof497VgWYludHMt5Uc";

export default function DataOptikPage() {
  const [user, setUser] = useState<User | null>(null);
  const [optikData, setOptikData] = useState<any[]>([]);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newOptikData, setNewOptikData] = useState({
    nama_optik: "",
    alamat_optik: "",
    kota: "",
    telpon: "",
    no_rekening: "",
    nama_bank: "",
  });

  const [editingOptik, setEditingOptik] = useState<any | null>(null);

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
    let sortedData = [...optikData];
    if (sortConfig !== null) {
        sortedData.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    const filteredData = sortedData.filter(
      (item) =>
        item.nama_optik?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kota?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [optikData, searchTerm, itemsPerPage, currentPage, sortConfig]);


  const fetchData = async () => {
    if(!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const docRef = doc(database, "migrated_data", DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const docData = docSnap.data();
        if (docData && Array.isArray(docData.data)) {
          const optik = docData.data.map((p: any, index: number) => ({
             ...p,
             no: index + 1,
             // Map Firestore fields to UI fields
             nama_optik: p.nama_instansi || p.nama_optik,
             alamat_optik: p.alamat_instansi || p.alamat_optik,
          }));
          setOptikData(optik);
        } else {
           setError(`Document with ID ${DOC_ID} does not contain a 'data' array field.`);
           setOptikData([]);
        }
      } else {
        setError(`No document found with ID: ${DOC_ID}`);
        setOptikData([]);
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
  
  const handleDelete = async (itemNo: number) => {
    setIsDeleting(true);
    try {
        const docRef = doc(database, "migrated_data", DOC_ID);
        const currentData = optikData.filter(item => item.no !== itemNo);
        const updatedDataForFirestore = currentData.map(({ no, nama_optik, alamat_optik, ...rest }) => ({
          ...rest,
          nama_instansi: nama_optik,
          alamat_instansi: alamat_optik,
        }));

        await updateDoc(docRef, { data: updatedDataForFirestore });

        toast({ title: "Sukses", description: "Data optik berhasil dihapus." });
        setOptikData(currentData.map((item, index) => ({...item, no: index + 1})));
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewOptikData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingOptik) return;
    const { name, value } = e.target;
    setEditingOptik((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleOpenEditModal = (optik: any) => {
    setEditingOptik(optik);
    setIsEditModalOpen(true);
  };

  const handleSaveNewOptik = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "Anda harus login terlebih dahulu" });
      return;
    }
    
    setIsSaving(true);
    const optikDocRef = doc(database, "migrated_data", DOC_ID);
    
    // Map UI fields back to Firestore fields
    const dataToSave = {
      id_optik: `optik_${Date.now()}`,
      nama_instansi: newOptikData.nama_optik,
      alamat_instansi: newOptikData.alamat_optik,
      kota: newOptikData.kota,
      telpon: newOptikData.telpon,
      no_rekening: newOptikData.no_rekening,
      nama_bank: newOptikData.nama_bank,
    };

    try {
      const docSnap = await getDoc(optikDocRef);
      let updatedData = [];
      if (docSnap.exists() && Array.isArray(docSnap.data().data)) {
        updatedData = [...docSnap.data().data, dataToSave];
      } else {
         updatedData = [dataToSave];
      }

      await updateDoc(optikDocRef, { data: updatedData });

      toast({ title: "Sukses", description: "Data Optik baru berhasil ditambahkan." });
      fetchData();
      setIsAddModalOpen(false);
      setNewOptikData({
          nama_optik: "",
          alamat_optik: "",
          kota: "",
          telpon: "",
          no_rekening: "",
          nama_bank: "",
      });

    } catch (err: any) {
        const permissionError = new FirestorePermissionError({
            path: `migrated_data/${DOC_ID}`,
            operation: 'update',
            requestResourceData: { data: [dataToSave] }
        }, err);
        errorEmitter.emit('permission-error', permissionError);

        toast({
            variant: "destructive",
            title: "Gagal Menyimpan",
            description: `Terjadi kesalahan: ${err.message}`,
        });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOptik = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOptik) return;

    setIsSaving(true);
    const optikDocRef = doc(database, "migrated_data", DOC_ID);
    
    const updatedData = optikData.map(item => {
      if (item.id_optik === editingOptik.id_optik || item.id_instansi === editingOptik.id_instansi) {
        return editingOptik;
      }
      return item;
    });

    const updatedDataForFirestore = updatedData.map(({ no, nama_optik, alamat_optik, ...rest }) => ({
      ...rest,
      // Map UI fields back to Firestore fields
      nama_instansi: nama_optik,
      alamat_instansi: alamat_optik,
    }));

    updateDoc(optikDocRef, { data: updatedDataForFirestore }).then(() => {
        toast({ title: "Sukses", description: "Data optik berhasil diperbarui." });
        setOptikData(updatedData);
        setIsEditModalOpen(false);
        setEditingOptik(null);
    }).catch((err: any) => {
        const permissionError = new FirestorePermissionError({
            path: `migrated_data/${DOC_ID}`,
            operation: 'update',
            requestResourceData: { data: updatedDataForFirestore }
        }, err);
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Gagal Memperbarui",
            description: `Terjadi kesalahan: ${err.message}`,
        });
    }).finally(() => {
        setIsSaving(false);
    });
  };

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const totalPages = Math.ceil(optikData.filter(
      (item) =>
        item.nama_optik?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kota?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length / itemsPerPage);

  const renderTableContent = () => {
    if (paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center">
            No data available.
          </TableCell>
        </TableRow>
      );
    }

    return (
      <>
        {paginatedData.map((item) => (
          <TableRow key={item.id_optik || item.id_instansi || item.no}>
            <TableCell>{item.no}</TableCell>
            <TableCell>{item.nama_optik}</TableCell>
            <TableCell>{item.alamat_optik}</TableCell>
            <TableCell>{item.kota}</TableCell>
            <TableCell>{item.telpon}</TableCell>
            <TableCell>{item.nama_bank}</TableCell>
            <TableCell>{item.no_rekening}</TableCell>
            <TableCell className="flex gap-2">
              <Button onClick={() => handleOpenEditModal(item)} variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                <Pencil className="h-4 w-4 mr-1" /> Edit
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
                      Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data optik secara permanen.
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
      </>
    );
  };
  
  const paginationInfo = useMemo(() => {
    const totalFilteredItems = optikData.filter(
      (item) =>
        item.nama_optik?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kota?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalFilteredItems);
    return `Tampilan ${totalFilteredItems > 0 ? startItem : 0}-${endItem} dari ${totalFilteredItems} Data`;
  }, [optikData, searchTerm, currentPage, itemsPerPage]);

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
              <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                      <Building />
                      Manajemen Data Optik
                  </CardTitle>
                  <CardDescription>Tambah, Edit, atau Hapus Data Optik Rekanan</CardDescription>
              </div>
              <div className="flex gap-2">
                  <Button onClick={() => setIsAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">Tambah Optik</Button>
              </div>
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
                  <span className="text-sm">Cari Optik:</span>
                  <Input className="h-8 w-48" placeholder="Nama, kota..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                          <Button variant="ghost" onClick={() => requestSort('nama_optik')} className="text-white hover:text-gray-300">
                          Nama Optik {getSortIndicator('nama_optik')}
                          </Button>
                      </TableHead>
                      <TableHead className="text-white">
                          <Button variant="ghost" onClick={() => requestSort('alamat_optik')} className="text-white hover:text-gray-300">
                          Alamat {getSortIndicator('alamat_optik')}
                          </Button>
                      </TableHead>
                      <TableHead className="text-white">
                          <Button variant="ghost" onClick={() => requestSort('kota')} className="text-white hover:text-gray-300">
                          Kota {getSortIndicator('kota')}
                          </Button>
                      </TableHead>
                      <TableHead className="text-white">
                          <Button variant="ghost" onClick={() => requestSort('telpon')} className="text-white hover:text-gray-300">
                          No Tlp {getSortIndicator('telpon')}
                          </Button>
                      </TableHead>
                      <TableHead className="text-white">
                          <Button variant="ghost" onClick={() => requestSort('nama_bank')} className="text-white hover:text-gray-300">
                          Nama Bank {getSortIndicator('nama_bank')}
                          </Button>
                      </TableHead>
                      <TableHead className="text-white">
                          <Button variant="ghost" onClick={() => requestSort('no_rekening')} className="text-white hover:text-gray-300">
                          No Rekening {getSortIndicator('no_rekening')}
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

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSaveNewOptik}>
                <DialogHeader>
                    <DialogTitle>Tambah Data Optik Baru</DialogTitle>
                    <DialogDescription>
                        Isi detail data optik di bawah ini. Klik simpan jika sudah selesai.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nama_optik" className="text-right">Nama Optik</Label>
                        <Input id="nama_optik" name="nama_optik" value={newOptikData.nama_optik} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="alamat_optik" className="text-right">Alamat</Label>
                        <Textarea id="alamat_optik" name="alamat_optik" value={newOptikData.alamat_optik} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="kota" className="text-right">Kota</Label>
                        <Input id="kota" name="kota" value={newOptikData.kota} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="telpon" className="text-right">No Tlp</Label>
                        <Input id="telpon" name="telpon" value={newOptikData.telpon} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nama_bank" className="text-right">Nama Bank</Label>
                        <Input id="nama_bank" name="nama_bank" value={newOptikData.nama_bank} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="no_rekening" className="text-right">No Rekening</Label>
                        <Input id="no_rekening" name="no_rekening" value={newOptikData.no_rekening} onChange={handleInputChange} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Batal</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Data
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          {editingOptik && (
            <form onSubmit={handleUpdateOptik}>
              <DialogHeader>
                <DialogTitle>Edit Data Optik</DialogTitle>
                <DialogDescription>
                  Perbarui detail data optik di bawah ini. Klik simpan jika sudah selesai.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_nama_optik" className="text-right">Nama Optik</Label>
                  <Input id="edit_nama_optik" name="nama_optik" value={editingOptik.nama_optik ?? ''} onChange={handleEditInputChange} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_alamat_optik" className="text-right">Alamat</Label>
                  <Textarea id="edit_alamat_optik" name="alamat_optik" value={editingOptik.alamat_optik ?? ''} onChange={handleEditInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_kota" className="text-right">Kota</Label>
                  <Input id="edit_kota" name="kota" value={editingOptik.kota ?? ''} onChange={handleEditInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_telpon" className="text-right">No Tlp</Label>
                  <Input id="edit_telpon" name="telpon" value={editingOptik.telpon ?? ''} onChange={handleEditInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_nama_bank" className="text-right">Nama Bank</Label>
                  <Input id="edit_nama_bank" name="nama_bank" value={editingOptik.nama_bank ?? ''} onChange={handleEditInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_no_rekening" className="text-right">No Rekening</Label>
                  <Input id="edit_no_rekening" name="no_rekening" value={editingOptik.no_rekening ?? ''} onChange={handleEditInputChange} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
