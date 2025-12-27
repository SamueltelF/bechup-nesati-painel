// App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
//import Painel from './pages/Painel';
import AdminLogin from './pages/login';
import AdminDashboard from './pages/painel';
import ReportsPage from './pages/relatorio';
import UsersPage from './pages/usuarios';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path='/painel' element={<AdminDashboard/>} />
        <Route path='/usu' element={<UsersPage />} />
        <Route path='/relatorio' element={<ReportsPage/>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;