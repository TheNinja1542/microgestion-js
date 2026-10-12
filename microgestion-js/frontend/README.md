# MicroGestión (frontend)

React + Vite. Login, registro con captura facial y pantalla de usuarios.
Ya **no usa Supabase**: toda la información pasa por el backend
ASP.NET Core + Entity Framework (carpeta `../backend`).

## Configuración

1. Copia `.env.example` a `.env`. Solo trae `VITE_API_URL`, la dirección del backend
   (por defecto `http://localhost:5080`).
2. Enciende primero el backend (ver `../MIGRACION.md`).

## Desarrollo

```bash
npm install
npm run dev
```

## Dónde está cada cosa

- `src/lib/api.js`: cliente de la API (agrega el token JWT a cada petición).
- `src/contexts/AuthContext.js`: login, registro, login facial y sesión.
- `src/components/usuarios/UsuariosScreen.js`: aprobar usuarios, cambiar cargo y quitar acceso.
