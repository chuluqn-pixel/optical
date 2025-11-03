
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  currentPath: string;
}

const NavLink = ({ href, children, currentPath }: NavLinkProps) => {
  const isActive = currentPath === href;
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-2 text-sm font-medium hover:bg-gray-700",
        isActive && "bg-gray-900 border-b-2 border-red-500"
      )}
    >
      {children}
    </Link>
  );
};


export default function Navbar() {
  const pathname = usePathname();
  const isDataAtributActive = [
    "/data-optik", 
    "/data-dokter", 
    "/data-instansi", 
    "/data-distributor", 
    "/data-type-lensa", 
    "/data-jenis-lensa", 
    "/data-nama-lensa"
  ].includes(pathname);
  
  const isLaporanActive = [
    "/laporan-terjual",
    "/laporan-pemesanan",
    "/laporan-pembelian",
    "/rekap-dokter",
    "/rekap-instansi",
    "/laporan-kas",
    "/laporan-kas-pertahun",
    "/laporan-lensa-pesanan",
    "/laporan-pembayaran-sisa",
    "/laporan-aset",
    "/rekap-pelanggan"
  ].includes(pathname);

  return (
    <nav className="bg-gray-800 text-white flex justify-center">
      <NavLink href="/" currentPath={pathname}>HOME PAGE</NavLink>
      <NavLink href="/migration" currentPath={pathname}>MIGRASI</NavLink>
      <NavLink href="/data-pengguna" currentPath={pathname}>DATA PENGGUNA</NavLink>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "px-4 py-2 text-sm font-medium hover:bg-gray-700 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
              isDataAtributActive && "bg-gray-900 border-b-2 border-red-500"
            )}
          >
            DATA ATRIBUT
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-gray-800 text-white border-gray-700">
          <DropdownMenuItem asChild>
            <Link href="/data-optik">Data Optik</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/data-dokter">Data Dokter</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="#">Data Instansi</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/data-distributor">Data Distributor</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/data-type-lensa">Data Type Lensa</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/data-jenis-lensa">Data Jenis Lensa</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="#">Data Nama Lensa</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NavLink href="/transaksi-penjualan" currentPath={pathname}>TRANSAKSI PENJUALAN</NavLink>
      <NavLink href="/kategori-produk" currentPath={pathname}>KATEGORI PRODUK</NavLink>
      <NavLink href="/produk" currentPath={pathname}>JENIS BARANG</NavLink>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "px-4 py-2 text-sm font-medium hover:bg-gray-700 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
              isLaporanActive && "bg-gray-900 border-b-2 border-red-500"
            )}
          >
            LAP. SEMUA DATA OPTIK
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-gray-800 text-white border-gray-700">
          <DropdownMenuItem asChild><Link href="/laporan-terjual">Laporan Terjual</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Laporan Pemesanan</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Laporan Pembelian</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Rekap Dokter</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Rekap Instansi</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Laporan Kas</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Laporan Kas Pertahun</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Laporan Lensa Pesanan</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/laporan-pembayaran-sisa">Laporan Pembayaran Sisa</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Laporan Aset</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Rekap Pelanggan</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NavLink href="/setting-lensa" currentPath={pathname}>SETTING LENSA</NavLink>
      <NavLink href="/login" currentpath={pathname}>LOGOUT</NavLink>
    </nav>
  );
}
