# Migración de Supabase a ASP.NET Core + Entity Framework Core (LINQ)

> LINQ no es una base de datos: es el lenguaje de consultas de C# que Entity Framework
> traduce a SQL. Por eso el backend usa **EF Core + LINQ** y el frontend sigue siendo React.

## Estructura

```
backend/MicroGestion.Api/   API en ASP.NET Core 8 (EF Core + SQLite + JWT)
  Models/Usuario.cs         la clase = tabla "usuarios"
  Data/AppDbContext.cs      DbContext: tablas y mapeo
  Controllers/              AuthController y UsuariosController
  Services/                 TokenService (JWT) y FaceService (comparar rostros)
frontend/                   el mismo React, ahora llamando a la API
```

## Cómo ejecutarlo

1. Instala el **.NET 8 SDK**.
2. Backend:
   ```bash
   cd backend/MicroGestion.Api
   dotnet run
   ```
   Queda en `http://localhost:5080` y crea solo el archivo `microgestion.db`.
3. Frontend (otra terminal):
   ```bash
   cd frontend
   npm install
   
   ```
4. Cambia `Jwt:Key` en `appsettings.json` por una clave propia (mínimo 32 caracteres).

## Qué reemplaza a qué

| Antes (Supabase) | Ahora |
|---|---|
| Tabla `usuarios` + trigger | Clase `Usuario` + `AppDbContext` |
| `auth.signUp` | `POST /api/auth/register` (hash BCrypt + INSERT con EF) |
| `auth.signInWithPassword` | `POST /api/auth/login` |
| Edge Function `login-facial` + RPC `buscar_usuario_por_rostro` | `POST /api/auth/login-face` (LINQ sobre los rostros) |
| RPC `rostro_ya_registrado` | Dentro de `register`: responde 409 si el rostro ya existe |
| RPC `guardar_rostro` | `POST /api/auth/rostro` |
| `from('usuarios').select(...)` | `GET /api/usuarios` |
| RPC `aprobar_usuario`, `cambiar_rol_usuario`, `revocar_acceso` | `POST /api/usuarios/{id}/aprobar`, `/rol`, `/revocar` |
| Sesión de Supabase | Token JWT guardado en `localStorage` |

## Suposiciones (el zip no traía `supabase/schema.sql`)

El esquema lo deduje leyendo el código del frontend. Revisen que estos puntos coincidan con lo que querían:

- **Primer usuario = admin aprobado.** Los demás quedan "pendientes" hasta que un admin los apruebe.
- **Aprobar** le da al usuario el cargo que pidió al registrarse.
- **Quitar acceso** lo deja como no aprobado y con cargo "pendiente".
- Un usuario no aprobado tampoco puede entrar con correo y contraseña (antes solo se bloqueaba en el login facial).
- Los usuarios que ya existían en Supabase **no se migran**: tendrían que volver a registrarse.

## Cosas a tener en cuenta

- **El backend no está compilado ni probado**: lo escribí sin tener .NET disponible. Si `dotnet run` muestra algún error, pásenmelo y lo corrijo.
- El login facial compara un descriptor que calcula el navegador, así que no es una barrera de seguridad fuerte (igual que antes). Está bien para el proyecto, no para producción.
- El backend verifica en la base, en cada petición, que el usuario siga aprobado y con el mismo cargo, así que quitar acceso o cambiar el rol se aplica de inmediato.

## Opcional

**Migraciones de EF** (en vez de `EnsureCreated` en `Program.cs`):
```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add Inicial
dotnet ef database update
```
y cambia `EnsureCreated()` por `Migrate()` en `Program.cs`.

**SQL Server** en vez de SQLite: instala `Microsoft.EntityFrameworkCore.SqlServer`, cambia `UseSqlite` por `UseSqlServer` en `Program.cs` y ajusta `ConnectionStrings:Default`.
npm run dev