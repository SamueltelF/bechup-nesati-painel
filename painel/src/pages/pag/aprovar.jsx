import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Phone, CreditCard, Calendar, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import API from '../api/gerencia-api.js';

export default function VendorApprovalPage() {
  const [searchType, setSearchType] = useState('name'); // name, cpf, email, phone
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ============================================
  // BUSCAR SUGESTÕES (DEBOUNCE)
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchVendors(searchQuery);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchType]);

  const searchVendors = async (query) => {
    setLoading(true);
    try {
      const response = await API.verification.searchVendors(searchType, query);
      setSuggestions(response.vendors || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar:', error);
      setSuggestions([]);
      alert('Erro ao buscar vendedores');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SELECIONAR VENDEDOR
  // ============================================
  const handleSelectVendor = async (vendorId) => {
    setLoading(true);
    setShowSuggestions(false);
    try {
      const response = await API.verification.getVendorDetails(vendorId);
      setSelectedVendor(response.vendor);
      setSearchQuery('');
      setSuggestions([]);
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao carregar detalhes do vendedor');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // APROVAR VENDEDOR
  // ============================================
  const handleApprove = async () => {
    if (!selectedVendor) return;

    const confirmApprove = window.confirm(
      `Tem certeza que deseja APROVAR ${selectedVendor.submittedData?.fullName}?`
    );

    if (!confirmApprove) return;

    setActionLoading(true);
    try {
      await API.verification.approveVendor(selectedVendor._id);
      alert('Vendedor aprovado com sucesso!');
      setSelectedVendor(null);
    } catch (error) {
      console.error('Erro:', error);
      alert(error.message || 'Erro ao aprovar vendedor');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // REJEITAR VENDEDOR
  // ============================================
  const handleReject = async () => {
    if (!selectedVendor) return;

    const reason = window.prompt(
      `Por que você está rejeitando ${selectedVendor.submittedData?.fullName}?\n\n(Digite o motivo):`
    );

    if (!reason || reason.trim() === '') {
      alert('É necessário informar um motivo para rejeição');
      return;
    }

    setActionLoading(true);
    try {
      await API.verification.rejectVendor(selectedVendor._id, reason.trim());
      alert('Vendedor rejeitado. Email de notificação enviado.');
      setSelectedVendor(null);
    } catch (error) {
      console.error('Erro:', error);
      alert(error.message || 'Erro ao rejeitar vendedor');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // LIMPAR SELEÇÃO
  // ============================================
  const clearSelection = () => {
    setSelectedVendor(null);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Aprovar Vendedores</h1>
        <p className="text-gray-600 mt-1">
          Busque e aprove/rejeite solicitações de vendedores
        </p>
      </div>

      {/* ============================================ */}
      {/* BUSCA */}
      {/* ============================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Buscar Vendedor</h2>

        {/* Seletor de Tipo de Busca */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <button
            onClick={() => setSearchType('name')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              searchType === 'name'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="font-semibold">Nome</span>
          </button>

          <button
            onClick={() => setSearchType('cpf')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              searchType === 'cpf'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="font-semibold">CPF</span>
          </button>

          <button
            onClick={() => setSearchType('email')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              searchType === 'email'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Mail className="w-5 h-5" />
            <span className="font-semibold">Email</span>
          </button>

          <button
            onClick={() => setSearchType('phone')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              searchType === 'phone'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Phone className="w-5 h-5" />
            <span className="font-semibold">Telefone</span>
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Digite o ${
                searchType === 'name' ? 'nome' :
                searchType === 'cpf' ? 'CPF' :
                searchType === 'email' ? 'email' : 'telefone'
              } do vendedor...`}
              className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
            {loading && (
              <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />
            )}
          </div>

          {/* Sugestões */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {suggestions.map((vendor) => (
                <button
                  key={vendor._id}
                  onClick={() => handleSelectVendor(vendor._id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {vendor.submittedData?.fullName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {vendor.submittedData?.fullName || 'Nome não disponível'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {vendor.userId?.email || 'Email não disponível'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          vendor.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          vendor.verificationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {vendor.verificationStatus === 'pending' ? 'Pendente' :
                           vendor.verificationStatus === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(vendor.submittedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Sem Resultados */}
          {showSuggestions && suggestions.length === 0 && !loading && searchQuery.length >= 2 && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
              Nenhum vendedor encontrado
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* DETALHES DO VENDEDOR SELECIONADO */}
      {/* ============================================ */}
      {selectedVendor && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl font-bold">
                  {selectedVendor.submittedData?.fullName?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedVendor.submittedData?.fullName || 'Nome não disponível'}
                  </h2>
                  <p className="text-purple-100">
                    {selectedVendor.submittedData?.displayName || selectedVendor.submittedData?.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
              >
                ✕ Fechar
              </button>
            </div>
          </div>

          {/* Dados Básicos */}
          <div className="p-6 space-y-6">
            {/* Status Atual */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Status:</span>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                selectedVendor.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                selectedVendor.verificationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                selectedVendor.verificationStatus === 'under_review' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {selectedVendor.verificationStatus === 'pending' ? 'Pendente' :
                 selectedVendor.verificationStatus === 'approved' ? 'Aprovado' :
                 selectedVendor.verificationStatus === 'under_review' ? 'Em Análise' : 'Rejeitado'}
              </span>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-4">
              <InfoCard
                icon={<Mail className="w-5 h-5 text-blue-600" />}
                label="Email"
                value={selectedVendor.userId?.email || 'Não disponível'}
              />
              <InfoCard
                icon={<Phone className="w-5 h-5 text-green-600" />}
                label="Telefone"
                value={selectedVendor.userId?.phone || 'Não cadastrado'}
              />
              <InfoCard
                icon={<CreditCard className="w-5 h-5 text-purple-600" />}
                label="CPF"
                value={selectedVendor.submittedData?.cpf ? 
                  selectedVendor.submittedData.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 
                  'Não disponível'}
              />
              <InfoCard
                icon={<Calendar className="w-5 h-5 text-orange-600" />}
                label="Data de Nascimento"
                value={selectedVendor.submittedData?.dateOfBirth ? 
                  new Date(selectedVendor.submittedData.dateOfBirth).toLocaleDateString('pt-BR') : 
                  'Não disponível'}
              />
            </div>

            {/* Data de Submissão */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Solicitação enviada em:</span>{' '}
                {new Date(selectedVendor.submittedAt).toLocaleString('pt-BR')}
              </p>
              {selectedVendor.ipAddress && (
                <p className="text-xs text-gray-500 mt-1">
                  IP: {selectedVendor.ipAddress}
                </p>
              )}
            </div>

            {/* Decisão Anterior (se houver) */}
            {selectedVendor.decision?.madeBy && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-800">Decisão Anterior</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      <span className="font-semibold">Ação:</span>{' '}
                      {selectedVendor.decision.action === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </p>
                    <p className="text-sm text-yellow-700">
                      <span className="font-semibold">Por:</span> {selectedVendor.decision.madeBy}
                    </p>
                    <p className="text-sm text-yellow-700">
                      <span className="font-semibold">Em:</span>{' '}
                      {new Date(selectedVendor.decision.madeAt).toLocaleString('pt-BR')}
                    </p>
                    {selectedVendor.decision.reason && (
                      <p className="text-sm text-yellow-700 mt-2">
                        <span className="font-semibold">Motivo:</span> {selectedVendor.decision.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            {selectedVendor.verificationStatus === 'pending' || selectedVendor.verificationStatus === 'under_review' ? (
              <div className="flex gap-4">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Aprovar Vendedor
                </button>

                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  Rejeitar Vendedor
                </button>
              </div>
            ) : (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center text-gray-600">
                Este vendedor já foi {selectedVendor.verificationStatus === 'approved' ? 'aprovado' : 'rejeitado'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* INSTRUÇÕES */}
      {/* ============================================ */}
      {!selectedVendor && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Como usar esta página
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 ml-7">
            <li>• Selecione o tipo de busca (Nome, CPF, Email ou Telefone)</li>
            <li>• Digite no mínimo 2 caracteres para ver sugestões</li>
            <li>• Clique em um vendedor da lista para ver detalhes completos</li>
            <li>• Aprove ou rejeite a solicitação com um clique</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE: Card de Informação
// ============================================
const InfoCard = ({ icon, label, value }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-sm font-semibold text-gray-600">{label}</span>
    </div>
    <p className="text-gray-900 font-semibold">{value}</p>
  </div>
);