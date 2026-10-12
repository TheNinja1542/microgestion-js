import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

// "value" es lo que se guarda en la base de datos, "label" lo que ve la gente
const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'rrhh', label: 'Recursos Humanos' },
];
const etiqueta = (v) => ROLES.find((r) => r.value === v)?.label || v || 'Sin cargo';

// Pantalla donde el admin aprueba usuarios, cambia roles y quita accesos
export default function UsuariosScreen({ onBack }) {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null); 

  // aca se le pide al backend la lista de usuarios (GET /api/usuarios)
  const cargar = useCallback(async () => {
    const r = await api('/api/usuarios');
    if (!r.ok) setError(r.error);
    else setUsuarios(r.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Sirve para las tres acciones (aprobar, cambiar rol, revocar):
  // llama al backend (POST a la ruta indicada) y recarga la lista
  async function ejecutar(id, ruta, body) {
    setError('');
    setBusyId(id);
    const r = await api(ruta, { method: 'POST', body });
    if (!r.ok) setError(r.error); // si hay error, lo mostramos arriba
    await cargar();
    setBusyId(null);
  }

  const pendientes = usuarios.filter((u) => !u.aprobado);
  const aprobados = usuarios.filter((u) => u.aprobado);

  const btn = 'text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50';

  // Tarjeta de un usuario: datos a la izquierda, acciones a la derecha
  function fila(u) {
    const esYo = u.id === user?.id; // no puedo cambiarme el rol ni quitarme el acceso
    const ocupado = busyId === u.id;
    return React.createElement('div', {
      key: u.id,
      className: 'bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3',
    },
      React.createElement('div', null,
        React.createElement('div', { className: 'text-sm font-medium text-white' },
          u.name || '(sin nombre)',
          esYo && React.createElement('span', { className: 'ml-2 text-[10px] text-[#3b7eff]' }, 'Tú')),
        React.createElement('div', { className: 'text-xs text-slate-400' }, u.email),
        !u.aprobado && React.createElement('div', { className: 'text-[11px] text-amber-400 mt-1' },
          'Pendiente' + (u.rolSolicitado ? ' · pidió: ' + etiqueta(u.rolSolicitado) : ''))),
      React.createElement('div', { className: 'flex items-center gap-2' },
        // Cambiar rol: solo aprobados
        u.aprobado && React.createElement('select', {
          value: u.role,
          disabled: esYo || ocupado,
          onChange: (e) => ejecutar(u.id, '/api/usuarios/' + u.id + '/rol', { nuevoRol: e.target.value }),
          className: 'text-xs px-2 py-1.5 rounded-lg bg-[#080d19] border border-[#1e2d4a] text-white disabled:opacity-50',
        }, ROLES.map((r) => React.createElement('option', { key: r.value, value: r.value }, r.label))),
        // Aprobar: solo pendientes
        !u.aprobado && React.createElement('button', {
          disabled: ocupado,
          onClick: () => ejecutar(u.id, '/api/usuarios/' + u.id + '/aprobar'),
          className: btn + ' bg-[#3b7eff] text-white hover:bg-[#5a94ff]',
        }, ocupado ? 'Aprobando...' : 'Aprobar'),
        // Quitar acceso: pide confirmación antes
        u.aprobado && !esYo && React.createElement('button', {
          disabled: ocupado,
          onClick: () => {
            if (window.confirm('¿Quitar el acceso a ' + (u.name || u.email) + '?')) {
              ejecutar(u.id, '/api/usuarios/' + u.id + '/revocar');
            }
          },
          className: btn + ' border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/10',
        }, 'Quitar acceso')));
  }

  // Sección con título y contador; no se muestra si está vacía
  const seccion = (titulo, lista) =>
    lista.length > 0 && React.createElement('div', { className: 'mb-6' },
      React.createElement('h2', { className: 'text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide' },
        titulo + ' (' + lista.length + ')'),
      React.createElement('div', { className: 'space-y-2' }, lista.map(fila)));

  return React.createElement('div', { className: 'min-h-screen bg-[#080d19] flex flex-col' },
    React.createElement('header', { className: 'h-14 border-b border-[#1e2d4a] flex items-center justify-between px-5 shrink-0' },
      React.createElement('span', { className: 'font-heading text-sm font-bold text-white' }, 'Usuarios'),
      React.createElement('button', {
        onClick: onBack,
        className: 'text-xs px-3 py-1.5 rounded-lg border border-[#1e2d4a] text-slate-400 hover:text-white hover:border-[#2a3d60] transition-colors',
      }, 'Volver')),
    React.createElement('main', { className: 'flex-1 w-full max-w-2xl mx-auto p-5' },
      error && React.createElement('p', { className: 'text-[#ef4444] text-xs bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-3 py-2 mb-4' }, error),
      loading
        ? React.createElement('p', { className: 'text-slate-500 text-sm' }, 'Cargando...')
        : React.createElement(React.Fragment, null,
            seccion('Pendientes de aprobación', pendientes),
            seccion('Usuarios con acceso', aprobados))));
} 