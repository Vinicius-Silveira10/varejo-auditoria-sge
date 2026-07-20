import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { removeToken, removeUser } from '@/lib/api';
import { hasRole } from '@/lib/auth';

export default function Header({ title }: { title: string }) {
  const router = useRouter();
  const [canViewApprovals, setCanViewApprovals] = useState(false);

  useEffect(() => {
    setCanViewApprovals(hasRole('GESTOR', 'ADMIN'));
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      removeToken();
      removeUser();
      router.push('/login');
    }
  };

  return (
    <header className="bg-white shadow-sm px-6 py-4 flex flex-col sm:flex-row justify-between items-center">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        <nav className="flex gap-4">
          <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium">Recebimento</Link>
          <Link href="/putaway" className="text-gray-600 hover:text-blue-600 font-medium">Armazenagem</Link>
          {canViewApprovals && (
            <Link href="/approvals" className="text-gray-600 hover:text-blue-600 font-medium">Aprovações</Link>
          )}
        </nav>
      </div>
      <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium mt-4 sm:mt-0">Sair</button>
    </header>
  );
}
