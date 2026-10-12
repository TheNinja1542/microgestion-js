// Cliente de la API, único y compartido por toda la app.
// Reemplaza a supabaseClient.js: en vez de hablar con Supabase,
// el frontend ahora habla con el backend ASP.NET Core (Entity Framework).

// Dirección del backend. Se lee del .env (VITE_API_URL).
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5080';

// Nombre con el que se guarda el token en el navegador.
const TOKEN_KEY = 'mg_token';

// Leer, guardar o borrar el token (JWT) que da el backend al iniciar sesión.
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

// Hace una petición al backend y SIEMPRE devuelve un objeto simple:
//   { ok: true,  status, data }   si todo salió bien
//   { ok: false, status, error }  si algo falló (error ya viene en español)
export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  // Si hay sesión, el token viaja en cada petición para que el backend sepa quién es.
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  let res;
  try {
    res = await fetch(API_URL + ruta, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (_) {
    // No hubo respuesta: backend apagado, sin red, CORS mal configurado...
    return { ok: false, status: 0, error: 'No se pudo conectar con el servidor. ¿Está encendido el backend?' };
  }

  // Algunas respuestas (204) vienen vacías, por eso se lee como texto primero.
  let data = null;
  const texto = await res.text();
  if (texto) {
    try { data = JSON.parse(texto); } catch (_) { /* no era JSON */ }
  }

  if (!res.ok) {
    const porDefecto = res.status === 400 ? 'Datos inválidos. Revisa el formulario.' : 'Ocurrió un error. Intenta de nuevo.';
    return { ok: false, status: res.status, error: data?.error ?? porDefecto };
  }
  return { ok: true, status: res.status, data };
}
