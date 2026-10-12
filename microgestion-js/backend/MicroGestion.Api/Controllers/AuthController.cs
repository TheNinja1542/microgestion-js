using System.Security.Claims;
using MicroGestion.Api.Data;
using MicroGestion.Api.Dtos;
using MicroGestion.Api.Models;
using MicroGestion.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MicroGestion.Api.Controllers;

// Todas las rutas empiezan con /api/auth
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;      // acceso a la base de datos (EF Core)
    private readonly TokenService _tokens;  // fabrica los JWT
    private readonly double _umbral;        // distancia máxima para decir "es el mismo rostro"

    public AuthController(AppDbContext db, TokenService tokens, IConfiguration config)
    {
        _db = db;
        _tokens = tokens;
        _umbral = config.GetValue("Face:Umbral", 0.55);
    }

    // ---------- REGISTRO (antes: supabase.auth.signUp + trigger) ----------
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(req.Name) || !email.Contains('@'))
            return BadRequest(new { error = "El correo ingresado no es válido" });
        if (req.Password.Length < 6)
            return BadRequest(new { error = "La contraseña debe tener al menos 6 caracteres" });
        if (!Roles.Asignables.Contains(req.Role))
            return BadRequest(new { error = "Cargo no válido" });

        // LINQ: ¿ya existe alguien con ese correo?  →  SELECT ... WHERE Email = @email
        if (await _db.Usuarios.AnyAsync(u => u.Email == email))
            return Conflict(new { error = "Este correo ya está registrado" });

        if (req.FaceDescriptor is not null)
        {
            if (!FaceService.EsValido(req.FaceDescriptor))
                return BadRequest(new { error = "El rostro capturado no es válido. Intenta de nuevo." });

            // Antes: rpc('rostro_ya_registrado'). Ahora: se traen los rostros guardados
            // y se compara con LINQ si alguno está dentro del umbral.
            var rostros = await _db.Usuarios
                .Where(u => u.FaceDescriptor != null)
                .Select(u => u.FaceDescriptor!)
                .ToListAsync();

            if (rostros.Any(r => FaceService.Distancia(r, req.FaceDescriptor) <= _umbral))
                return Conflict(new { error = "Este rostro ya está registrado en otra cuenta." });
        }

        // El primer usuario del sistema queda como admin aprobado, si no nadie podría aprobar a los demás.
        var esPrimero = !await _db.Usuarios.AnyAsync();

        var usuario = new Usuario
        {
            Name = req.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            RolSolicitado = req.Role,
            Role = esPrimero ? Roles.Admin : Roles.Pendiente,
            Aprobado = esPrimero,
            FaceDescriptor = req.FaceDescriptor,
        };

        _db.Usuarios.Add(usuario);        // INSERT (queda en memoria)
        await _db.SaveChangesAsync();     // aquí EF ejecuta el INSERT de verdad

        return Ok(new RegisterResponse(NeedsApproval: !esPrimero));
    }

    // ---------- LOGIN (antes: supabase.auth.signInWithPassword) ----------
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();

        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);

        // Mismo mensaje si el correo no existe o la contraseña falla (no revela cuál).
        if (usuario is null || !BCrypt.Net.BCrypt.Verify(req.Password, usuario.PasswordHash))
            return Unauthorized(new { error = "Correo o contraseña incorrectos" });

        if (!usuario.Aprobado)
            return StatusCode(403, new { error = "Tu cuenta está pendiente de aprobación." });

        return Ok(Respuesta(usuario));
    }

    // ---------- LOGIN FACIAL (antes: Edge Function login-facial + RPC buscar_usuario_por_rostro) ----------
    [HttpPost("login-face")]
    public async Task<IActionResult> LoginFace(FaceRequest req)
    {
        if (!FaceService.EsValido(req.Descriptor))
            return BadRequest(new { error = "No se pudo capturar el rostro. Intenta de nuevo." });

        // Solo los usuarios que tienen rostro guardado.
        var candidatos = await _db.Usuarios.Where(u => u.FaceDescriptor != null).ToListAsync();

        // LINQ en memoria: calcula la distancia a cada uno, descarta los lejanos
        // y se queda con el más parecido.
        var mejor = candidatos
            .Select(u => new { Usuario = u, Distancia = FaceService.Distancia(u.FaceDescriptor!, req.Descriptor) })
            .Where(x => x.Distancia <= _umbral)
            .OrderBy(x => x.Distancia)
            .FirstOrDefault();

        if (mejor is null)
            return Unauthorized(new { error = "Rostro no reconocido. Intenta de nuevo o usa tu contraseña." });
        if (!mejor.Usuario.Aprobado)
            return StatusCode(403, new { error = "Tu cuenta está pendiente de aprobación." });

        return Ok(Respuesta(mejor.Usuario));
    }

    // ---------- USUARIO ACTUAL (antes: getSession + select a "usuarios") ----------
    // Con el token del navegador, devuelve quién está logueado.
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var usuario = await UsuarioActual();
        return usuario is null ? Unauthorized() : Ok(ADto(usuario));
    }

    // ---------- GUARDAR ROSTRO (antes: rpc('guardar_rostro')) ----------
    [Authorize]
    [HttpPost("rostro")]
    public async Task<IActionResult> GuardarRostro(FaceRequest req)
    {
        if (!FaceService.EsValido(req.Descriptor))
            return BadRequest(new { error = "No se pudo capturar el rostro. Intenta de nuevo." });

        var usuario = await UsuarioActual();
        if (usuario is null) return Unauthorized();

        // Que ese rostro no pertenezca ya a OTRA cuenta.
        var rostrosAjenos = await _db.Usuarios
            .Where(u => u.Id != usuario.Id && u.FaceDescriptor != null)
            .Select(u => u.FaceDescriptor!)
            .ToListAsync();

        if (rostrosAjenos.Any(r => FaceService.Distancia(r, req.Descriptor) <= _umbral))
            return Conflict(new { error = "Este rostro ya está registrado en otra cuenta." });

        usuario.FaceDescriptor = req.Descriptor;
        await _db.SaveChangesAsync();   // UPDATE
        return NoContent();
    }

    // ---------- Ayudas privadas ----------

    // Lee el Id guardado dentro del token y busca a ese usuario en la base.
    private async Task<Usuario?> UsuarioActual()
    {
        var idTexto = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idTexto, out var id) ? await _db.Usuarios.FindAsync(id) : null;
    }

    private static UsuarioDto ADto(Usuario u) =>
        new(u.Id, u.Name, u.Email, u.Role, u.FaceRegistered, u.CreatedAt);

    private AuthResponse Respuesta(Usuario u) => new(_tokens.Crear(u), ADto(u));
}
