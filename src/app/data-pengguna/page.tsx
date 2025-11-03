
"use client";

import { useState, useEffect, useMemo } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, User, createUserWithEmailAndPassword, initializeAuth, getAuth, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { firebaseConfig } from "@/firebase/config";
import { initializeApp, getApps, getApp } from 'firebase/app';
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
import { Loader2, AlertTriangle, UserCog, Pencil, Trash2, Lock, Unlock, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const DOC_ID = "b7ojJpFKj4RNIkQneCpu";

// Helper to get or create a secondary app instance
const getSecondaryApp = () => {
  const existingApps = getApps();
  const secondaryAppName = 'user-creation-app';
  const existingApp = existingApps.find(app => app.name === secondaryAppName);
  if (existingApp) {
    return existingApp;
  }
  return initializeApp(firebaseConfig, secondaryAppName);
};


export default function DataPenggunaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [penggunaData, setPenggunaData] = useState<any[]>([]);
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
  
  const [newUserData, setNewUserData] = useState({
    nama_lengkap: "",
    email: "",
    password: "",
    level: "kasir",
    blokir: "N",
  });
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<{ action: () => Promise<void> } | null>(null);


  const withPasswordConfirmation = (action: () => Promise<void>) => {
    setActionToConfirm({ action });
    setIsConfirmModalOpen(true);
  };
  
  const handleConfirmAction = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !user.email) {
          toast({ variant: "destructive", title: "Error", description: "Admin tidak terautentikasi." });
          return;
      }
      if (!actionToConfirm) return;
  
      setIsConfirming(true);
      try {
          const credential = EmailAuthProvider.credential(user.email, confirmPassword);
          await reauthenticateWithCredential(user, credential);
          
          await actionToConfirm.action(); // Execute the stored action
  
      } catch (err: any) {
          let errorMessage = "Password salah. Silakan coba lagi.";
          if (err.code !== 'auth/wrong-password' && err.code !== 'auth/invalid-credential') {
              errorMessage = `Terjadi kesalahan: ${err.message}`;
          }
          toast({ variant: "destructive", title: "Gagal Mengonfirmasi", description: errorMessage });
      } finally {
          setIsConfirming(false);
          setIsConfirmModalOpen(false);
          setConfirmPassword("");
          setActionToConfirm(null);
      }
  };


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
    let sortedData = [...penggunaData];
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
        item.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [penggunaData, searchTerm, itemsPerPage, currentPage, sortConfig]);

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
          const pengguna = docData.data.map((p: any, index: number) => ({ no: index + 1, ...p }));
          setPenggunaData(pengguna);
        } else {
           setError(`Document with ID ${DOC_ID} does not contain a 'data' array field.`);
           setPenggunaData([]);
        }
      } else {
        setError(`No document found with ID: ${DOC_ID}`);
        setPenggunaData([]);
      }
    } catch (err: any) {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `migrated_data/${DOC_ID}`,
                operation: 'get',
            }, err);
            errorEmitter.emit('permission-error', permissionError);
            setError("Permission denied. You do not have access to view this data.");
        } else {
            setError(`An unexpected error occurred: ${err.message}`);
        }
    }
    setIsLoading(false);
  };
  
  const handleDelete = async (itemNo: number) => {
    setIsDeleting(true);
    const itemToDelete = penggunaData.find(item => item.no === itemNo);
    const docRef = doc(database, "migrated_data", DOC_ID);
    const currentData = penggunaData.filter(item => item.no !== itemNo);
    const updatedDataForFirestore = currentData.map(({ no, ...rest }) => rest);

    updateDoc(docRef, { data: updatedDataForFirestore }).then(() => {
        toast({ title: "Sukses", description: "Data pengguna berhasil dihapus dari database." });
        setPenggunaData(currentData.map((item, index) => ({...item, no: index + 1})));
    }).catch((err: any) => {
        const permissionError = new FirestorePermissionError({
            path: `migrated_data/${DOC_ID}`,
            operation: 'update',
            requestResourceData: { data: updatedDataForFirestore }
        }, err);
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Gagal Menghapus",
            description: `Terjadi kesalahan: ${err.message}`,
        });
    }).finally(() => {
        setIsDeleting(false);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewUserData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingUser) return;
    const { name, value } = e.target;
    setEditingUser((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleEditSelectChange = (name: string, value: string) => {
    if (!editingUser) return;
    setEditingUser((prev: any) => ({...prev, [name]: value}))
  }

  const handleOpenEditModal = (user: any) => {
    setEditingUser({ ...user, password: '' }); // Clear password for security
    setIsEditModalOpen(true);
  };

  const handleCreateUserAccount = async (userData: typeof newUserData) => {
    setIsSaving(true);
    try {
        // Step 1: Create user in Firebase Auth
        const secondaryApp = getSecondaryApp();
        const authForCreation = getAuth(secondaryApp);
        const userCredential = await createUserWithEmailAndPassword(authForCreation, userData.email, userData.password);
        const newAuthUser = userCredential.user;

        // Step 2: Save user profile to Firestore
        const dataToSave = {
            id_pengguna: newAuthUser.uid,
            nama_lengkap: userData.nama_lengkap,
            email: userData.email,
            level: userData.level,
            blokir: userData.blokir,
            username: userData.email.split('@')[0],
        };

        const userDocRef = doc(database, "migrated_data", DOC_ID);
        const docSnap = await getDoc(userDocRef);
        let updatedData = [];
        if (docSnap.exists() && Array.isArray(docSnap.data().data)) {
            updatedData = [...docSnap.data().data, dataToSave];
        } else {
            updatedData = [dataToSave];
        }

        await updateDoc(userDocRef, { data: updatedData });

        toast({ title: "Sukses", description: "Pengguna baru berhasil ditambahkan." });
        fetchData(); // Refresh data
        setIsAddModalOpen(false); // Close modal
        setNewUserData({ // Reset form
            nama_lengkap: "", email: "", password: "", level: "kasir", blokir: "N",
        });

    } catch (err: any) {
        let errorMessage = `Terjadi kesalahan: ${err.message}`;
        if (err.code === 'auth/email-already-in-use') {
            errorMessage = 'Email ini sudah digunakan oleh akun lain.';
        } else if (err.code === 'auth/weak-password') {
            errorMessage = 'Password terlalu lemah. Minimal 6 karakter.';
        } else if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `migrated_data/${DOC_ID}`,
                operation: 'update',
                requestResourceData: { /* would be complex to construct here */ }
            }, err);
            errorEmitter.emit('permission-error', permissionError);
            errorMessage = "Gagal menyimpan: Izin ditolak.";
        }
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: errorMessage });
    } finally {
        setIsSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
  
    setIsSaving(true);
    
    // Warn if admin is trying to change password here
    if (editingUser.password) {
        toast({
            variant: "default",
            title: "Info",
            description: "Mengubah password dari form ini tidak didukung. Silakan lakukan reset password dari Firebase Console untuk keamanan."
        });
    }

    // Update only the profile data in Firestore
    const userDocRef = doc(database, "migrated_data", DOC_ID);
    
    // Exclude password from the data to be saved in Firestore
    const { password, ...profileData } = editingUser;

    const updatedData = penggunaData.map(item => 
      item.id_pengguna === profileData.id_pengguna ? profileData : item
    );
    const updatedDataForFirestore = updatedData.map(({ no, ...rest }) => rest);
    
    try {
        await updateDoc(userDocRef, { data: updatedDataForFirestore });
        toast({ title: "Sukses", description: "Data pengguna berhasil diperbarui." });
        setPenggunaData(updatedData); // Optimistic UI update
        setIsEditModalOpen(false);
        setEditingUser(null);
    } catch (err: any) {
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
    } finally {
        setIsSaving(false);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const totalItemsAfterFilter = useMemo(() => {
    return penggunaData.filter(
        (item) =>
          item.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ).length;
  }, [penggunaData, searchTerm]);

  const totalPages = Math.ceil(totalItemsAfterFilter / itemsPerPage);

  const renderTableContent = () => {
    if (paginatedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center">
            No data available.
          </TableCell>
        </TableRow>
      );
    }

    return (
      <>
        {paginatedData.map((item, index) => (
          <TableRow key={`${item.id_pengguna || item.no}-${index}`}>
            <TableCell>{item.no}</TableCell>
            <TableCell>{item.nama_lengkap}</TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{item.level}</TableCell>
            <TableCell>
                 <Button variant="outline" size="sm" className={item.blokir === 'Y' ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"}>
                    {item.blokir === 'Y' ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                    {item.blokir === 'Y' ? 'Ya' : 'Tidak'}
                </Button>
            </TableCell>
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
                      Tindakan ini hanya akan menghapus data pengguna dari database aplikasi. Akun login tidak akan terhapus dari sistem Autentikasi Firebase untuk alasan keamanan. Anda harus menghapusnya secara manual dari Firebase Console.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => withPasswordConfirmation(() => handleDelete(item.no))} disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Hapus dari Database"}
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
              <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                      <UserCog />
                      Manajemen Data Pengguna
                  </CardTitle>
                  <CardDescription>Tambah, Edit, atau Hapus Pengguna Sistem</CardDescription>
              </div>
              <div className="flex gap-2">
                   <Button onClick={() => setIsAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">Tambah Pengguna</Button>
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
                  <span className="text-sm">Cari Pengguna:</span>
                  <Input className="h-8 w-48" placeholder="Nama, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                        <Button variant="ghost" onClick={() => requestSort('nama_lengkap')} className="text-white hover:text-gray-300">
                          Nama Lengkap {getSortIndicator('nama_lengkap')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-white">
                        <Button variant="ghost" onClick={() => requestSort('email')} className="text-white hover:text-gray-300">
                          Email {getSortIndicator('email')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-white">
                        <Button variant="ghost" onClick={() => requestSort('level')} className="text-white hover:text-gray-300">
                          Level {getSortIndicator('level')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-white">
                        <Button variant="ghost" onClick={() => requestSort('blokir')} className="text-white hover:text-gray-300">
                          Blokir {getSortIndicator('blokir')}
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
      
      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
            <form onSubmit={(e) => { e.preventDefault(); withPasswordConfirmation(() => handleCreateUserAccount(newUserData)); }}>
                <DialogHeader>
                    <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                    <DialogDescription>
                        Buat akun login dan profil pengguna baru.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nama_lengkap" className="text-right">Nama Lengkap</Label>
                        <Input id="nama_lengkap" name="nama_lengkap" value={newUserData.nama_lengkap} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" name="email" type="email" value={newUserData.email} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">Password</Label>
                        <Input id="password" name="password" type="password" value={newUserData.password} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="level" className="text-right">Level</Label>
                        <Select name="level" onValueChange={(value) => handleSelectChange("level", value)} value={newUserData.level}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="kasir">Kasir</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="blokir" className="text-right">Blokir</Label>
                        <Select name="blokir" onValueChange={(value) => handleSelectChange("blokir", value)} value={newUserData.blokir}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="N">Tidak</SelectItem>
                                <SelectItem value="Y">Ya</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Batal</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Pengguna
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          {editingUser && (
            <form onSubmit={(e) => { e.preventDefault(); withPasswordConfirmation(handleUpdateUser); }}>
              <DialogHeader>
                <DialogTitle>Edit Data Pengguna</DialogTitle>
                <DialogDescription>
                  Perbarui profil pengguna. Email tidak dapat diubah.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_nama_lengkap" className="text-right">Nama Lengkap</Label>
                    <Input id="edit_nama_lengkap" name="nama_lengkap" value={editingUser.nama_lengkap ?? ''} onChange={handleEditInputChange} className="col-span-3" required />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_email" className="text-right">Email</Label>
                    <Input id="edit_email" name="email" type="email" value={editingUser.email ?? ''} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_password" className="text-right">New Password</Label>
                    <Input id="edit_password" name="password" type="password" placeholder="Kosongkan jika tidak berubah" className="col-span-3" onChange={handleEditInputChange} />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_level" className="text-right">Level</Label>
                    <Select name="level" onValueChange={(value) => handleEditSelectChange("level", value)} value={editingUser.level}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="kasir">Kasir</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_blokir" className="text-right">Blokir</Label>
                    <Select name="blokir" onValueChange={(value) => handleEditSelectChange("blokir", value)} value={editingUser.blokir}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="N">Tidak</SelectItem>
                            <SelectItem value="Y">Ya</SelectItem>
                        </SelectContent>
                    </Select>
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
      
      {/* Password Confirmation Modal */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-sm">
            <form onSubmit={handleConfirmAction}>
                <DialogHeader>
                    <DialogTitle>Konfirmasi Aksi</DialogTitle>
                    <DialogDescription>
                        Untuk keamanan, silakan masukkan password admin Anda untuk melanjutkan.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="confirm_password" className="text-right">
                            Password
                        </Label>
                        <Input
                            id="confirm_password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Batal</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isConfirming}>
                        {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Konfirmasi
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
