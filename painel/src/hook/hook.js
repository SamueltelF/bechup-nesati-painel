
import { useState, useEffect, useCallback } from 'react';
import API from '../api/gerencia-api';

export const useDashboard = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, activitiesResponse] = await Promise.all([
        API.dashboard.getStats(),
        API.dashboard.getRecentActivities(10)
      ]);

      setStats(statsResponse.stats);
      setActivities(activitiesResponse.activities);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { stats, activities, loading, error, reload: loadDashboard };
};

// Pesquisar usuarios
export const useUserSearch = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchUsers = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.search.searchUsers(params);

      setUsers(response.users);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, pagination, loading, error, searchUsers };
};

// Pesquisar produtos
export const useProductSearch = () => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchProducts = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.search.searchProducts(params);

      setProducts(response.products);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar produtos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, pagination, loading, error, searchProducts };
};

// pesquisa vendedores
export const useVendorSearch = () => {
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchVendors = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.search.searchVendors(params);

      setVendors(response.vendors);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar vendedores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { vendors, pagination, loading, error, searchVendors };
};

// pesquisar pagamentos
export const usePaymentSearch = () => {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchPayments = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.search.searchPayments(params);

      setPayments(response.withdrawals);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar pagamentos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { payments, pagination, loading, error, searchPayments };
};

// relatorios
export const useReports = () => {
  const [productsReport, setProductsReport] = useState(null);
  const [generalReport, setGeneralReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [productsResponse, generalResponse] = await Promise.all([
        API.reports.getProductsReport(),
        API.reports.getGeneralReport()
      ]);

      setProductsReport(productsResponse.report);
      setGeneralReport(generalResponse.report);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar relatórios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return { productsReport, generalReport, loading, error, reload: loadReports };
};

// AUTH
export const useAuth = () => {
  const [user, setUser] = useState(API.auth.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(API.auth.isAuthenticated());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.auth.login(username, password);

      if (response.success) {
        setUser(response.admin);
        setIsAuthenticated(true);
      }

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await API.auth.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, isAuthenticated, loading, error, login, logout };
};