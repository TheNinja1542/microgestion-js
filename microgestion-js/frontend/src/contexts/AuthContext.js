import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken } from '../lib/api';

// Contexto de autenticación. Mantiene la MISMA interfaz que antes
// ({ user, loading, login, register, logout, registerFace, loginWithFace })
// pero ahora habla con el backend ASP.NET Core en vez de Supabase.
const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  // user: datos de quien está logueado (null si nadie). Forma:
  // { id, name, email, role, faceRegistered, createdAt }
  const [user, setUser] = useState(null);
  // loading: true mientras se revisa si ya había una sesión guardada.
  const [loading, setLoading] = useState(true);

  // Al abrir la app: si hay un token guardado, se le pregunta al backend quién es.
  useEffect(() => {
    let active = true;
    async function restaurarSesion() {
      if (getToken()) {
        const r = await api('/api/auth/me');
        if (!active) return;
        if (r.ok) setUser(r.data);
        else if (r.status === 401) setToken(null); // token vencido o acceso revocado
      }
      if (active) setLoading(false);
    }
    restaurarSesion();
    return () => { active = false; };
  }, []);

  // Guarda el token y el usuario que devolvió el backend (login normal o facial).
  const iniciarSesion = (data) => {
    setToken(data.token);
    setUser(data.user);
    return { success: true, user: data.user };
  };

  const login = async (email, password) => {
    const r = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    return r.ok ? iniciarSesion(r.data) : { success: false, error: r.error };
  };

  // Crea la cuenta (con el rostro, si viene). No inicia sesión: un admin debe aprobarla.
  const register = async ({ name, email, password, role, faceDescriptor }) => {
    const r = await api('/api/auth/register', {
      method: 'POST',
      body: { name, email, password, role, faceDescriptor: faceDescriptor ? Array.from(faceDescriptor) : null },
    });
    if (!r.ok) return { success: false, error: r.error };
    return { success: true, needsApproval: r.data.needsApproval };
  };

  const logout = async () => {
    setToken(null); // basta con olvidar el token
    setUser(null);
  };

  // Guarda el rostro del usuario ya logueado.
  const registerFace = async (_userId, descriptor) => {
    if (!descriptor) return { success: false, error: 'No se pudo capturar el rostro. Intenta de nuevo.' };
    const r = await api('/api/auth/rostro', { method: 'POST', body: { descriptor: Array.from(descriptor) } });
    return r.ok ? { success: true } : { success: false, error: r.error };
  };

  // Login con rostro: el backend compara el descriptor contra los guardados.
  const loginWithFace = async (descriptor) => {
    if (!descriptor) return { success: false, error: 'No se pudo capturar el rostro. Intenta de nuevo.' };
    const r = await api('/api/auth/login-face', { method: 'POST', body: { descriptor: Array.from(descriptor) } });
    return r.ok ? iniciarSesion(r.data) : { success: false, error: r.error };
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, login, register, logout, registerFace, loginWithFace } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
}
