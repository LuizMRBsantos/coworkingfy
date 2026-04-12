import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coworkingfy — Prestador",
};

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900 tracking-tight">Coworkingfy</p>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
