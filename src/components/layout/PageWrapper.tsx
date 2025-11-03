
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useToast } from "@/hooks/use-toast";

interface PageWrapperProps {
  children: React.ReactNode;
}

const PageWrapper = React.memo(function PageWrapper({ children }: PageWrapperProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // Call the API route to clear the session cookie
      await fetch('/api/auth/logout', { method: 'POST' });
      
      toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity.",
      });

      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Logout after 5 minutes of inactivity
  useIdleTimeout(handleLogout, 5 * 60 * 1000);


  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      <div className="no-print">
        <Header />
        <Navbar handleLogout={handleLogout} />
      </div>
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {children}
      </main>
      <Footer />
    </div>
  );
});

export default PageWrapper;
