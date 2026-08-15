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
      <div className="ml-72 flex h-screen flex-col overflow-hidden">
        {/* Top header */}
        <Header />

        {/* Workspace */}
        <main className="relative flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}