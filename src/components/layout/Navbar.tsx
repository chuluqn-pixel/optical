
"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useUserLevel, useFirebase } from "@/firebase/provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  currentPath: string;
  onClick?: () => void;
}

const NavLink = ({ href, children, currentPath, onClick }: NavLinkProps) => {
  const isActive = currentPath === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium hover:bg-gray-700 w-full text-left",
        isActive && "bg-gray-900 border-b-2 border-red-500 md:border-b-2",
        "md:w-auto md:text-center"
      )}
    >
      {children}
    </Link>
  );
};

const DropdownNavLink = ({ title, currentPath, isActive, closeSheet, children }: { title: string, currentPath: string, isActive: boolean, closeSheet: () => void, children: React.ReactNode }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button
                variant="ghost"
                className={cn(
                    "px-4 py-2 text-sm font-medium hover:bg-gray-700 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none w-full justify-start md:w-auto md:justify-center",
                    isActive && "bg-gray-900 border-b-2 border-red-500"
                )}
            >
                {title}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-gray-800 text-white border-gray-700 w-56">
            {React.Children.map(children, child =>
                React.isValidElement(child) ? React.cloneElement(child, { onClick: closeSheet } as any) : child
            )}
        </DropdownMenuContent>
    </DropdownMenu>
);

export default function Navbar({ handleLogout }: { handleLogout: () => void }) {
  const pathname = usePathname();
  const user = useUser();
  const userLevel = useUserLevel();
  const { loading } = useFirebase();
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const closeSheet = () => setIsSheetOpen(false);

  const isDataAtributActive = [
    "/data-optik", 
    "/data-dokter", 
    "/data-instansi", 
    "/data-distributor",
  ].includes(pathname);
  
  const isLaporanActive = [
    "/laporan-terjual",
    "/laporan-pemesanan",
    "/laporan-pengambilan",
    "/rekap-dokter",
    "/rekap-instansi",
    "/laporan-kas",
    "/laporan-laba-rugi",
    "/laporan-kas-pertahun",
    "/laporan-lensa-pesanan",
    "/laporan-pembayaran-sisa",
    "/laporan-utang",
    "/laporan-aset",
    "/rekap-pelanggan",
    "/data-view"
  ].includes(pathname);

  if (loading) {
    return (
        <nav className="bg-gray-800 text-white flex justify-center h-[40px]">
            <div className="flex items-center gap-4 px-4">
                <Skeleton className="h-6 w-24 bg-gray-700" />
                <Skeleton className="h-6 w-24 bg-gray-700" />
                <Skeleton className="h-6 w-24 bg-gray-700" />
                <Skeleton className="h-6 w-24 bg-gray-700" />
            </div>
        </nav>
    )
  }
  
  if (!user) {
    return null;
  }

  const kasirNavLinks = (
      <>
          <NavLink href="/" currentPath={pathname} onClick={closeSheet}>HOME PAGE</NavLink>
          <NavLink href="/transaksi-penjualan" currentPath={pathname} onClick={closeSheet}>TRANSAKSI PENJUALAN</NavLink>
          <NavLink href="/laporan-terjual" currentPath={pathname} onClick={closeSheet}>LAPORAN PENJUALAN</NavLink>
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); closeSheet(); }} className="px-4 py-2 text-sm font-medium hover:bg-gray-700 w-full text-left md:w-auto md:text-center">LOGOUT</a>
      </>
  );

  const adminNavLinks = (
      <>
          <NavLink href="/" currentPath={pathname} onClick={closeSheet}>HOME PAGE</NavLink>
          <NavLink href="/migration" currentPath={pathname} onClick={closeSheet}>MIGRASI</NavLink>
          <NavLink href="/data-pengguna" currentPath={pathname} onClick={closeSheet}>DATA PENGGUNA</NavLink>
          <DropdownNavLink title="DATA ATRIBUT" currentPath={pathname} isActive={isDataAtributActive} closeSheet={closeSheet}>
              <DropdownMenuItem asChild><Link href="/data-optik">Data Optik</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/data-dokter">Data Dokter</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/data-instansi">Data Instansi</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/data-distributor">Data Distributor</Link></DropdownMenuItem>
          </DropdownNavLink>
          <NavLink href="/transaksi-penjualan" currentPath={pathname} onClick={closeSheet}>TRANSAKSI PENJUALAN</NavLink>
          <NavLink href="/kategori-produk" currentPath={pathname} onClick={closeSheet}>KATEGORI PRODUK</NavLink>
          <NavLink href="/produk" currentPath={pathname} onClick={closeSheet}>PRODUK</NavLink>
           <DropdownNavLink title="LAP. SEMUA DATA OPTIK" currentPath={pathname} isActive={isLaporanActive} closeSheet={closeSheet}>
              <DropdownMenuItem asChild><Link href="/laporan-terjual">Laporan Terjual</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/laporan-pemesanan">Laporan Pemesanan</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/laporan-pengambilan">Laporan Pengambilan</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#">Rekap Dokter</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#">Rekap Instansi</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/laporan-kas">Laporan Kas</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/laporan-laba-rugi">Laporan Laba Rugi</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#">Laporan Kas Pertahun</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#">Laporan Lensa Pesanan</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/laporan-pembayaran-sisa">Laporan Pembayaran Sisa</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/laporan-utang">Laporan Utang</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#">Laporan Aset</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#">Rekap Pelanggan</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/data-view">Export Database</Link></DropdownMenuItem>
          </DropdownNavLink>
          <NavLink href="/setting-lensa" currentPath={pathname} onClick={closeSheet}>SETTING LENSA</NavLink>
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); closeSheet(); }} className="px-4 py-2 text-sm font-medium hover:bg-gray-700 w-full text-left md:w-auto md:text-center">LOGOUT</a>
      </>
  );

  const navContent = userLevel === 'kasir' ? kasirNavLinks : adminNavLinks;

  if (isMobile) {
      return (
          <nav className="bg-gray-800 text-white flex justify-end items-center px-4 h-14">
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <Menu />
                          <span className="sr-only">Buka menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="bg-gray-800 text-white p-0 w-64 border-gray-700">
                      <SheetHeader>
                          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col pt-12">
                          {navContent}
                      </div>
                  </SheetContent>
              </Sheet>
          </nav>
      );
  }

  return (
    <nav className="bg-gray-800 text-white flex justify-center">
      {navContent}
    </nav>
  );
}
