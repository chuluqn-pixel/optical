
"use client";

import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Store,
  User as UserIcon,
  Calendar as CalendarIcon,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parse, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, differenceInDays, addDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";


const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";
const USERS_DOC_ID = "b7ojJpFKj4RNIkQneCpu";
const OPTIK_DOC_ID = "JXof497VgWYludHMt5Uc";
const INSTANSI_DOC_ID = "dzpok016Hnin9V6VQUTk";


export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allOptik, setAllOptik] = useState<any[]>([]);
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    outstandingPayments: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedSales, setSelectedSales] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const formatCurrency = (value: number) => {
    if (isNaN(value)) return "Rp 0";
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const formatTanggal = (dateString: string) => {
    if (!dateString || dateString.trim() === "") return "-";
    try {
        const [day, month, year] = dateString.split('/');
        const date = new Date(`${year}-${month}-${day}`);
        if(isNaN(date.getTime())) return dateString;
        return format(date, "dd MMM yyyy", { locale: id });
    } catch (e) {
        return dateString;
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
      fetchMasterData();
    }
  }, [user]);

  const filteredSales = useMemo(() => {
    return allSales.filter(sale => {
      const branchMatch = selectedBranch === 'all' || sale.id_instansi === selectedBranch;

      let salesMatch = true;
      if (selectedSales !== 'all') {
        const selectedUser = allUsers.find(u => u.id_pengguna === selectedSales || u.id_user === selectedSales);
        if (selectedUser) {
          salesMatch = sale.id_user === selectedUser.id_user || sale.id_user === selectedUser.id_pengguna;
        } else {
          salesMatch = false; 
        }
      }
      
      let dateMatch = true;
      if (dateRange?.from) {
        try {
          const saleDate = parse(sale.tanggal_pesan, 'dd/MM/yyyy', new Date());
          if (dateRange.to) {
            dateMatch = isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to });
          } else {
            dateMatch = format(saleDate, 'yyyy-MM-dd') === format(dateRange.from, 'yyyy-MM-dd');
          }
        } catch (e) {
          dateMatch = false;
        }
      }

      return branchMatch && salesMatch && dateMatch;
    });
  }, [allSales, selectedBranch, selectedSales, dateRange, allUsers]);

  useEffect(() => {
    if(isLoading) return;

    if(filteredSales.length === 0) {
        setStats({ totalRevenue: 0, totalProfit: 0, totalTransactions: 0, outstandingPayments: 0 });
        setRecentSales([]);
        setChartData([]);
        return;
    }

    let totalRevenue = 0;
    let totalProfit = 0;
    let outstandingPayments = 0;

    const salesByDate: { [key: string]: { Penjualan: number, Keuntungan: number } } = {};

    filteredSales.forEach(sale => {
      totalRevenue += parseFloat(sale.total_jual || 0);
      totalProfit += parseFloat(sale.total_jual || 0) - parseFloat(sale.total_modal || 0);
      outstandingPayments += parseFloat(sale.sisa_bayar || 0);

      try {
        const saleDate = parse(sale.tanggal_pesan, 'dd/MM/yyyy', new Date());
        if (!isNaN(saleDate.getTime())) {
          const dateKey = format(saleDate, 'yyyy-MM-dd');
          if (!salesByDate[dateKey]) {
            salesByDate[dateKey] = { Penjualan: 0, Keuntungan: 0 };
          }
          salesByDate[dateKey].Penjualan += parseFloat(sale.total_jual || 0);
          salesByDate[dateKey].Keuntungan += parseFloat(sale.total_jual || 0) - parseFloat(sale.total_modal || 0);
        }
      } catch(e) {
        console.warn("Invalid date format in sales data:", sale.tanggal_pesan);
      }
    });

    const getChartData = () => {
      const today = new Date();
      let start = dateRange?.from || startOfWeek(today, { weekStartsOn: 1 });
      let end = dateRange?.to || endOfWeek(today, { weekStartsOn: 1 });

      const days = differenceInDays(end, start);

      if (days < 1) { // Single day selected
        return [{
            name: format(start, 'dd MMM', { locale: id }),
            ...salesByDate[format(start, 'yyyy-MM-dd')] || { Penjualan: 0, Keuntungan: 0 }
        }]
      }

      if (days < 14) { // Less than 2 weeks, show daily
         return eachDayOfInterval({ start, end }).map(day => ({
          name: format(day, 'dd MMM', { locale: id }),
          ...salesByDate[format(day, 'yyyy-MM-dd')] || { Penjualan: 0, Keuntungan: 0 }
        }));
      } else { // 2 weeks or more, show weekly
        const weeklyData: { [key: string]: { Penjualan: number, Keuntungan: number } } = {};
        for (const dateKey in salesByDate) {
          const weekStart = format(startOfWeek(new Date(dateKey), { weekStartsOn: 1 }), 'dd MMM');
          if (!weeklyData[weekStart]) {
            weeklyData[weekStart] = { Penjualan: 0, Keuntungan: 0 };
          }
          weeklyData[weekStart].Penjualan += salesByDate[dateKey].Penjualan;
          weeklyData[weekStart].Keuntungan += salesByDate[dateKey].Keuntungan;
        }
        return Object.entries(weeklyData).map(([name, values]) => ({ name, ...values }));
      }
    }
    
    setChartData(getChartData());
    
    setStats({
      totalRevenue,
      totalProfit,
      totalTransactions: filteredSales.length,
      outstandingPayments,
    });

    const sortedSales = [...filteredSales].sort((a, b) => {
      try {
          const dateA = parse(a.tanggal_pesan, 'dd/MM/yyyy', new Date()).getTime();
          const dateB = parse(b.tanggal_pesan, 'dd/MM/yyyy', new Date()).getTime();
          return dateB - dateA;
      } catch(e) {
          return 0;
      }
    });
    setRecentSales(sortedSales.slice(0, 5));

  }, [filteredSales, isLoading, dateRange]);

  const fetchMasterData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesSnap, usersSnap, optikSnap, instansiSnap] = await Promise.all([
        getDoc(doc(database, "migrated_data", SALES_DOC_ID)),
        getDoc(doc(database, "migrated_data", USERS_DOC_ID)),
        getDoc(doc(database, "migrated_data", OPTIK_DOC_ID)),
        getDoc(doc(database, "migrated_data", INSTANSI_DOC_ID)),
      ]);

      if (salesSnap.exists() && salesSnap.data()?.data) {
        setAllSales(salesSnap.data().data);
      } else {
        throw new Error("Dokumen penjualan tidak ditemukan atau kosong.");
      }
      
      setAllUsers(usersSnap.exists() ? usersSnap.data()?.data : []);
      
      const optikData = optikSnap.exists() ? optikSnap.data()?.data : [];
      const instansiData = instansiSnap.exists() ? instansiSnap.data()?.data : [];
      setAllOptik([...optikData, ...instansiData]);

    } catch (err: any) {
      const friendlyMessage = err.code === "permission-denied"
          ? "Izin ditolak. Silakan periksa aturan keamanan Firestore Anda untuk mengizinkan pembacaan."
          : `Terjadi kesalahan tak terduga: ${err.message}`;
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
  if (isLoading) {
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
            <Button onClick={fetchMasterData} className="mt-4">Coba Lagi</Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  const statCards = [
    { title: "Total Penjualan", value: formatCurrency(stats.totalRevenue), icon: DollarSign, description: "Pendapatan dari semua transaksi." },
    { title: "Total Keuntungan", value: formatCurrency(stats.totalProfit), icon: TrendingUp, description: "Laba bersih dari penjualan." },
    { title: "Total Transaksi", value: stats.totalTransactions.toLocaleString('id-ID'), icon: ShoppingCart, description: "Jumlah semua nota penjualan." },
    { title: "Piutang", value: formatCurrency(stats.outstandingPayments), icon: CreditCard, description: "Total sisa bayar dari pelanggan." },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Penjualan</h1>
          <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pilih rentang tanggal</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-muted-foreground"/>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Pilih Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Cabang</SelectItem>
                        {allOptik.map((optik, index) => (
                            <SelectItem key={`${optik.id_instansi}-${index}`} value={optik.id_instansi}>{optik.nama_instansi}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-muted-foreground"/>
                 <Select value={selectedSales} onValueChange={setSelectedSales}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Pilih Sales" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Sales</SelectItem>
                        {allUsers.map((u, index) => (
                            <SelectItem key={`${u.id_pengguna || u.id_user}-${index}`} value={u.id_pengguna || u.id_user}>{u.nama_lengkap}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Chart */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Grafik Penjualan</CardTitle>
              <CardDescription>Grafik penjualan dan keuntungan berdasarkan filter yang dipilih.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Penjualan" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Keuntungan" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Recent Sales Table */}
          <Card className="lg:col-span-3">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Transaksi Terakhir</CardTitle>
                        <CardDescription>5 transaksi penjualan terakhir yang tercatat.</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/laporan-terjual">Lihat Semua <ArrowRight className="ml-2 h-4 w-4"/></Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pemesan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map(sale => (
                    <TableRow key={sale.id_orders}>
                      <TableCell>
                        <div className="font-medium">{sale.nama_pemesan}</div>
                        <div className="text-xs text-muted-foreground">{sale.id_orders}</div>
                      </TableCell>
                      <TableCell>{formatTanggal(sale.tanggal_pesan)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(parseFloat(sale.total_jual))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
