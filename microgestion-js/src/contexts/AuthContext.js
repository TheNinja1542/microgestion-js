import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(undefined);

function traducirErrorSupabase(error) {
  const msg = error?.message || '';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos';
  if (msg.includes('User already registered') || msg.includes('already registered')) {
    return 'Este correo ya está registrado';
  }
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres';
  if (msg.includes('Unable to validate email address')) return 'El correo ingresado no es válido';
  return msg || 'Ocurrió un error. Intenta de nuevo.';
}

function mapProfile(row, authUser) {
  if (!row && !authUser) return null;
  return {
    id: row?.id ?? authUser?.id,
    name: row?.name ?? authUser?.user_metadata?.name ?? '',
    email: row?.email ?? authUser?.email ?? '',
    role: row?.role ?? authUser?.user_metadata?.role ?? '',
    faceRegistered: row?.face_registered ?? false,
    createdAt: row?.created_at ?? null,
  };
}

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) return null;
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', authUser.id).maybeSingle();
    if (error) {
      console.error('Error obteniendo el perfil del usuario:', error.message);
    }
    return mapProfile(data, authUser);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        setUser(await fetchProfile(session.user));
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(await fetchProfile(session.user));
      } else {
        setUser(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: traducirErrorSupabase(error) };
    }
    const profile = await fetchProfile(data.user);
    setUser(profile);
    return { success: true, user: profile };
  };

  const register = async ({ name, email, password, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) {
      return { success: false, error: traducirErrorSupabase(error) };
    }
    if (!data.user) {
      return { success: false, error: 'No se pudo crear el usuario.' };
    }

    const { error: profileError } = await supabase.from('usuarios').upsert({
      id: data.user.id,
      name,
      email,
      role,
      face_registered: false,
    });
    if (profileError) {
      console.error('Error guardando el perfil en la base de datos:', profileError.message);
    }

    const newUser = {
      id: data.user.id,
      name,
      email,
      role,
      faceRegistered: false,
      createdAt: new Date().toISOString(),
    };

    const needsEmailConfirmation = !data.session;
    if (data.session) {
      setUser(newUser);
    }

    return { success: true, user: newUser, needsEmailConfirmation };
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const registerFace = () => {
    console.info('[Reconocimiento facial] Función pendiente de implementar.');
    return { success: false, error: 'El registro facial todavía no está implementado.' };
  };

  const loginWithFace = () => {
    console.info('[Reconocimiento facial] Función pendiente de implementar.');
    return { success: false, error: 'El inicio de sesión facial todavía no está disponible.' };
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: { user, loading, login, register, logout, registerFace, loginWithFace },
    },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
