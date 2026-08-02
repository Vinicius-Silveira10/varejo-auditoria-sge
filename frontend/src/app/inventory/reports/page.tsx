'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/api';

interface AccuracyReport {
  totalContagens: number;
  contagensExatas: number;
  contagensDivergentes: number;
  acuracidadePercentual: number;
}

interface ValueReport {
  totalProdutos: number;
  valorTotalEstoque: number;
  detalhes: {
    sku: string;
    quantidadeTotal: number;
    custoMedio: number;
    valorTotalProduto: number;
  }[];
}

export default function InventoryReportsPage() {
  const [accuracy, setAccuracy] = useState<AccuracyReport | null>(null);
  const [value, setValue] = useState<ValueReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const [accData, valData] = await Promise.all([
          apiFetch('/inventory/report/accuracy'),
          apiFetch('/inventory/report/value'),
        ]);
        setAccuracy(accData);
        setValue(valData);
      } catch (error: any) {
        window.dispatchEvent(new CustomEvent('custom-toast', {
          detail: { type: 'error', message: error.message || 'Erro ao carregar relatórios' }
        }));
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Relatórios de Inventário" />
      <main className="flex-1 p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 font-medium">Carregando relatórios...</p>
            </div>
          ) : (
            <>
              {/* Card de Acuracidade */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Acuracidade do Inventário</h2>
                {accuracy && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-600 font-medium mb-1">Acuracidade</p>
                      <p className="text-3xl font-bold text-blue-800">{accuracy.acuracidadePercentual.toFixed(2)}%</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-500 font-medium mb-1">Total Contagens</p>
                      <p className="text-2xl font-bold text-gray-800">{accuracy.totalContagens}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <p className="text-sm text-green-600 font-medium mb-1">Exatas</p>
                      <p className="text-2xl font-bold text-green-800">{accuracy.contagensExatas}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                      <p className="text-sm text-red-600 font-medium mb-1">Divergentes</p>
                      <p className="text-2xl font-bold text-red-800">{accuracy.contagensDivergentes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card de Valor Financeiro */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Valor Total do Estoque</h2>
                {value && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
                        <p className="text-sm text-emerald-700 font-medium mb-1">Valor Financeiro Total</p>
                        <p className="text-4xl font-bold text-emerald-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value.valorTotalEstoque)}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-500 font-medium mb-1">Produtos Únicos</p>
                        <p className="text-4xl font-bold text-gray-800">{value.totalProdutos}</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 font-semibold">SKU</th>
                            <th className="px-4 py-3 font-semibold text-right">Quantidade</th>
                            <th className="px-4 py-3 font-semibold text-right">Custo Médio</th>
                            <th className="px-4 py-3 font-semibold text-right">Valor Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {value.detalhes.map((item) => (
                            <tr key={item.sku} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-800">{item.sku}</td>
                              <td className="px-4 py-3 text-right">{item.quantidadeTotal}</td>
                              <td className="px-4 py-3 text-right">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.custoMedio)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotalProduto)}
                              </td>
                            </tr>
                          ))}
                          {value.detalhes.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                Nenhum produto encontrado no estoque.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
