'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken } from '@/lib/api';
import Header from '@/components/Header';

interface PendingPutawayBatch {
  loteId: number;
  numeroLote: string;
  produtoId: number;
  produtoSku: string;
  produtoDescricao: string;
  quantidadeTotal: number;
  quantidadePendente: number;
  validade: string | null;
}

interface Suggestion {
  enderecoId: number;
  codigo: string;
  zona: string;
  tipoZona: string;
  score: number;
}

export default function PutawayPage() {
  const router = useRouter();

  const [pendingBatches, setPendingBatches] = useState<PendingPutawayBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PendingPutawayBatch | null>(null);
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aviso, setAviso] = useState('');
  
  const [enderecoDestinoId, setEnderecoDestinoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPendingBatches = async () => {
    try {
      const response = await apiFetch('/batches/pending-putaway');
      setPendingBatches(response.data || []);
    } catch (err: any) {
      if (err.message !== 'Sessão expirada' && err.message !== 'Rate limit atingido') {
        window.dispatchEvent(new CustomEvent('custom-toast', {
          detail: { type: 'error', message: 'Erro ao buscar lotes pendentes.' }
        }));
      }
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetchPendingBatches();
  }, [router]);

  const handleSelectBatch = async (batch: PendingPutawayBatch) => {
    setSelectedBatch(batch);
    setQuantidade(batch.quantidadePendente.toString());
    setEnderecoDestinoId('');
    setSuggestions([]);
    setAviso('');
    setErrorMsg('');

    try {
      setLoading(true);
      const response = await apiFetch(`/addresses/suggest-putaway?produtoId=${batch.produtoId}&quantidade=${batch.quantidadePendente}`);
      if (response.data) {
        setSuggestions(response.data.sugestoes || []);
        setAviso(response.data.aviso || '');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao buscar sugestões de endereço.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedBatch(null);
    setSuggestions([]);
    setAviso('');
    setEnderecoDestinoId('');
    setQuantidade('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        loteId: selectedBatch.loteId,
        enderecoDestinoId: parseInt(enderecoDestinoId, 10),
        quantidade: parseInt(quantidade, 10),
      };

      await apiFetch('/addresses/putaway', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'success', message: 'Lote armazenado com sucesso.' }
      }));

      // Reload pending list via new GET call after POST success
      await fetchPendingBatches();
      handleCancelSelection();

    } catch (err: any) {
      if (err.message !== 'Sessão expirada' && err.message !== 'Rate limit atingido') {
        setErrorMsg(err.message || 'Erro ao efetivar armazenagem.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="SGE Fortal - Armazenagem" />
      
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {!selectedBatch ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Lotes Pendentes de Armazenagem</h2>
            
            {pendingBatches.length === 0 ? (
              <p className="text-gray-500">Nenhum lote pendente de armazenagem.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingBatches.map((batch) => (
                      <tr key={batch.loteId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{batch.numeroLote}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.produtoDescricao} ({batch.produtoSku})</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.quantidadePendente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleSelectBatch(batch)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Armazenar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Efetivar Armazenagem (Putaway)</h2>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Lote:</strong> {selectedBatch.numeroLote} <br/>
                <strong>Produto:</strong> {selectedBatch.produtoDescricao} <br/>
                <strong>Quantidade Pendente:</strong> {selectedBatch.quantidadePendente}
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
                <p className="font-medium">Erro na Armazenagem</p>
                <p className="text-sm mt-1">{errorMsg}</p>
              </div>
            )}

            {suggestions.length === 0 && aviso && (
              <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded-md">
                <p className="font-medium">Atenção (Sem sugestões automáticas)</p>
                <p className="text-sm mt-1">{aviso}</p>
                <p className="text-sm mt-2 font-semibold">Você pode prosseguir manualmente por sua conta e risco (digitando o ID de um endereço), ciente do aviso, ou cancelar a operação.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Endereço Destino (ID)</label>
                  {suggestions.length > 0 ? (
                    <div className="mt-1">
                      <select
                        value={enderecoDestinoId}
                        onChange={(e) => setEnderecoDestinoId(e.target.value)}
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-2"
                      >
                        <option value="" disabled>Selecione uma sugestão ou insira manualmente</option>
                        {suggestions.map((s, index) => (
                          <option key={s.enderecoId} value={s.enderecoId}>
                            Sugestão {index + 1}: {s.codigo} ({s.tipoZona})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={enderecoDestinoId}
                        onChange={(e) => setEnderecoDestinoId(e.target.value)}
                        placeholder="Ou digite o ID manualmente"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      required
                      min="1"
                      value={enderecoDestinoId}
                      onChange={(e) => setEnderecoDestinoId(e.target.value)}
                      placeholder="ID do endereço"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantidade</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedBatch.quantidadePendente}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={handleCancelSelection}
                  className="flex-1 flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !enderecoDestinoId || !quantidade}
                  className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                >
                  {loading ? 'Processando...' : 'Confirmar Armazenagem'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
