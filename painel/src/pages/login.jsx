import React, { useState } from 'react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      showMessage('Preencha todos os campos', 'error');
      return;
    }

    setLoading(true);

    try {
      // URL do backend
      const API_URL = 'http://127.0.0.1:8080';
      
      console.log('Tentando fazer login...');
      console.log('URL:', `${API_URL}/api/dev/login`);
      
      const response = await fetch(`${API_URL}/api/dev/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Para cookies
        body: JSON.stringify({ username, password })
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        // IMPORTANTE: Salvar token e usuário
        if (data.token) {
          localStorage.setItem('adminToken', data.token);
          console.log('Token salvo:', data.token);
        }
        
        if (data.admin) {
          localStorage.setItem('adminUser', JSON.stringify(data.admin));
          console.log('Usuário salvo:', data.admin);
        }
        
        showMessage('Login realizado com sucesso!', 'success');
        
        // Redirecionar após 1 segundo
        setTimeout(() => {
          // Você pode usar React Router aqui se tiver
          window.location.href = '/painel';
        }, 1000);
      } else {
        showMessage(data.message || 'Credenciais inválidas', 'error');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      showMessage('Erro ao conectar com o servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 4000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10">
        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-700 rounded-full mb-4">
           
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Painel Admin
          </h1>
          <p className="text-sm text-gray-600">
            Faça login para acessar o sistema
          </p>
        </div>

        {message.text && (
          <div
            className={`p-3 rounded-lg mb-5 text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-6">
          <label
            htmlFor="username"
            className="block text-gray-700 font-semibold mb-2 text-sm"
          >
            Usuário
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite seu usuário"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-gray-700 font-semibold mb-2 text-sm"
          >
            Senha
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua senha"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-xl text-base font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

      </div>
    </div>
  );
}