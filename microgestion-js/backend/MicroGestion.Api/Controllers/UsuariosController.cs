using System.Security.Claims;
using MicroGestion.Api.Data;
using MicroGestion.Api.Dtos;
using MicroGestion.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MicroGestion.Api.Controllers;

// Pantalla "Usuarios": solo entra quien tenga el cargo admin.
// Reemplaza a las funciones aprobar_usuario, cambiar_rol_usuario y revocar_acceso de Supabase.
[ApiController]
[Route("api/usuarios")]
[Authorize(Roles = Roles.Admin)]
public class UsuariosController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsuariosController(AppDbContext db) => _db = db;

    // GET /api/usuarios → lista para la pantalla (antes: supabase.from('usuarios').select(...))
    [HttpGet]
    public async Task<ActionResult<List<UsuarioListaDto>>> Listar()
    {
        return await _db.Usuarios
            .OrderBy(u => u.CreatedAt)                       // los más antiguos primero
            .Select(u => new UsuarioListaDto(                // solo las columnas necesarias
                u.Id, u.Name, u.Email, u.Role, u.Aprobado, u.RolSolicitado, u.CreatedAt))
            .ToListAsync();
    }

    // POST /api/usuarios/{id}/aprobar
    [HttpPost("{id:guid}/aprobar")]
    public async Task<IActionResult> Aprobar(Guid id)
    {
        var usuario = await _db.Usuarios.FindAsync(id);      // SELECT por clave primaria
        if (usuario is null) return NotFound(new { error = "Usuario no encontrado" });

        usuario.Aprobado = true;
        // Si aún estaba "pendiente", recibe el cargo que pidió al registrarse.
        if (usuario.Role == Roles.Pendiente)
            usuario.Role = usuario.RolSolicitado ?? Roles.Vendedor;

        await _db.SaveChangesAsync();                        // UPDATE
        return NoContent();
    }

    // POST /api/usuarios/{id}/rol   cuerpo: { "nuevoRol": "vendedor" }
    [HttpPost("{id:guid}/rol")]
    public async Task<IActionResult> CambiarRol(Guid id, CambiarRolRequest req)
    {
        if (!Roles.Asignables.Contains(req.NuevoRol))
            return BadRequest(new { error = "Cargo no válido" });
        if (id == YoId())
            return BadRequest(new { error = "No puedes cambiar tu propio cargo" });

        var usuario = await _db.Usuarios.FindAsync(id);
        if (usuario is null) return NotFound(new { error = "Usuario no encontrado" });

        usuario.Role = req.NuevoRol;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/usuarios/{id}/revocar
    [HttpPost("{id:guid}/revocar")]
    public async Task<IActionResult> Revocar(Guid id)
    {
        if (id == YoId())
            return BadRequest(new { error = "No puedes quitarte el acceso a ti mismo" });

        var usuario = await _db.Usuarios.FindAsync(id);
        if (usuario is null) return NotFound(new { error = "Usuario no encontrado" });

        usuario.Aprobado = false;
        usuario.Role = Roles.Pendiente;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Id del admin que hace la petición (viene dentro del token).
    private Guid YoId() =>
        Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;
}
