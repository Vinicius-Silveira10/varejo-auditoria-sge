'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/api';
import { hasRole } from '@/lib/auth';

interface Lote {
  numeroLote: string;
  produto: {
    sku: string;
    descricao: string;
  };
}

interface Ajuste {
  id: number;
  loteId: number;
  quantidadeDelta: number;
  motivo: string;
  valorDelta: number;
  statusAprovacao: string;
  solicitanteId: number;
  criadoEm: string;
  lote: Lote;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('PENDENTE');

  useEffect(() => {
    // Client-side RBAC Guard (UX Only)
    if (!hasRole('GESTOR', 'ADMIN')) {
      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'error', message: 'Acesso negado. Apenas gestores e administradores podem acessar esta página.' }
      }));
      router.push('/');
      return;
    }
    fetchAjustes();
  }, [router, filtroStatus]);

  const fetchAjustes = async () => {
    setLoading(true);
    try {
      const query = filtroStatus ? `?status=${filtroStatus}` : '';
      const response = await apiFetch(`/adjustments/pending${query}`);
      
      if (response.ok) {
        setAjustes(response.data);
      } else {
        showError(response);
      }
    } catch (err: any) {
      showToast('error', 'Erro de conexão ao carregar ajustes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (ajusteId: number, aprovado: boolean) => {
    try {
      const response = await apiFetch('/adjustments/approve', {
        method: 'POST',
        body: JSON.stringify({ ajusteId, aprovado })
      });

      if (response.ok) {
        showToast('success', `Ajuste ${aprovado ? 'aprovado' : 'rejeitado'} com sucesso!`);
        fetchAjustes();
      } else {
        showError(response);
      }
    } catch (err: any) {
      showToast('error', 'Erro de conexão ao processar ajuste.');
    }
  };

  const showError = (response: any) => {
    const status = response.status;
    const msg = response.data?.message || 'Erro desconhecido';
    
    if (status === 401) {
      showToast('error', 'Sessão expirada. Faça login novamente.');
    } else if (status === 403) {
      showToast('error', 'Você não tem permissão para realizar esta ação.');
    } else if (status === 409) {
      showToast('error', 'Conflito: Este ajuste já foi processado por outra pessoa.');
      fetchAjustes(); // Reload to remove from list
    } else if (status === 400) {
      showToast('error', `Erro de validação: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } else {
      showToast('error', `Erro ${status}: ${msg}`);
    }
  };

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    window.dispatchEvent(new CustomEvent('custom-toast', { detail: { type, message } }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header title="SGE Fortal - Aprovações de Ajuste" />
      
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800">Painel de Aprovações</h2>
          
          <select 
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
          >
            <option value="PENDENTE">Pendentes</option>
            <option value="APROVADO">Aprovados</option>
            <option value="REJEITADO">Rejeitados</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando ajustes...</div>
          ) : ajustes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum ajuste encontrado para o status: <span className="font-semibold">{filtroStatus}</span>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Delta Qtd</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Delta R$</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ajustes.map((ajuste) => (
                    <tr key={ajuste.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{ajuste.lote.produto.sku}</div>
                        <div className="text-sm text-gray-500">{ajuste.lote.produto.descricao}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ajuste.lote.numeroLote}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(ajuste.criadoEm).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={ajuste.motivo}>
                        {ajuste.motivo}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${ajuste.quantidadeDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {ajuste.quantidadeDelta > 0 ? '+' : ''}{ajuste.quantidadeDelta}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${ajuste.valorDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {Math.abs(ajuste.valorDelta).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {ajuste.statusAprovacao === 'PENDENTE' ? (
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => handleAction(ajuste.id, true)}
                              className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md transition-colors"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleAction(ajuste.id, false)}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                            >
                              Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${ajuste.statusAprovacao === 'APROVADO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {ajuste.statusAprovacao}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
