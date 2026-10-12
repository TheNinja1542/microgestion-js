// Componente raíz: login, registro (con captura facial) 
//  una vez logueado, la pantalla principal (por ahora vacía).

import React from 'react';
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import RegisterScreen from './components/auth/RegisterScreen';
import HomeScreen from './components/home/HomeScreen';
import UsuariosScreen from './components/usuarios/UsuariosScreen';


// useAuth() necesita estar dentro de AuthProvider.
// Por eso App() envuelve a Inner() con AuthProvider.
function Inner() {  
  const { user, loading } = useAuth();

  // Qué pantalla de autenticación se muestra (login o registro)
  // mientras no hay sesión iniciada.
  const [authView, setAuthView] = useState('login');
      const [vista, setVista] = useState('home');

  // Mientras se revisa si ya había sesión activa, un loader
  // simple para no parpadear al login.
  if (loading) {
    return React.createElement(
      'div',
      { className: 'min-h-screen bg-[#080d19] flex items-center justify-center' },
      React.createElement('div', {
        className: 'w-8 h-8 border-2 border-[#3b7eff] border-t-transparent rounded-full animate-spin',
      })
    );
  }

  // Sin sesión: login o registro.
  if (!user) {
    return authView === 'login'
      ? React.createElement(LoginScreen, { onGoRegister: () => setAuthView('register') })
      : React.createElement(RegisterScreen, { onGoLogin: () => setAuthView('login') });
  }

  // Con sesión: pantalla principal.
    if (vista === 'usuarios' && user.role === 'admin') {
    return React.createElement(UsuariosScreen, { onBack: () => setVista('home') });
  }
  return React.createElement(HomeScreen, { onVerUsuarios: () => setVista('usuarios') });
}

// Envuelve todo con AuthProvider para que cualquier componente hijo pueda usar useAuth().
export default function App() {
  return React.createElement(
    AuthProvider,
    null,
    React.createElement(Inner, null)
  );
}