'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/api';

export default function InventoryStartPage() {
  const [loteId, setLoteId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteId) {
      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'error', message: 'Por favor, informe o ID do Lote.' }
      }));
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/inventory/start', {
        method: 'POST',
        body: JSON.stringify({ loteId: parseInt(loteId, 10) }),
      });
      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'success', message: `Contagem de inventário iniciada! ID Contagem: ${response.id}` }
      }));
      setLoteId('');
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes('Este lote já está sob contagem')) {
        msg = 'Este lote já está em processo de contagem por outro usuário.';
      }
      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'error', message: msg }
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Iniciar Inventário" />
      <main className="flex-1 p-6 md:p-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Iniciar Contagem Cíclica</h2>
            
            <form onSubmit={handleStartCount} className="space-y-6">
              <div>
                <label htmlFor="loteId" className="block text-sm font-medium text-gray-700 mb-2">
                  ID do Lote a ser inventariado
                </label>
                <input
                  id="loteId"
                  type="number"
                  min="1"
                  required
                  value={loteId}
                  onChange={(e) => setLoteId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900"
                  placeholder="Ex: 1045"
                />
                <p className="mt-2 text-sm text-gray-500">
                  A quantidade do lote será ocultada para garantir a confiabilidade da contagem.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando...
                  </>
                ) : (
                  'Iniciar Contagem'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
