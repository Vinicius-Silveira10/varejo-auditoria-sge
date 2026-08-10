'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
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
    const user = getUser();
    if (!user) {
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
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Header title="SGE Fortal - Armazenagem" />
      
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white/20 to-slate-50/40 pointer-events-none" />
        <div className="relative z-10">
        {!selectedBatch ? (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-6">Lotes Pendentes de Armazenagem</h2>
            
            {pendingBatches.length === 0 ? (
              <p className="text-slate-500">Nenhum lote pendente de armazenagem.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Lote</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendente</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pendingBatches.map((batch) => (
                      <tr key={batch.loteId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{batch.numeroLote}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{batch.produtoDescricao} <span className="text-slate-400">({batch.produtoSku})</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{batch.quantidadePendente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleSelectBatch(batch)}
                            className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
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
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100 p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-6">Efetivar Armazenagem (Putaway)</h2>
            
            <div className="mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <p className="text-sm text-indigo-900 space-y-1">
                <span className="block"><strong>Lote:</strong> {selectedBatch.numeroLote}</span>
                <span className="block"><strong>Produto:</strong> {selectedBatch.produtoDescricao}</span>
                <span className="block"><strong>Quantidade Pendente:</strong> {selectedBatch.quantidadePendente}</span>
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 rounded-lg">
                <p className="font-semibold">Erro na Armazenagem</p>
                <p className="text-sm mt-1">{errorMsg}</p>
              </div>
            )}

            {suggestions.length === 0 && aviso && (
              <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded-lg">
                <p className="font-semibold">Atenção (Sem sugestões automáticas)</p>
                <p className="text-sm mt-1">{aviso}</p>
                <p className="text-xs mt-2 text-amber-700/80">Você pode prosseguir manualmente por sua conta e risco (digitando o ID de um endereço), ciente do aviso, ou cancelar a operação.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Endereço Destino (ID)</label>
                  {suggestions.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={enderecoDestinoId}
                        onChange={(e) => setEnderecoDestinoId(e.target.value)}
                        required
                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors"
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
                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
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
                      className="block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedBatch.quantidadePendente}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleCancelSelection}
                  className="flex-1 flex justify-center py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !enderecoDestinoId || !quantidade}
                  className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-all active:scale-95"
                >
                  {loading ? 'Processando...' : 'Confirmar Armazenagem'}
                </button>
              </div>
            </form>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
