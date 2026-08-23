'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/api';

// Tipagem simplificada para UI
interface OrderItem {
  id: number;
  produtoId: number;
  quantidadeSolicitada: number;
  quantidadeSeparada: number;
}

interface Order {
  id: number;
  status: string;
  createdAt: string;
  itens: OrderItem[];
}

export default function PickingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<'LIST' | 'SEPARANDO' | 'CONFERINDO' | 'EXPEDINDO'>('LIST');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const [conferente1Id, setConferente1Id] = useState('');
  const [conferente2Id, setConferente2Id] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const dispatchToast = (type: 'success' | 'error', message: string) => {
    window.dispatchEvent(
      new CustomEvent('custom-toast', { detail: { type, message } })
    );
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/orders?status=PENDENTE&page=1&limit=20');
      setOrders(res.data || []);
    } catch (err: any) {
      dispatchToast('error', err.message || 'Erro ao buscar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const startPicking = async (order: Order) => {
    setCurrentOrder(order);
    setViewState('SEPARANDO');
    setConferente1Id('');
    setConferente2Id('');

    try {
      await apiFetch(`/orders/${order.id}/pick`, { method: 'POST' });
      setViewState('CONFERINDO');
    } catch (err: any) {
      dispatchToast('error', err.message || 'Erro ao iniciar separação');
      setCurrentOrder(null);
      setViewState('LIST');
    }
  };

  const verifyOrder = async () => {
    if (!currentOrder) return;
    if (!conferente1Id || !conferente2Id) {
      dispatchToast('error', 'Preencha os dois crachás de conferência');
      return;
    }

    try {
      await apiFetch(`/orders/${currentOrder.id}/verify`, { 
        method: 'PATCH',
        body: JSON.stringify({
          conferente1Id: Number(conferente1Id),
          conferente2Id: Number(conferente2Id)
        })
      });
      setViewState('EXPEDINDO');
      dispatchToast('success', 'Conferência concluída!');
    } catch (err: any) {
      dispatchToast('error', err.message || 'Erro na conferência');
    }
  };

  const closeOrder = async () => {
    if (!currentOrder) return;
    try {
      await apiFetch(`/orders/${currentOrder.id}/close`, { method: 'PATCH' });
      dispatchToast('success', 'Pedido fechado com sucesso!');
      setCurrentOrder(null);
      setViewState('LIST');
      fetchOrders();
    } catch (err: any) {
      dispatchToast('error', err.message || 'Erro ao fechar pedido');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Picking / Expedição" />
      <main className="max-w-5xl mx-auto p-6">
        
        {viewState === 'LIST' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Fila de Separação</h2>
            {loading ? (
              <div className="text-slate-600">Carregando pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="text-slate-600">Nenhum pedido pendente.</div>
            ) : (
              <div className="grid gap-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-slate-800">Pedido #{order.id}</h3>
                      <p className="text-sm text-slate-500">
                        Status: <span className="font-medium text-amber-600">{order.status}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => startPicking(order)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                    >
                      Iniciar Separação
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewState === 'SEPARANDO' && currentOrder && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Separando Pedido #{currentOrder.id}
            </h2>
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
            <p className="text-slate-500 mt-4 text-sm">Processando filas FEFO e reservando lotes...</p>
          </div>
        )}

        {viewState === 'CONFERINDO' && currentOrder && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Conferindo Pedido #{currentOrder.id}
            </h2>
            <p className="text-slate-600 mb-6">Insira as credenciais da dupla de conferentes (RN-EXP-003).</p>
            
            <div className="flex gap-4 mb-6">
              <input
                type="number"
                placeholder="Crachá Conferente 1"
                value={conferente1Id}
                onChange={(e) => setConferente1Id(e.target.value)}
                className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number"
                placeholder="Crachá Conferente 2"
                value={conferente2Id}
                onChange={(e) => setConferente2Id(e.target.value)}
                className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={verifyOrder}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              Finalizar Conferência
            </button>
          </div>
        )}

        {viewState === 'EXPEDINDO' && currentOrder && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Expedindo Pedido #{currentOrder.id}
            </h2>
            <p className="text-slate-600 mb-6">Todos os itens foram conferidos. Pronto para lacrar e emitir nota.</p>
            <button
              onClick={closeOrder}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Fechar Pedido
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
