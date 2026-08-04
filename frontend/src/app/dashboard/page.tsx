'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import api from '@/lib/api';

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
          api.get('/dashboards/accuracy'),
          api.get('/dashboards/otif'),
          api.get('/dashboards/occupation'),
          api.get('/dashboards/kpis'),
          api.get('/dashboards/realtime'),
          api.get('/dashboards/kpi/ruptures'),
          api.get('/dashboards/kpi/dead-stock'),
          api.get('/dashboards/kpi/shrinkage'),
        ]);

        setAcuracia(accuracyRes.data.acuraciaPercentual);
        setOtif(otifRes.data.onTimePercentual);
        setOcupacao(occRes.data.totalGlobal?.percentual);
        setPedidosPendentes(realtimeRes.data.pickingPendente);
        setInventarios(kpisRes.data.totalRecontagens);
        
        setRupturas(rupturesRes.data.rupturasCurvaA);
        setDeadStock(deadStockRes.data.parados90Dias);
        setShrinkage(shrinkageRes.data.perdasAjustes);
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
    return () => clearInterval(interval);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Dashboard Gerencial" />
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Visão Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard title="Acurácia" value={`${acuracia ?? 0}%`} color="border-blue-500" />
          <DashboardCard title="OTIF" value={`${otif ?? 0}%`} color="border-green-500" />
          <DashboardCard title="Ocupação Global" value={`${ocupacao ?? 0}%`} color="border-orange-500" />
          <DashboardCard title="Pedidos Pendentes" value={pedidosPendentes ?? 0} color="border-purple-500" />
          <DashboardCard title="Recontagens" value={inventarios ?? 0} color="border-teal-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-6 mt-8">Saúde do Estoque (Auditoria)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TODO(UX): Trocar title nativo HTML por tooltip acessível ou ícone (ⓘ) interativo no futuro para melhor legibilidade em touch screens */}
          <DashboardCard 
            title="Rupturas (Curva A)" 
            value={rupturas === 0 ? "Nenhuma ruptura de Curva A no momento" : rupturas ?? 0} 
            color="border-red-500" 
            subtext="Baseado em saldo contábil — não reflete disponibilidade física imediata"
            isPositiveEmpty={rupturas === 0}
          />
          <DashboardCard 
            title="Dead Stock (>90 dias)" 
            value={deadStock === 0 ? "Estoque circulando de forma saudável" : deadStock ?? 0} 
            color="border-yellow-500" 
            isPositiveEmpty={deadStock === 0}
          />
          <DashboardCard title="Perdas Financeiras (Shrinkage)" value={formatCurrency(shrinkage)} color="border-red-700" />
        </div>
      </main>
    </div>
  );
}

function DashboardCard({ title, value, color, subtext, isPositiveEmpty }: { title: string, value: string | number, color: string, subtext?: string, isPositiveEmpty?: boolean }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider" title={subtext}>{title}</h3>
      <p className={`mt-2 ${isPositiveEmpty ? 'text-lg font-medium text-green-600' : 'text-3xl font-bold text-gray-900'}`}>
        {value}
      </p>
      {subtext && <p className="mt-2 text-xs text-gray-400 italic">{subtext}</p>}
    </div>
  );
}
