/**
 * ============================================
 * CLARA OS
 * Layout Module
 * --------------------------------------------
 * File : MainLayout.tsx
 * Responsibility :
 * Main application layout.
 *
 * Sidebar (fixed)
 * Header
 * Main workspace
 * ============================================
 */

import type { ReactNode } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="ml-72 flex min-h-screen flex-col">
        {/* Top header */}
        <Header />

        {/* Workspace */}
        <main className="relative flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}