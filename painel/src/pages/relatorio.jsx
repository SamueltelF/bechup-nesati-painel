

import React from 'react';
import { useReports } from '../hook/hook.js';

export default function ReportsPage() {
  const { productsReport, generalReport, loading, error, reload } = useReports();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Erro ao carregar relatórios: {error}
          <button onClick={reload} className="ml-4 underline">Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-600">Análises completas do sistema</p>
        </div>
        <button
          onClick={reload}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Atualizar
        </button>
      </div>

      {/* Relatório de Produtos */}
      <ProductsReportSection report={productsReport} />

      {/* Relatório Geral */}
      <GeneralReportSection report={generalReport} />
    </div>
  );
}


function ProductsReportSection({ report }) {
  if (!report) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
         Relatório de Produtos
      </h2>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total" value={report.summary.total} color="gray" />
        <SummaryCard label="Ativos" value={report.summary.active} color="green" />
        <SummaryCard label="Inativos" value={report.summary.inactive} color="red" />
        <SummaryCard label="Em Destaque" value={report.summary.featured} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Por Categoria */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Por Categoria</h3>
          <div className="space-y-2">
            {report.byCategory.map((category, index) => (
              <CategoryBar
                key={index}
                label={category._id || 'Sem Categoria'}
                count={category.count}
                total={report.summary.total}
              />
            ))}
          </div>
        </div>

        {/* Por Tipo */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Por Tipo</h3>
          <div className="space-y-2">
            {report.byType.map((type, index) => (
              <CategoryBar
                key={index}
                label={type._id || 'Sem Tipo'}
                count={type.count}
                total={report.summary.total}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function GeneralReportSection({ report }) {
  if (!report) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        Relatório Geral do Sistema
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Usuários */}
        <ReportCard title="Usuários"  data={report.users}>
          <DataRow label="Total" value={report.users.total} />
          <DataRow label="Email Verificado" value={report.users.emailVerified} />
          <DataRow label="Telefone Verificado" value={report.users.phoneVerified} />
          <DataRow 
            label="Taxa de Verificação" 
            value={report.users.verificationRate} 
            highlight 
          />
        </ReportCard>

        {/* Vendedores */}
        <ReportCard title="Vendedores"  data={report.vendors}>
          <DataRow label="Total" value={report.vendors.total} />
          <DataRow label="Aprovados" value={report.vendors.approved} />
          <DataRow label="Ativos" value={report.vendors.active} />
          <DataRow 
            label="Taxa de Aprovação" 
            value={report.vendors.approvalRate} 
            highlight 
          />
        </ReportCard>

        {/* Produtos */}
        <ReportCard title="Produtos"  data={report.products}>
          <DataRow label="Total" value={report.products.total} />
          <DataRow label="Ativos" value={report.products.active} />
          <DataRow 
            label="Taxa de Ativação" 
            value={report.products.activeRate} 
            highlight 
          />
        </ReportCard>

        {/* Financeiro */}
        <ReportCard title="Financeiro"  data={report.financial}>
          <DataRow 
            label="Saldo Total" 
            value={`R$ ${(report.financial.totalBalance / 100).toFixed(2)}`} 
          />
          <DataRow 
            label="Ganhos Totais" 
            value={`R$ ${(report.financial.totalEarnings / 100).toFixed(2)}`} 
          />
          <DataRow 
            label="Saques Pendentes" 
            value={`R$ ${(report.financial.pendingWithdrawals / 100).toFixed(2)}`} 
            highlight 
          />
        </ReportCard>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

const SummaryCard = ({ label, value, color }) => {
  const colors = {
    gray: 'bg-gray-50 border-gray-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    purple: 'bg-purple-50 border-purple-200'
  };

  return (
    <div className={`${colors[color]} border rounded-lg p-4 text-center`}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

const CategoryBar = ({ label, count, total }) => {
  const percentage = ((count / total) * 100).toFixed(1);

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className="text-sm font-semibold text-gray-600">{count}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{percentage}% do total</p>
    </div>
  );
};

const ReportCard = ({ title, icon, children }) => (
  <div className="border border-gray-200 rounded-lg p-5">
    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <span className="text-xl">{icon}</span> {title}
    </h3>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const DataRow = ({ label, value, highlight }) => (
  <div className={`flex justify-between items-center py-2 ${highlight ? 'border-t border-gray-200 pt-3 mt-2' : ''}`}>
    <span className="text-sm text-gray-600">{label}:</span>
    <span className={`text-sm font-semibold ${highlight ? 'text-green-600 text-base' : 'text-gray-900'}`}>
      {value}
    </span>
  </div>
);