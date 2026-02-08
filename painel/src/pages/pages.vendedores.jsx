import React from 'react';
import { useVendorVerifications } from '../hook/hook.js';
import API from '../api/gerencia-api.js'

export default function VendorVerificationsPage() {
  const { verifications, stats, loading, error } = useVendorVerifications();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando verificações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Erro: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verificações de Vendedores</h1>
          <p className="text-gray-600 mt-1">Revise e aprove solicitações de novos vendedores</p>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatBox
            label="Pendentes"
            value={stats.pending}
            color="yellow"
          />
          <StatBox
            label="Aprovados"
            value={stats.approved}
            color="green"
          />
          <StatBox
            label="Rejeitados"
            value={stats.rejected}
            color="red"
          />
          <StatBox
            label="Taxa de Aprovação"
            value={stats.approvalRate}
            color="blue"
          />
        </div>
      )}

      {/* Lista de Verificações */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">
            Solicitações Pendentes ({verifications.length})
          </h2>
        </div>

        {verifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-4">🎉</p>
            <p>Nenhuma verificação pendente no momento!</p>
          </div>
        ) : (
          <div className="divide-y">
            {verifications.map((verification) => (
              <VerificationItem
                key={verification._id}
                verification={verification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const StatBox = ({ label, value, color, icon }) => {
  const colors = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

const VerificationItem = ({ verification }) => {
    const [downloading, setDownloading] = React.useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await API.verification.downloadVerificationPDF(verification._id);
      // Toast de sucesso (opcional)
      alert('PDF baixado com sucesso!');
    } catch (error) {
      alert('Erro ao baixar PDF: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
   <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {verification.submittedData?.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {verification.submittedData?.fullName || 'Nome não disponível'}
            </p>
            <p className="text-sm text-gray-600">
              {verification.userId?.email || 'Email não disponível'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Enviado em: {new Date(verification.submittedAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
            {verification.verificationStatus === 'pending' ? 'Pendente' : 'Em Análise'}
          </span>
          
          {/* ✅ BOTÃO DE DOWNLOAD PDF */}
          <button 
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Gerando...
              </>
            ) : (
              <>
                📄 Baixar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};