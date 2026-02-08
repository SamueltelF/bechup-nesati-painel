
const API_BASE_URL = 'http://127.0.0.1:8080'
const API_DEV_ENDPOINT = `${API_BASE_URL}/api/dev`


const apiRequest = async (url, options = {}) => {
  try {
    const token = localStorage.getItem('adminToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        //enviar token no header Authorization
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };


    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Erro na API:', data)
      throw new Error(data.message || 'Erro na requisição')
    }

    console.log('✅ Resposta da API:', data)
    return data
    
  } catch (error) {
    console.error('❌ Erro na API:', error)
    
    // Se token expirou ou é inválido, limpar e redirecionar
    if (error.message.includes('Token') || error.message.includes('Acesso negado')) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      window.location.href = '/admin/login'
    }
    
    throw error
  }
}


// AUTENTICAÇÃO

export const authService = {
  // Login
  login: async (username, password) => {
    const data = await apiRequest(`${API_DEV_ENDPOINT}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    
    if (data.success && data.token) {
      //console.log('Token recebido:', data.token);
      localStorage.setItem('adminToken', data.token)
      localStorage.setItem('adminUser', JSON.stringify(data.admin))
    }
    
    return data
  },

  // Logout
  logout: async () => {
    try {
      await apiRequest(`${API_DEV_ENDPOINT}/logout`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Sempre limpar localStorage
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    }
  },

  // Verificar sessão
  checkSession: async () => {
    return apiRequest(`${API_DEV_ENDPOINT}/session`)
  },

  // Obter usuário do localStorage
  getUser: () => {
    const user = localStorage.getItem('adminUser')
    return user ? JSON.parse(user) : null
  },

  // Verificar se está autenticado
  isAuthenticated: () => {
    const token = localStorage.getItem('adminToken')
    const user = localStorage.getItem('adminUser')
    return !!(token && user)
  }
}


// DASHBOARD

export const dashboardService = {
  getStats: async () => {
    return apiRequest(`${API_DEV_ENDPOINT}/dashboard-stats`)
  },

  getRecentActivities: async (limit = 10) => {
    return apiRequest(`${API_DEV_ENDPOINT}/recent-activities?limit=${limit}`)
  }
}


// PESQUISAS
export const searchService = {
  searchUsers: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.emailVerified) queryParams.append('emailVerified', params.emailVerified);
    if (params.phoneVerified) queryParams.append('phoneVerified', params.phoneVerified);
    if (params.role) queryParams.append('role', params.role);
    queryParams.append('page', params.page || 1);
    queryParams.append('limit', params.limit || 20);

    return apiRequest(`${API_DEV_ENDPOINT}/search-users?${queryParams}`);
  },

  searchProducts: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.produtoV) queryParams.append('produtoV', params.produtoV);
    if (params.isActive) queryParams.append('isActive', params.isActive);
    if (params.isFeatured) queryParams.append('isFeatured', params.isFeatured);
    if (params.minPrice) queryParams.append('minPrice', params.minPrice);
    if (params.maxPrice) queryParams.append('maxPrice', params.maxPrice);
    queryParams.append('page', params.page || 1);
    queryParams.append('limit', params.limit || 20);

    return apiRequest(`${API_DEV_ENDPOINT}/search-products?${queryParams}`);
  },

  searchVendors: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.isActive) queryParams.append('isActive', params.isActive);
    if (params.minSales) queryParams.append('minSales', params.minSales);
    if (params.maxSales) queryParams.append('maxSales', params.maxSales);
    queryParams.append('page', params.page || 1);
    queryParams.append('limit', params.limit || 20);

    return apiRequest(`${API_DEV_ENDPOINT}/search-vendors?${queryParams}`);
  },

  searchPayments: async (params = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('status', params.status || 'all');
    if (params.vendorId) queryParams.append('vendorId', params.vendorId);
    if (params.minAmount) queryParams.append('minAmount', params.minAmount);
    if (params.maxAmount) queryParams.append('maxAmount', params.maxAmount);
    queryParams.append('page', params.page || 1);
    queryParams.append('limit', params.limit || 20);

    return apiRequest(`${API_DEV_ENDPOINT}/search-payments?${queryParams}`);
  }
};


// RELATÓRIOS

export const reportService = {
  getProductsReport: async () => {
    return apiRequest(`${API_DEV_ENDPOINT}/products-report`);
  },

  getGeneralReport: async () => {
    return apiRequest(`${API_DEV_ENDPOINT}/general-report`);
  }
};




// VERIFICAÇÕES DE VENDEDORES
export const verificationService = {
  // Listar verificações pendentes
  getPendingVerifications: async (params = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('status', params.status || 'pending');
    queryParams.append('page', params.page || 1);
    queryParams.append('limit', params.limit || 20);
    
    return apiRequest(`${API_DEV_ENDPOINT}/verification-history?${queryParams}`);
  },

  // Detalhes de uma verificação
  getVerificationDetails: async (historyId) => {
    return apiRequest(`${API_DEV_ENDPOINT}/verification-history/${historyId}`);
  },

  // Estatísticas de verificações
  getVerificationStats: async () => {
    return apiRequest(`${API_DEV_ENDPOINT}/verification-stats`);
  },

  // Aprovar vendedor
  approveVendor: async (vendorId, notes = '') => {
    return apiRequest(`${API_DEV_ENDPOINT}/vendors/${vendorId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  },

  // Rejeitar vendedor
  rejectVendor: async (vendorId, reason, notes = '') => {
    return apiRequest(`${API_DEV_ENDPOINT}/vendors/${vendorId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, notes })
    });
  },

  downloadVerificationPDF: async (historyId) => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_DEV_ENDPOINT}/verification/${historyId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `verificacao-vendedor-${historyId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      throw error;
    }
  }

};

// EXPORTAR SERVIÇO UNIFICADO

const API = {
  auth: authService,
  dashboard: dashboardService,
  search: searchService,
  reports: reportService,
   verification: verificationService // ✅ NOVO
};

export default API;