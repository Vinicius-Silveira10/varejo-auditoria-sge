'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/api';

export default function RegisterCountPage() {
  const [contagemId, setContagemId] = useState('');
  const [quantidadeFisica, setQuantidadeFisica] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contagemId || !quantidadeFisica) {
      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'error', message: 'Por favor, informe o ID da Contagem e a Quantidade Física.' }
      }));
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/inventory/register', {
        method: 'POST',
        body: JSON.stringify({
          contagemId: parseInt(contagemId, 10),
          quantidadeFisica: parseInt(quantidadeFisica, 10),
        }),
      });
      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'success', message: 'Contagem registrada com sucesso!' }
      }));
      setContagemId('');
      setQuantidadeFisica('');
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'error', message: error.message || 'Erro ao registrar contagem' }
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white/20 to-slate-50/40 pointer-events-none" />
      <Header title="Registrar Contagem" />
      <main className="flex-1 p-4 md:p-12 relative z-10">
        <div className="max-w-xl mx-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100 p-6 md:p-10">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-8">Registrar Contagem Física</h2>
            
            <form onSubmit={handleRegisterCount} className="space-y-6">
              <div>
                <label htmlFor="contagemId" className="block text-sm font-semibold text-slate-700 mb-2">
                  ID da Contagem <span className="font-normal text-slate-500">(fornecido pelo Gestor)</span>
                </label>
                <input
                  id="contagemId"
                  type="number"
                  min="1"
                  required
                  value={contagemId}
                  onChange={(e) => setContagemId(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 bg-white/50 backdrop-blur-sm text-lg"
                  placeholder="Ex: 5"
                />
              </div>

              <div>
                <label htmlFor="quantidadeFisica" className="block text-sm font-semibold text-slate-700 mb-2">
                  Quantidade Física Encontrada
                </label>
                <input
                  id="quantidadeFisica"
                  type="number"
                  min="0"
                  required
                  value={quantidadeFisica}
                  onChange={(e) => setQuantidadeFisica(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 bg-white/50 backdrop-blur-sm text-lg"
                  placeholder="Ex: 495"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registrando...
                    </>
                  ) : (
                    'Registrar Contagem'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
