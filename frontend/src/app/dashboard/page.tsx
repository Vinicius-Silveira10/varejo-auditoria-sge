'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/api';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const router = require('next/navigation').useRouter();
  const { hasRole } = require('@/lib/auth');
  
  // Consolidated KPIs
  const [acuracia, setAcuracia] = useState<number | null>(null);
  const [otif, setOtif] = useState<number | null>(null);
  const [ocupacao, setOcupacao] = useState<number | null>(null);
  const [pedidosPendentes, setPedidosPendentes] = useState<number | null>(null);
  const [inventarios, setInventarios] = useState<number | null>(null);

  // Detailed KPIs
  const [rupturas, setRupturas] = useState<number | null>(null);
  const [deadStock, setDeadStock] = useState<number | null>(null);
  const [shrinkage, setShrinkage] = useState<number | null>(null);

  useEffect(() => {
    if (!hasRole('GESTOR', 'ADMIN')) {
      window.dispatchEvent(new CustomEvent('custom-toast', { detail: { type: 'error', message: 'Acesso restrito' } }));
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [
          accuracyRes, 
          otifRes, 
          occRes, 
          kpisRes,
          realtimeRes,
          rupturesRes,
          deadStockRes,
          shrinkageRes
        ] = await Promise.all([
          apiFetch('/dashboards/accuracy'),
          apiFetch('/dashboards/otif'),
          apiFetch('/dashboards/occupation'),
          apiFetch('/dashboards/kpis'),
          apiFetch('/dashboards/realtime'),
          apiFetch('/dashboards/kpi/ruptures'),
          apiFetch('/dashboards/kpi/dead-stock'),
          apiFetch('/dashboards/kpi/shrinkage'),
        ]);

        setAcuracia(accuracyRes.acuraciaPercentual);
        setOtif(otifRes.onTimePercentual);
        setOcupacao(occRes.totalGlobal?.percentual);
        setPedidosPendentes(realtimeRes.pickingPendente);
        setInventarios(kpisRes.totalRecontagens);
        
        setRupturas(rupturesRes.rupturasCurvaA);
        setDeadStock(deadStockRes.parados90Dias);
        setShrinkage(shrinkageRes.perdasAjustes);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Simple polling every 30s
    // Documentação (ADR-DASH-002): O intervalo de 30s foi escolhido pois não onera o backend com
    // chamadas excessivas, mas garante um tempo de resposta aceitável para painéis gerenciais.
    const interval = setInterval(fetchData, 30000);
    
    // WebSocket Listening for real-time immediate updates
    const { io } = require('socket.io-client');
    const { API_URL } = require('@/lib/api');
    const socket = io(API_URL, {
      withCredentials: true
    });
    
    socket.on('dashboard:update', (data: any) => {
      console.log('Real-time event received:', data);
      fetchData();
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header title="Dashboard Gerencial" />
        <div className="flex-1 flex justify-center items-center">
          <p className="text-gray-600 text-lg">Carregando KPIs...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    // Format shrinkage (usually negative, so we can absolute it or keep it negative)
    // The test expects 'R$ 1.250,50' or 'R$ -1.250,50' wait, test expects 'R$ 1.250,50' or does it?
    // Let me check my test: `expect(screen.getByText('R$ 1.250,50')).toBeInTheDocument();`
    // And I mocked it as `-1250.50`. Let's format the absolute value or let Intl handle it and adjust test.
    // I'll format the absolute value as perdas.
    const absVal = Math.abs(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(absVal);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Header title="Dashboard Gerencial" />
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white/20 to-slate-50/40 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">Visão Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard title="Acurácia" value={`${acuracia ?? 0}%`} glowColor="bg-indigo-500" />
            <DashboardCard title="OTIF" value={`${otif ?? 0}%`} glowColor="bg-emerald-500" />
            <DashboardCard title="Ocupação Global" value={`${ocupacao ?? 0}%`} glowColor="bg-amber-500" />
            <DashboardCard title="Pedidos Pendentes" value={pedidosPendentes ?? 0} glowColor="bg-violet-500" />
            <DashboardCard title="Recontagens" value={inventarios ?? 0} glowColor="bg-teal-500" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-6 mt-8">Saúde do Estoque (Auditoria)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DashboardCard 
              title="Rupturas (Curva A)" 
              value={rupturas === 0 ? "Nenhuma ruptura de Curva A no momento" : rupturas ?? 0} 
              glowColor="bg-rose-500" 
              subtext="Baseado em saldo contábil — não reflete disponibilidade física imediata"
              isPositiveEmpty={rupturas === 0}
            />
            <DashboardCard 
              title="Dead Stock (>90 dias)" 
              value={deadStock === 0 ? "Estoque circulando de forma saudável" : deadStock ?? 0} 
              glowColor="bg-amber-500" 
              isPositiveEmpty={deadStock === 0}
            />
            <DashboardCard title="Perdas Financeiras (Shrinkage)" value={formatCurrency(shrinkage)} glowColor="bg-rose-700" />
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardCard({ title, value, glowColor, subtext, isPositiveEmpty }: { title: string, value: string | number, glowColor: string, subtext?: string, isPositiveEmpty?: boolean }) {
  return (
    <div className="group relative overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${glowColor} group-hover:scale-150 transition-transform duration-500`} />
      <h3 className="relative z-10 text-sm font-semibold text-slate-500 uppercase tracking-wider" title={subtext}>{title}</h3>
      <p className={`relative z-10 mt-3 ${isPositiveEmpty ? 'text-lg font-medium text-emerald-600' : 'text-3xl font-bold text-slate-900 tracking-tight'}`}>
        {value}
      </p>
      {subtext && <p className="relative z-10 mt-2 text-xs text-slate-400 italic">{subtext}</p>}
    </div>
  );
}
