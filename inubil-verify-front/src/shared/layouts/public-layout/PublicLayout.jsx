import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-primary text-white px-6 py-4 flex items-center gap-4 shadow-md">
        <img src="/images/logo_inubil_verify.png" alt="INUBIL Verify" className="h-10" />
        <span className="text-lg font-bold tracking-wide">INUBIL Verify</span>
      </header>
      <main className="max-w-container mx-auto px-6 py-10">
        <Outlet /> {/* Les pages enfants s'injecteront ici */}
      </main>
    </div>
  );
}