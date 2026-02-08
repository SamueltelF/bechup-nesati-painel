import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  X, 
  Home,
  Search,
  BarChart3,
  Shield,
  History,
  ChevronDown,
  User,
  Store,
  Package,
  LogOut,
  Settings
} from 'lucide-react';

const AdminHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Carregar dados do admin do localStorage
    const user = localStorage.getItem('adminUser');
    if (user) {
      setAdminUser(JSON.parse(user));
    }
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (menuName) => {
    if (openDropdown === menuName) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(menuName);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/login';
  };

  const menuItems = [
    {
      name: 'Consultas',
      icon: <Search className="w-4 h-4" />,
      submenu: [
        {
          title: 'Consulta de Usuários',
          items: [
            { label: 'Nome/Nick', path: '/consulta/usuarios/nome' },
            { label: 'Email', path: '/consulta/usuarios/email' },
            { label: 'Telefone', path: '/consulta/usuarios/telefone' }
          ]
        },
        {
          title: 'Consulta de Vendedores',
          items: [
            { label: 'CPF', path: '/consulta/vendedores/cpf' },
            { label: 'Nome Completo', path: '/consulta/vendedores/nome' },
            { label: 'Email', path: '/consulta/vendedores/email' },
            { label: 'Telefone', path: '/consulta/vendedores/telefone' }
          ]
        },
        {
          title: 'Consulta de Produtos',
          items: [
            { label: 'Nome', path: '/consulta/produtos/nome' },
            { label: 'Categoria', path: '/consulta/produtos/categoria' },
            { label: 'ID do Produto', path: '/consulta/produtos/id' }
          ]
        }
      ]
    },
    {
      name: 'Análises',
      icon: <BarChart3 className="w-4 h-4" />,
      submenu: [
        {
          items: [
            { label: 'Análise de Usuários', path: '/analise/usuarios' },
            { label: 'Análise de Vendedores', path: '/analise/vendedores' },
            { label: 'Análise de Produtos', path: '/analise/produtos' }
          ]
        }
      ]
    },
    {
      name: 'Ações',
      icon: <Shield className="w-4 h-4" />,
      submenu: [
        {
          items: [
            { label: 'Banimento de Usuários', path: '/acoes/banir-usuarios', danger: true },
            { label: 'Banimento de Vendedores', path: '/acoes/banir-vendedores', danger: true },
            { label: 'Banimento de Produtos', path: '/acoes/banir-produtos', danger: true },
            { label: 'Avisos Prévios', path: '/acoes/avisos' },
            { label: 'Promover Vendedor', path: '/acoes/promover', success: true },
            { label: 'Rebaixar Vendedor', path: '/acoes/rebaixar' }
          ]
        }
      ]
    },
    {
      name: 'Histórico',
      icon: <History className="w-4 h-4" />,
      submenu: [
        {
          items: [
            { label: 'Histórico de Chats', path: '/historico/chats' },
            { label: 'Histórico de Ações', path: '/historico/acoes' },
            { label: 'Histórico de Vendas', path: '/historico/vendas' }
          ]
        }
      ]
    }
  ];

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Botão Voltar ao Painel */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/painel'}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Painel</span>
              </button>

              <div className="hidden md:flex items-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Panel
                </h1>
              </div>
            </div>

            {/* Menu Desktop */}
            <nav className="hidden lg:flex items-center gap-2" ref={dropdownRef}>
              {menuItems.map((menu, index) => (
                <div key={index} className="relative">
                  <button
                    onClick={() => toggleDropdown(menu.name)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      openDropdown === menu.name
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {menu.icon}
                    <span className="font-medium">{menu.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      openDropdown === menu.name ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {openDropdown === menu.name && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 max-h-[80vh] overflow-y-auto">
                      {menu.submenu.map((section, sIndex) => (
                        <div key={sIndex} className="px-2">
                          {section.title && (
                            <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              {section.title}
                            </div>
                          )}
                          {section.items.map((item, iIndex) => (
                            <a
                              key={iIndex}
                              href={item.path}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                item.danger
                                  ? 'hover:bg-red-50 text-red-600 font-medium'
                                  : item.success
                                  ? 'hover:bg-green-50 text-green-600 font-medium'
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                              onClick={() => setOpenDropdown(null)}
                            >
                              <span className="text-sm font-medium">{item.label}</span>
                            </a>
                          ))}
                          {sIndex < menu.submenu.length - 1 && (
                            <div className="my-2 border-t border-gray-100" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Perfil Admin e Menu Mobile */}
            <div className="flex items-center gap-3">
              {/* Perfil do Admin */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {adminUser?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-800">
                    {adminUser?.name || 'Admin'}
                  </span>
                  <span className="text-xs text-gray-500">{adminUser?.role || 'Administrador'}</span>
                </div>
              </div>

              {/* Botão Logout Desktop */}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Botão Menu Mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Perfil Mobile */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="flex items-center gap-3 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                  {adminUser?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="font-semibold">{adminUser?.name || 'Administrador'}</p>
                  <p className="text-sm opacity-90">{adminUser?.role || 'Admin'}</p>
                </div>
              </div>
            </div>

            {/* Menus Mobile */}
            <div className="py-2">
              {menuItems.map((menu, index) => (
                <div key={index} className="border-b border-gray-100 last:border-b-0">
                  <button
                    onClick={() => toggleDropdown(menu.name)}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {menu.icon}
                      <span className="font-medium">{menu.name}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      openDropdown === menu.name ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {/* Submenu com animação corrigida */}
                  <div 
                    className={`bg-gray-50 overflow-hidden transition-all duration-300 ${
                      openDropdown === menu.name 
                        ? 'max-h-[500px] opacity-100' 
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 py-2">
                      {menu.submenu.map((section, sIndex) => (
                        <div key={sIndex} className="mb-3 last:mb-0">
                          {section.title && (
                            <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase">
                              {section.title}
                            </div>
                          )}
                          {section.items.map((item, iIndex) => (
                            <a
                              key={iIndex}
                              href={item.path}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                item.danger
                                  ? 'text-red-600 hover:bg-red-50 font-medium'
                                  : item.success
                                  ? 'text-green-600 hover:bg-green-50 font-medium'
                                  : 'text-gray-700 hover:bg-white'
                              }`}
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setOpenDropdown(null);
                              }}
                            >
                              <span className="text-sm">{item.label}</span>
                            </a>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Logout Mobile */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sair do Sistema</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default AdminHeader;