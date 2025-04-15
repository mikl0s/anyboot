'use client';

import { useEffect } from 'react';
import { Inter } from "next/font/google";
import { usePathname } from 'next/navigation';
import Header from './Header'; 
import FooterNav from './FooterNav';
import { useWizardActions, stepRoutes } from '@/store/wizardStore';

const inter = Inter({ subsets: ["latin"] });

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setCurrentStep } = useWizardActions();

  // DEV_MODE browser log
  useEffect(() => {
    // Only log in the browser
    if (typeof window !== 'undefined') {
      // Log the public dev mode flag
      console.log('DEV_MODE (client):', process.env.NEXT_PUBLIC_DEV_MODE);
    }
  }, []);

  // Synchronize store state with current path
  useEffect(() => {
    const currentRouteEntry = Object.entries(stepRoutes).find(([, route]) => route === pathname);
    if (currentRouteEntry) {
      const stepNumber = parseInt(currentRouteEntry[0], 10);
      setCurrentStep(stepNumber);
    }
    // Handle case where path doesn't match a defined step? (e.g., set to 1 or throw error)
    // For now, it will just not update the step if the path is unknown.
  }, [pathname, setCurrentStep]);

  const isLandingPage = pathname === '/';

  return (
    <body className={`${inter.className} bg-[#1a1b26] text-white min-h-screen flex flex-col p-0 m-0`}>
      <Header />
      <main className="flex-grow pt-20 pb-24 bg-[#1a1b26]">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      {!isLandingPage && <FooterNav />}
    </body>
  );
}
