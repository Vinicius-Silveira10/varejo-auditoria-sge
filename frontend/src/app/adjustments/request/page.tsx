'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/api';

export default function RequestAdjustmentPage() {
  const [numeroLote, setNumeroLote] = useState('');
  const [quantidadeDelta, setQuantidadeDelta] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // 1. Busca o lote pelo numeroLote
      if (!numeroLote) {
        throw new Error('Informe o número do lote (etiqueta física).');
      }

      let loteId: number;
      try {
        const batchResponse = await apiFetch(`/batches/number/${numeroLote}`);
        if (!batchResponse.data) {
          throw new Error(`Lote não encontrado no sistema para a etiqueta ${numeroLote}`);
        }
        loteId = batchResponse.data.id;
      } catch (err: any) {
        throw new Error(err.message || 'Lote não encontrado.');
      }

      // 2. Solicita o ajuste
      const requestResponse = await apiFetch('/adjustments/request', {
        method: 'POST',
        body: JSON.stringify({
          loteId,
          quantidadeDelta: Number(quantidadeDelta),
          motivo,
        }),
      });

      const nivel = requestResponse.nivelAprovacaoExigido === 'GESTOR_CONTROLADORIA' 
        ? 'ADMIN/CONTROLADORIA' 
        : 'GESTOR';

      // 3. Sucesso
      setSuccessMsg(`Ajuste solicitado com sucesso. Requer aprovação de: ${nivel}`);
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { type: 'success', message: `Solicitação enviada. Requer aprovação de: ${nivel}` },
        })
      );
      setNumeroLote('');
      setQuantidadeDelta('');
      setMotivo('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar solicitação de ajuste.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="SGE Fortal - Solicitar Ajuste de Estoque" />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Novo Ajuste</h2>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
              <p className="font-medium">Erro na Solicitação</p>
              <p className="text-sm mt-1">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-md">
              <p className="font-medium">Sucesso</p>
              <p className="text-sm mt-1">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número do Lote (Etiqueta)
              </label>
              <input
                type="text"
                value={numeroLote}
                onChange={(e) => setNumeroLote(e.target.value)}
                placeholder="Ex: L-12345"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Leia o código de barras ou digite o texto exato impresso na etiqueta.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade (Delta)
              </label>
              <input
                type="number"
                value={quantidadeDelta}
                onChange={(e) => setQuantidadeDelta(e.target.value)}
                placeholder="Ex: -5 para perdas ou +10 para sobras"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Para subtrair do estoque, utilize sinal negativo (ex: -2).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo do Ajuste
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Justifique o motivo da discrepância no estoque..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors shadow-sm"
              >
                {loading ? 'Processando...' : 'Solicitar Ajuste'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
