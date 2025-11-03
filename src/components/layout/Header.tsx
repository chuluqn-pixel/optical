
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database } from "@/lib/firebase";
import { useUserLevel } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";

interface OptikData {
  nama_instansi: string;
  alamat_instansi: string;
  telpon: string;
}

const OPTIK_DOC_ID = "JXof497VgWYludHMt5Uc";

export default function Header() {
  const userLevel = useUserLevel();
  const [optikData, setOptikData] = useState<OptikData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOptikData = async () => {
      try {
        const docRef = doc(database, "migrated_data", OPTIK_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data()?.data;
          if (data && Array.isArray(data) && data.length > 0) {
            setOptikData(data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching optik data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOptikData();
  }, []);

  const displayUserLevel = userLevel ? userLevel.toUpperCase() : 'PENGGUNA';

  return (
    <header className="bg-black text-white p-4">
      {loading ? (
        <>
          <Skeleton className="h-8 w-64 bg-gray-700" />
          <Skeleton className="h-4 w-96 bg-gray-700 mt-2" />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-red-500">
            {displayUserLevel} - {optikData?.nama_instansi || "Nama Optik"}
          </h1>
          <p className="text-sm">
            {optikData?.alamat_instansi || "Alamat Optik"}, Telp: {optikData?.telpon || "-"}
          </p>
        </>
      )}
    </header>
  );
}
