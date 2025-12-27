import React from 'react';
import { useDashboard } from '../hook/hook.js';

export default function DashboardPage() {
  const { stats, activities, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Erro ao carregar dashboard: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Usuários"
          value={stats?.users.total}
          growth={stats?.users.growthRate}
        />
        <StatCard
          title="Vendedores Ativos"
          value={stats?.vendors.active}
          growth={stats?.vendors.growthRate}
        />
        <StatCard
          title="Produtos Ativos"
          value={stats?.products.active}
          growth={stats?.products.growthRate}
        />
        <StatCard
          title="Receita Mensal"
          value={stats?.financial.monthlyRevenue}
          growth={stats?.financial.growthRate}
        />
      </div>

      {/* Detalhes por Seção */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DetailCard title="Usuários">
          <DetailRow label="Total" value={stats?.users.total} />
          <DetailRow label="Verificados" value={stats?.users.verified} />
          <DetailRow label="Com Telefone" value={stats?.users.withPhone} />
        </DetailCard>

        <DetailCard title="Vendedores">
          <DetailRow label="Total" value={stats?.vendors.total} />
          <DetailRow label="Aprovados" value={stats?.vendors.approved} />
          <DetailRow label="Pendentes" value={stats?.vendors.pending} />
          <DetailRow label="Ativos" value={stats?.vendors.active} />
        </DetailCard>

        <DetailCard title="Produtos">
          <DetailRow label="Total" value={stats?.products.total} />
          <DetailRow label="Ativos" value={stats?.products.active} />
          <DetailRow label="Em Destaque" value={stats?.products.featured} />
        </DetailCard>
      </div>

      {/* Atividades Recentes */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Atividades Recentes</h2>
        <div className="space-y-3">
          {activities && activities.length > 0 ? (
            activities.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhuma atividade recente</p>
          )}
        </div>
      </div>
    </div>
  );
}


const StatCard = ({ title, value, growth, icon, color }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600 font-medium">{title}</span>
        <div className={`w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-full flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value || 0}</p>
      {growth && (
        <p className="text-xs text-green-600 font-semibold">{growth}</p>
      )}
    </div>
  );
};

const DetailCard = ({ title, icon, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-5">
    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <span className="text-xl">{icon}</span> {title}
    </h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-sm text-gray-600">{label}:</span>
    <span className="text-sm font-semibold text-gray-900">{value || 0}</span>
  </div>
);

const ActivityItem = ({ activity }) => (
  <div className="flex items-center gap-3 py-3 border-b last:border-b-0 hover:bg-gray-50 rounded-lg px-2 transition-colors">
    <span className="text-2xl">{activity.icon}</span>
    <div className="flex-1">
      <p className="text-sm text-gray-900">
        <span className="font-semibold">{activity.user}</span> {activity.action}
      </p>
      <p className="text-xs text-gray-500">
        {new Date(activity.time).toLocaleString('pt-BR')}
      </p>
    </div>
  </div>
);