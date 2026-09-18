import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { removeUser, apiFetch } from '@/lib/api';
import { hasRole } from '@/lib/auth';

export default function Header({ title }: { title: string }) {
  const router = useRouter();
  const canViewApprovals = hasRole('GESTOR', 'ADMIN', 'CONTROLADORIA');
  const canRequestAdjustment = hasRole('OPERADOR', 'GESTOR', 'ADMIN');
  const canViewInventory = hasRole('GESTOR', 'ADMIN');
  const canViewCount = hasRole('OPERADOR', 'GESTOR', 'ADMIN');
  const canViewDashboard = hasRole('GESTOR', 'ADMIN');
  const canViewPicking = hasRole('OPERADOR', 'GESTOR', 'ADMIN');

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } catch {
        // Silencia erro no logout
      }
      removeUser();
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/50 shadow-sm px-6 py-4 flex flex-col sm:flex-row justify-between items-center transition-all duration-300">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
        <nav className="flex flex-wrap justify-center sm:justify-start gap-4">
          <Link href="/" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Recebimento</Link>
          <Link href="/putaway" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Armazenagem</Link>
          {canRequestAdjustment && (
            <Link href="/adjustments/request" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Solicitar Ajuste</Link>
          )}
          {canViewPicking && (
            <Link href="/picking" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Picking</Link>
          )}
          {canViewApprovals && (
            <Link href="/approvals" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Aprovações</Link>
          )}
          {canViewInventory && (
            <>
              <Link href="/inventory" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Inventário</Link>
              <Link href="/inventory/reports" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Relatórios</Link>
            </>
          )}
          {canViewCount && (
            <Link href="/inventory/register" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Contagem</Link>
          )}
          {canViewDashboard && (
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2 py-1 rounded-md transition-colors font-medium">Dashboard</Link>
          )}
        </nav>
      </div>
      <button onClick={handleLogout} className="text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-lg font-medium transition-colors mt-4 sm:mt-0 shadow-sm border border-rose-100">Sair</button>
    </header>
  );
}
