
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Layers, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

const DOC_ID = "VQ4hk7uNVzh2tnpv4uKi";

export default function DataJenisLensaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [jenisLensaData, setJenisLensaData] = useState<any[]>([]);
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

  const [newJenisLensaData, setNewJenisLensaData] = useState({ jenis: "" });
  const [editingJenisLensa, setEditingJenisLensa] = useState<any | null>(null);


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
    let sortedData = [...jenisLensaData];
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
        item.jenis?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [jenisLensaData, searchTerm, itemsPerPage, currentPage, sortConfig]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const docRef = doc(database, "migrated_data", DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const docData = docSnap.data();
        if (docData && Array.isArray(docData.data)) {
          const jenisLensa = docData.data.map((p: any, index: number) => ({ no: index + 1, ...p }));
          setJenisLensaData(jenisLensa);
        } else {
           setError(`Document with ID ${DOC_ID} does not contain a 'data' array field.`);
           setJenisLensaData([]);
        }
      } else {
        setError(`No document found with ID: ${DOC_ID}`);
        setJenisLensaData([]);
      }
    } catch (err: any)      {
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
        const currentData = jenisLensaData.filter(item => item.no !== itemNo);
        const updatedDataForFirestore = currentData.map(({ no, ...rest }) => rest);

        await updateDoc(docRef, { data: updatedDataForFirestore });

        toast({ title: "Sukses", description: "Data jenis lensa berhasil dihapus." });
        setJenisLensaData(currentData.map((item, index) => ({...item, no: index + 1})));
    } catch (err: any) {
        const permissionError = new FirestorePermissionError({
            path: `migrated_data/${DOC_ID}`,
            operation: 'update',
            requestResourceData: { data: jenisLensaData.filter(item => item.no !== itemNo).map(({no, ...rest}) => rest) }
        }, err);
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Gagal Menghapus",
            description: `Terjadi kesalahan: ${err.message}`,
        });
    } finally {
        setIsDeleting(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewJenisLensaData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingJenisLensa) return;
    const { name, value } = e.target;
    setEditingJenisLensa((prev: any) => ({ ...prev, [name]: value }));
  };
  
  const handleOpenEditModal = (jenisLensa: any) => {
    setEditingJenisLensa(jenisLensa);
    setIsEditModalOpen(true);
  };

  const handleSaveNewJenisLensa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "Anda harus login terlebih dahulu" });
      return;
    }
    
    setIsSaving(true);
    const jenisLensaDocRef = doc(database, "migrated_data", DOC_ID);
    const dataToSave = {
      ...newJenisLensaData,
      id_jenis: `jenis_${Date.now()}`,
    };

    try {
        const docSnap = await getDoc(jenisLensaDocRef);
        let updatedData = [];
        if (docSnap.exists() && Array.isArray(docSnap.data().data)) {
            updatedData = [...docSnap.data().data, dataToSave];
        } else {
            updatedData = [dataToSave];
        }

        await updateDoc(jenisLensaDocRef, { data: updatedData });

        toast({ title: "Sukses", description: "Data jenis lensa baru berhasil ditambahkan." });
        fetchData();
        setIsAddModalOpen(false);
        setNewJenisLensaData({ jenis: "" });
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
  
  const handleUpdateJenisLensa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingJenisLensa) return;

    setIsSaving(true);
    const jenisLensaDocRef = doc(database, "migrated_data", DOC_ID);
    
    const updatedData = jenisLensaData.map(item => 
      item.id_jenis === editingJenisLensa.id_jenis ? editingJenisLensa : item
    );
    const updatedDataForFirestore = updatedData.map(({ no, ...rest }) => rest);

    updateDoc(jenisLensaDocRef, { data: updatedDataForFirestore }).then(() => {
        toast({ title: "Sukses", description: "Data jenis lensa berhasil diperbarui." });
        setJenisLensaData(updatedData);
        setIsEditModalOpen(false);
        setEditingJenisLensa(null);
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
  
  const totalPages = Math.ceil(jenisLensaData.filter(
      (item) =>
        item.jenis?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length / itemsPerPage);


  const renderTableContent = () => {
    if (paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center">
            No data available.
          </TableCell>
        </TableRow>
      );
    }

    return (
      <>
        {paginatedData.map((item) => (
          <TableRow key={item.id_jenis || item.no}>
            <TableCell>{item.no}</TableCell>
            <TableCell>{item.jenis}</TableCell>
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
                      Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data jenis lensa secara permanen.
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
    const totalFilteredItems = jenisLensaData.filter(
      (item) =>
        item.jenis?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalFilteredItems);
    return `Tampilan ${totalFilteredItems > 0 ? startItem : 0}-${endItem} dari ${totalFilteredItems} Data`;
  }, [jenisLensaData, searchTerm, currentPage, itemsPerPage]);

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
                        <Layers />
                        Manajemen Data Jenis Lensa
                    </CardTitle>
                    <CardDescription>Tambah, Edit, atau Hapus Data Jenis Lensa</CardDescription>
                </div>
                <div className="flex gap-2">
                     <Button onClick={() => setIsAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">Tambah Jenis Lensa</Button>
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
                    <span className="text-sm">Cari Jenis Lensa:</span>
                    <Input className="h-8 w-48" placeholder="Nama jenis..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
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
                           <Button variant="ghost" onClick={() => requestSort('jenis')} className="text-white hover:text-gray-300">
                             Nama Jenis Lensa {getSortIndicator('jenis')}
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
                <form onSubmit={handleSaveNewJenisLensa}>
                    <DialogHeader>
                        <DialogTitle>Tambah Data Jenis Lensa Baru</DialogTitle>
                        <DialogDescription>
                            Isi detail data jenis lensa di bawah ini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="jenis" className="text-right">Nama Jenis</Label>
                            <Input id="jenis" name="jenis" value={newJenisLensaData.jenis} onChange={handleInputChange} className="col-span-3" required />
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
            {editingJenisLensa && (
                <form onSubmit={handleUpdateJenisLensa}>
                <DialogHeader>
                    <DialogTitle>Edit Data Jenis Lensa</DialogTitle>
                    <DialogDescription>
                    Perbarui detail data jenis lensa di bawah ini.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit_jenis" className="text-right">Nama Jenis</Label>
                        <Input id="edit_jenis" name="jenis" value={editingJenisLensa.jenis ?? ''} onChange={handleEditInputChange} className="col-span-3" required />
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

    