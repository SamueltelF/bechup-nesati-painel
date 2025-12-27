import React, { useState, useEffect } from 'react';
import { useUserSearch } from '../hook/hook.js';

export default function UsersPage() {
  const { users, pagination, loading, error, searchUsers } = useUserSearch();
  
  const [filters, setFilters] = useState({
    search: '',
    emailVerified: '',
    phoneVerified: '',
    role: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    searchUsers(filters);
  }, [filters.page]);

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, page: 1 }));
    searchUsers({ ...filters, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-600">
            Pesquise e gerencie usuários do sistema
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Total: <span className="font-bold">{pagination.totalUsers || 0}</span> usuários
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />

          <select
            value={filters.emailVerified}
            onChange={(e) => handleFilterChange('emailVerified', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">Email - Todos</option>
            <option value="true">Email Verificado</option>
            <option value="false">Email Não Verificado</option>
          </select>

          <select
            value={filters.phoneVerified}
            onChange={(e) => handleFilterChange('phoneVerified', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">Telefone - Todos</option>
            <option value="true">Telefone Verificado</option>
            <option value="false">Telefone Não Verificado</option>
          </select>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Tabela de Usuários */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Nome</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Email</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Telefone</th>
                <th className="text-center p-4 text-sm font-semibold text-gray-600">Email</th>
                <th className="text-center p-4 text-sm font-semibold text-gray-600">Telefone</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">Carregando usuários...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user._id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-700">{user.email}</td>
                    <td className="p-4 text-sm text-gray-700">{user.phone || '-'}</td>
                    <td className="p-4 text-center">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          ✓ Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                          ✗ Não Verificado
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {user.phoneVerified ? (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          ✓ Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                          - Não Informado
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              Página {pagination.currentPage} de {pagination.totalPages} 
              ({pagination.totalUsers} usuários no total)
            </div>
            <div className="flex gap-2">
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => handlePageChange(filters.page - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => handlePageChange(filters.page + 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}