import Header from "./Header";
import Sidebar from "./Sidebar";

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Zone principale */}
      <div className="ml-72 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}