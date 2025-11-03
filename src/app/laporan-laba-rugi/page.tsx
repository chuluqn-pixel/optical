
"use client";

import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import PageWrapper from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2,
  AlertTriangle,
  Calendar as CalendarIcon,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { format, parse, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isValid, startOfToday, startOfYear, getYear, getMonth, endOfYear, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from "next/link";


const SALES_DOC_ID = "bQ2obl6WwM5MuXo6wiB1";
const SALES_DETAIL_DOC_ID = "oQu7zep2d8jM7ChPE3Ja";
const PRODUCTS_DOC_ID = "4McBCfDf5XJnXnw2x8Xm";
const CATEGORIES_DOC_ID = "XgGV6xmYVMHK9SDuc1s0";
const EXPENSES_DOC_ID = "expenses_data";

interface ChartDataItem {
    name: string;
    value: number;
    id?: string;
}

interface MonthlySummaryData {
    month: string;
    pemasukan: number;
    pengeluaran: number;
    selisih: number;
    hutangPiutang: number;
}

interface FinancialSummary {
    totalPemasukan: number;
    avgPemasukan: number;
    totalPengeluaran: number;
    avgPengeluaran: number;
    selisih: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#8884d8', '#FF4560'];


export default function LaporanLabaRugiPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pieChartData, setPieChartData] = useState<ChartDataItem[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryData[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [expenseByCategory, setExpenseByCategory] = useState<ChartDataItem[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<ChartDataItem[]>([]);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfMonth(today) };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const formatCurrency = (value: number) => {
    if (isNaN(value)) return "Rp 0";
    const prefix = value >= 0 ? '+ ' : '- ';
    return `${value < 0 ? '-' : ''} Rp ${Math.abs(value).toLocaleString('id-ID')}`;
  };

   const formatCurrencySimple = (value: number) => {
    if (isNaN(value)) return "Rp 0";
    return `Rp ${value.toLocaleString('id-ID')}`;
  };
  
    const formatCurrencyWithSign = (value: number) => {
      const prefix = value >= 0 ? '+ ' : '- ';
      return `${prefix} ${formatCurrencySimple(Math.abs(value))}`;
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
      fetchFinancialData();
    }
  }, [user, dateRange]);

  const handleTabChange = (value: string) => {
    const today = new Date();
    if (value === 'realtime') {
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    } else if (value === 'bulanan') {
      setDateRange({ from: startOfYear(today), to: endOfYear(today) });
    } else if (value === 'custom') {
    }
  }

  const parseDateString = (dateString: string): Date | null => {
      if (!dateString) return null;
      let date = parse(dateString, "dd/MM/yyyy", new Date());
      if (isValid(date)) return date;
      date = new Date(dateString);
      if (isValid(date)) return date;
      return null;
  }

  const fetchFinancialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesSnap, salesDetailSnap, productsSnap, categoriesSnap, expensesSnap] = await Promise.all([
        getDoc(doc(database, "migrated_data", SALES_DOC_ID)),
        getDoc(doc(database, "migrated_data", SALES_DETAIL_DOC_ID)),
        getDoc(doc(database, "migrated_data", PRODUCTS_DOC_ID)),
        getDoc(doc(database, "migrated_data", CATEGORIES_DOC_ID)),
        getDoc(doc(database, "migrated_data", EXPENSES_DOC_ID)),
      ]);

      const allSalesData = salesSnap.exists() ? salesSnap.data()?.data || [] : [];
      const allSalesDetailData = salesDetailSnap.exists() ? salesDetailSnap.data()?.data || [] : [];
      const allProductsData = productsSnap.exists() ? productsSnap.data()?.data || [] : [];
      const allCategoriesData = categoriesSnap.exists() ? categoriesSnap.data()?.data || [] : [];
      const allExpensesData = expensesSnap.exists() ? expensesSnap.data()?.data || [] : [];
      
      const categoryMap = allCategoriesData.reduce((acc: any, cat: any) => {
        acc[cat.id_kategori] = cat.nama_kategori;
        return acc;
      }, {});

      const productInfoMap = allProductsData.reduce((acc: any, prod: any) => {
        acc[prod.id_produk] = {
            categoryId: prod.id_kategori,
            modal: parseFloat(prod.harga_modal || 0)
        };
        return acc;
      }, {});
      
      const filterByDate = (itemDateStr: string) => {
        if (!dateRange || !dateRange.from) return true;
        const itemDate = parseDateString(itemDateStr);
        if (!itemDate) return false;
        
        const to = dateRange.to || dateRange.from;
        return isWithinInterval(itemDate, { start: dateRange.from, end: to });
      };
      
      const currentFilteredSales = allSalesData.filter((sale: any) => filterByDate(sale.tanggal_pesan));
      setFilteredSales(currentFilteredSales);
      const filteredExpenses = allExpensesData.filter((expense:any) => filterByDate(expense.tanggal));
      
      const totalPemasukan = currentFilteredSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.total_jual || 0), 0);
      const totalPengeluaran = filteredExpenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.jumlah || 0), 0);
      const days = dateRange?.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 1;

      setFinancialSummary({
        totalPemasukan,
        avgPemasukan: totalPemasukan / days,
        totalPengeluaran,
        avgPengeluaran: totalPengeluaran / days,
        selisih: totalPemasukan - totalPengeluaran
      });

      const expensesByCategory = filteredExpenses.reduce((acc: { [key: string]: number }, expense: any) => {
          const category = expense.kategori || 'Lainnya';
          const amount = parseFloat(expense.jumlah || 0);
          if (!acc[category]) acc[category] = 0;
          acc[category] += amount;
          return acc;
      }, {});
      setExpenseByCategory(Object.entries(expensesByCategory).map(([name, value]) => ({name, value})).sort((a,b)=> b.value - a.value));

      const revenueByCategory = currentFilteredSales
        .flatMap((sale: any) => 
            allSalesDetailData.filter((detail: any) => detail.id_orders === sale.id_orders)
        )
        .reduce((acc: { [key: string]: { value: number, id: string } }, detail: any) => {
            const productInfo = productInfoMap[detail.id_produk];
            const categoryId = productInfo?.categoryId;
            const categoryName = categoryId ? categoryMap[categoryId] || 'Lainnya' : 'Lainnya';
            const amount = parseFloat(detail.harga || 0) * parseInt(detail.jumlah || 0);
            
            if (!acc[categoryName]) acc[categoryName] = { value: 0, id: categoryId };
            acc[categoryName].value += amount;
            return acc;
      }, {});

      setIncomeByCategory(Object.entries(revenueByCategory).map(([name, data]) => ({name, value: data.value, id: data.id})).sort((a,b)=> b.value - a.value));


      const pieExpensesByCategory = filteredExpenses.reduce((acc: { [key: string]: number }, expense: any) => {
          const category = `Biaya: ${expense.kategori}` || 'Biaya: Lain-lain';
          const amount = parseFloat(expense.jumlah || 0);
           if (!acc[category]) acc[category] = 0;
          acc[category] += amount;
          return acc;
      }, {});
      
      const pieRevenueByCategory = Object.entries(revenueByCategory).reduce((acc: {[key: string]: number}, [name, data]) => {
          acc[name] = data.value;
          return acc;
      }, {});
      
      const combinedPieData = { ...pieRevenueByCategory, ...pieExpensesByCategory };
      const formattedPieChartData = Object.entries(combinedPieData)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
      setPieChartData(formattedPieChartData);
      
      const salesByDay: { [key: string]: { Penjualan: number, Keuntungan: number } } = {};
      
      currentFilteredSales.forEach((sale: any) => {
          const saleDate = parseDateString(sale.tanggal_pesan);
          if(!saleDate) return;

          const dateKey = format(saleDate, 'yyyy-MM-dd');
          if(!salesByDay[dateKey]) {
              salesByDay[dateKey] = { Penjualan: 0, Keuntungan: 0 };
          }
          const totalJual = parseFloat(sale.total_jual || 0);
          const totalModal = parseFloat(sale.total_modal || 0);
          salesByDay[dateKey].Penjualan += totalJual;
          salesByDay[dateKey].Keuntungan += totalJual - totalModal;
      });

      const start = dateRange?.from || startOfMonth(new Date());
      const end = dateRange?.to || endOfMonth(new Date());
      const dailyData = eachDayOfInterval({start, end}).map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          return {
              name: format(day, 'dd MMM'),
              ...salesByDay[dateKey] || { Penjualan: 0, Keuntungan: 0 }
          }
      });
      setBarChartData(dailyData);


      const monthlyData: { [key: string]: MonthlySummaryData } = {};

      allSalesData.forEach((sale: any) => {
        const saleDate = parseDateString(sale.tanggal_pesan);
        if (saleDate) {
          const monthKey = format(saleDate, 'yyyy-MM');
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: format(saleDate, 'MMMM yyyy', { locale: id }), pemasukan: 0, pengeluaran: 0, selisih: 0, hutangPiutang: 0 };
          }
          monthlyData[monthKey].pemasukan += parseFloat(sale.total_jual || 0);
          monthlyData[monthKey].hutangPiutang += parseFloat(sale.sisa_bayar || 0);
        }
      });
      
      allExpensesData.forEach((expense: any) => {
        const expenseDate = parseDateString(expense.tanggal);
        if (expenseDate) {
          const monthKey = format(expenseDate, 'yyyy-MM');
           if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: format(expenseDate, 'MMMM yyyy', { locale: id }), pemasukan: 0, pengeluaran: 0, selisih: 0, hutangPiutang: 0 };
          }
          monthlyData[monthKey].pengeluaran += parseFloat(expense.jumlah || 0);
        }
      });

      const summary = Object.values(monthlyData).map(data => ({
        ...data,
        selisih: data.pemasukan - data.pengeluaran,
      })).sort((a, b) => {
        const dateA = parse(a.month, 'MMMM yyyy', new Date(), { locale: id });
        const dateB = parse(b.month, 'MMMM yyyy', new Date(), { locale: id });
        return dateB.getTime() - dateA.getTime();
      });

      setMonthlySummary(summary);

    } catch (err: any) {
      const friendlyMessage = err.code === "permission-denied"
          ? "Izin ditolak. Silakan periksa aturan keamanan Firestore Anda."
          : `Terjadi kesalahan tak terduga: ${err.message}`;
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPieValue = useMemo(() => pieChartData.reduce((sum, item) => sum + item.value, 0), [pieChartData]);

  if (!user) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
            <div className="bg-background p-2 border border-border rounded shadow-lg">
                <p className="font-bold text-sm">{label}</p>
                {payload.map((entry: any) => (
                    <p key={entry.name} style={{ color: entry.color }} className="text-xs">
                        {`${entry.name}: ${formatCurrencySimple(entry.value)}`}
                    </p>
                ))}
            </div>
            );
        }
        return null;
    };
    
    const MonthlySummary = () => {
        if (isLoading) {
             return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
        }
        if (error) {
            return (
                <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-md">
                    <AlertTriangle className="h-5 w-5" /><p className="font-medium">{error}</p>
                </div>
            );
        }
        if (monthlySummary.length === 0) {
            return <div className="text-center h-96 flex items-center justify-center"><p className="text-muted-foreground">Tidak ada data bulanan.</p></div>
        }
        
        const chartDataForMonthly = monthlySummary.map(s => ({
            name: s.month.substring(0, 3),
            ...s
        })).reverse();

        return (
            <div className="space-y-6">
                <div className="w-full h-96">
                    <ResponsiveContainer>
                        <BarChart data={chartDataForMonthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value) / 1000000}jt`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="pemasukan" fill="#16a34a" radius={[4, 4, 0, 0]} name="Pemasukan"/>
                            <Bar dataKey="pengeluaran" fill="#dc2626" radius={[4, 4, 0, 0]} name="Pengeluaran" />
                            <Bar dataKey="selisih" fill="#2563eb" radius={[4, 4, 0, 0]} name="Selisih" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {monthlySummary.map((summary, index) => {
                    const monthDate = parse(summary.month, 'MMMM yyyy', new Date(), { locale: id });
                    const monthRange = `${format(startOfMonth(monthDate), 'dd MMM yyyy')} - ${format(endOfMonth(monthDate), 'dd MMM yyyy')}`;
                    return (
                        <div key={index} className="border-b pb-4">
                            <p className="text-sm font-semibold text-gray-600 mb-2">{monthRange}</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                <div>Pengeluaran</div>
                                <div className="text-right font-mono">{formatCurrencySimple(summary.pengeluaran)}</div>
                                <div className="flex items-center">Pemasukan <ChevronRight className="h-4 w-4 text-green-500 ml-1"/></div>
                                <div className="text-right font-mono text-green-600">{formatCurrencyWithSign(summary.pemasukan)}</div>
                                <div>Selisih</div>
                                <div className={`text-right font-mono ${summary.selisih < 0 ? 'text-red-600' : ''}`}>{formatCurrencyWithSign(summary.selisih)}</div>
                                <div>Hutang Piutang</div>
                                <div className="text-right font-mono text-green-600">{formatCurrencyWithSign(summary.hutangPiutang)}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

  const renderPieChart = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }
    if (error) {
      return (
        <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-md">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      );
    }
    if (pieChartData.length > 0) {
      return (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="w-full h-96">
                <ResponsiveContainer>
                <PieChart>
                    <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={150}
                    innerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    >
                    {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-2">
                {pieChartData.map((item, index) => (
                <div key={index} className="flex items-center">
                    <div style={{ backgroundColor: COLORS[index % COLORS.length] }} className="w-12 h-6 text-white text-xs font-bold flex items-center justify-center rounded-sm mr-4">
                    {totalPieValue > 0 ? ((item.value / totalPieValue) * 100).toFixed(0) : 0}%
                    </div>
                    <div className="flex-grow font-medium">{item.name}</div>
                    <div className="font-mono text-right">{item.value.toLocaleString('id-ID')}</div>
                </div>
                ))}
                <div className="flex items-center pt-2 border-t mt-2">
                <div className="w-12 h-6 mr-4"></div>
                <div className="flex-grow font-bold">TOTAL</div>
                <div className="font-mono font-bold text-right">{totalPieValue.toLocaleString('id-ID')}</div>
                </div>
            </div>
            </div>
      );
    }
    return (
      <div className="text-center h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Tidak ada data untuk periode yang dipilih.</p>
      </div>
    );
  };
  
    const DailySalesTable = ({ sales }: { sales: any[] }) => {
        const [currentPage, setCurrentPage] = useState(1);
        const itemsPerPage = 5;

        const sortedSales = useMemo(() => {
            return [...sales].sort((a,b) => {
                const dateA = parseDateString(a.tanggal_pesan)?.getTime() || 0;
                const dateB = parseDateString(b.tanggal_pesan)?.getTime() || 0;
                return dateB - dateA;
            })
        }, [sales]);

        const paginatedSales = useMemo(() => {
            const startIndex = (currentPage - 1) * itemsPerPage;
            return sortedSales.slice(startIndex, startIndex + itemsPerPage);
        }, [sortedSales, currentPage, itemsPerPage]);

        const totalPages = Math.ceil(sortedSales.length / itemsPerPage);

        if(sales.length === 0) return null;

        return (
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Detail Transaksi</h3>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>No. Nota</TableHead>
                                <TableHead>Pemesan</TableHead>
                                <TableHead className="text-right">Total Jual</TableHead>
                                <TableHead className="text-right">Keuntungan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSales.map(sale => (
                                <TableRow key={sale.id_orders}>
                                    <TableCell>{sale.tanggal_pesan}</TableCell>
                                    <TableCell>{sale.no_ref}</TableCell>
                                    <TableCell>{sale.nama_pemesan}</TableCell>
                                    <TableCell className="text-right">{formatCurrencySimple(parseFloat(sale.total_jual || 0))}</TableCell>
                                    <TableCell className="text-right">{formatCurrencySimple(parseFloat(sale.total_jual || 0) - parseFloat(sale.total_modal || 0))}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 <div className="flex justify-end items-center mt-4 text-sm text-gray-600 gap-2">
                     <span>Halaman {currentPage} dari {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Sebelumnya</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Berikutnya</Button>
                </div>
            </div>
        )
    }

  const renderBarChart = () => {
        if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
        }
        if (error) {
        return (
            <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-md">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
            </div>
        );
        }
        if (barChartData.length > 0) {
        return (
            <div>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="Penjualan" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Keuntungan" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                <DailySalesTable sales={filteredSales} />
            </div>
        );
        }
        return (
        <div className="text-center h-96 flex items-center justify-center">
            <p className="text-muted-foreground">Tidak ada data untuk periode yang dipilih.</p>
        </div>
        );
  };

  const FinancialSummaryCard = () => {
      if (!financialSummary) return null;
      
      const { totalPemasukan, avgPemasukan, totalPengeluaran, avgPengeluaran, selisih } = financialSummary;

      return (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="text-center">
                <p className="text-sm text-muted-foreground">
                    {dateRange?.from ? format(dateRange.from, 'dd MMM yyyy', {locale: id}) : ''} - {dateRange?.to ? format(dateRange.to, 'dd MMM yyyy', {locale: id}) : ''}
                </p>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between"><span>Pengeluaran</span> <span className="font-mono">{formatCurrencySimple(totalPengeluaran)}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>rata-rata perhari</span> <span className="font-mono">{Math.round(avgPengeluaran).toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-green-600"><span>Pemasukan</span> <span className="font-mono">{formatCurrencyWithSign(totalPemasukan)}</span></div>
                <div className="flex justify-between text-sm text-green-600"><span>rata-rata perhari</span> <span className="font-mono">+ {Math.round(avgPemasukan).toLocaleString('id-ID')}</span></div>
                <div className={`flex justify-between font-bold ${selisih < 0 ? 'text-red-600' : ''}`}><span>Selisih</span> <span className="font-mono">{formatCurrency(selisih)}</span></div>
            </div>
          </div>
      )
  }

  const CategoryDetailList = ({ title, data, type }: { title: string, data: ChartDataItem[], type: 'income' | 'expense' }) => {
    if (data.length === 0) return null;
    const max = Math.max(...data.map(item => item.value));

    const getLink = (item: ChartDataItem) => {
        if (type === 'income' && item.id) {
            return `/produk?kategori=${item.id}`;
        }
        if (type === 'expense') {
            return `/laporan-kas?search=${encodeURIComponent(item.name)}`;
        }
        return '#';
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-center">{title}</h3>
            <div className="space-y-3">
                {data.map((item, index) => (
                    <Link href={getLink(item)} key={index} className="block hover:bg-muted/50 p-2 rounded-md">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{item.value.toLocaleString('id-ID')}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                                className="h-1.5 rounded-full" 
                                style={{ 
                                    width: `${(item.value / max) * 100}%`,
                                    backgroundColor: type === 'income' ? COLORS[index % COLORS.length] : '#6b7280'
                                }}
                            ></div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
  }

  return (
    <PageWrapper>
      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Laporan Laba Rugi</h1>
                <p className="text-muted-foreground">Analisis visual pendapatan dan pengeluaran.</p>
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[260px] justify-start text-left font-normal",
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
                    <PopoverContent className="w-auto p-0" align="end">
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
                <Button onClick={() => fetchFinancialData()} variant="outline" size="icon" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
          </div>
           <Tabs defaultValue="realtime" onValueChange={handleTabChange} className="mt-4">
            <TabsList>
              <TabsTrigger value="realtime">Grafik Bulan Ini</TabsTrigger>
              <TabsTrigger value="bulanan">Rekap Bulanan</TabsTrigger>
              <TabsTrigger value="custom">Laporan Kategori</TabsTrigger>
            </TabsList>
            <TabsContent value="realtime">
              {renderBarChart()}
            </TabsContent>
            <TabsContent value="bulanan">
              <MonthlySummary />
            </TabsContent>
            <TabsContent value="custom" className="space-y-6">
              {renderPieChart()}
              <FinancialSummaryCard/>
              <CategoryDetailList title="Pengeluaran per Kategori" data={expenseByCategory} type="expense" />
              <CategoryDetailList title="Pemasukan per Kategori" data={incomeByCategory} type="income" />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </PageWrapper>
  );
}

