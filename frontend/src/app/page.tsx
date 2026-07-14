'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';
import Header from '@/components/Header';
export default function ReceiveBatchPage() {
  const router = useRouter();
  
  // State for form fields
  const [produtoId, setProdutoId] = useState('');
  const [numeroLote, setNumeroLote] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [custoAquisicao, setCustoAquisicao] = useState('');
  const [validade, setValidade] = useState('');
  const [justificativa, setJustificativa] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Socket
  useEffect(() => {
    // Basic Auth Check
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const socket: Socket = io(API_URL);
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket for real-time events');
    });

    socket.on('dashboard:update', (data) => {
      if (data.type === 'batch:received') {
        window.dispatchEvent(new CustomEvent('custom-toast', {
          detail: { type: 'success', message: 'Lote confirmado e evento WebSocket recebido!' }
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        produtoId: parseInt(produtoId, 10),
        numeroLote,
        quantidade: parseInt(quantidade, 10),
        custoAquisicao: parseFloat(custoAquisicao),
        validade: validade || undefined,
        evidenciaUrl: justificativa || undefined // Usando evidenciaUrl temporariamente para Justificativa
      };

      await apiFetch('/batches', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Se a chamada for 2xx, limpamos o formulário
      setProdutoId('');
      setNumeroLote('');
      setQuantidade('');
      setCustoAquisicao('');
      setValidade('');
      setJustificativa('');

      window.dispatchEvent(new CustomEvent('custom-toast', {
        detail: { type: 'success', message: 'Lote recebido com sucesso no sistema (HTTP).' }
      }));
      
    } catch (err: any) {
      if (err.message !== 'Sessão expirada' && err.message !== 'Rate limit atingido') {
        setErrorMsg(err.message || 'Erro ao registrar o recebimento do lote.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="SGE Fortal - Recebimento" />
      
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Registrar Novo Lote</h2>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
              <p className="font-medium">Erro de Validação</p>
              <p className="text-sm mt-1">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID do Produto</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={produtoId}
                  onChange={(e) => setProdutoId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: 101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Número do Lote</label>
                <input
                  type="text"
                  required
                  value={numeroLote}
                  onChange={(e) => setNumeroLote(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: LOTE-ABC-123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Quantidade Recebida</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: 50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Custo de Aquisição (R$)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={custoAquisicao}
                  onChange={(e) => setCustoAquisicao(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: 25.50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Data de Validade <span className="text-gray-400 font-normal">(Obrigatório p/ Perecíveis)</span>
                </label>
                <input
                  type="date"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Justificativa <span className="text-gray-400 font-normal">(Caso divirja da NF-e)</span>
              </label>
              <textarea
                rows={3}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Insira o motivo de qualquer divergência ou avaria."
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400"
              >
                {loading ? 'Processando...' : 'Confirmar Recebimento de Lote'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
