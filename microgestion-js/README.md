# MicroGestión

Versión mínima: solo login, registro y la interfaz de reconocimiento
facial. Todo lo demás se quitó por el momento.

## Pantallas incluidas

- **Login** (`src/components/auth/LoginScreen.js`): correo y
  contraseña, verificados contra Supabase Auth.
- **Registro** (`src/components/auth/RegisterScreen.js`): crea el
  usuario en Supabase Auth y guarda su nombre/cargo en la tabla
  `usuarios`. Al terminar, ofrece capturar el rostro.
- **Captura facial** (`src/components/auth/FaceCapture.js`): interfaz
  de cámara lista, pero sin reconocimiento real todavía (ver el
  comentario `TODO` dentro de `captureAndProcess`).
- **Pantalla principal** (`src/components/home/HomeScreen.js`): vacía
  por el momento; solo muestra el usuario logueado y un botón de
  cerrar sesión.

## Configurar Supabase

1. Copia `.env.example` a `.env` y completa con la URL y la anon key
   de tu proyecto (Project Settings → API).
2. Ejecuta `supabase/schema.sql` en el SQL Editor de tu proyecto: crea
   la tabla `usuarios` y el trigger que copia ahí los datos de cada
   persona que se registra.

## Desarrollo

```bash
npm install
npm run dev
```
