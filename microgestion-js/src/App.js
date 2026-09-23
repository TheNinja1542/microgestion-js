import React from 'react';
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import RegisterScreen from './components/auth/RegisterScreen';
import HomeScreen from './components/home/HomeScreen';

function Inner() {
 
  const { user, loading } = useAuth();

  const [authView, setAuthView] = useState('login');

  
  if (loading) {
    return React.createElement(
      'div',
      { className: 'min-h-screen bg-[#080d19] flex items-center justify-center' },
      React.createElement('div', {
        className: 'w-8 h-8 border-2 border-[#3b7eff] border-t-transparent rounded-full animate-spin',
      })
    );
  }
  if (!user) {
    return authView === 'login'
      ? React.createElement(LoginScreen, { onGoRegister: () => setAuthView('register') })
      : React.createElement(RegisterScreen, { onGoLogin: () => setAuthView('login') });
  }

  
  return React.createElement(HomeScreen, null);
}

export default function App() {
  return React.createElement(
    AuthProvider,
    null,
    React.createElement(Inner, null)
  );
}
