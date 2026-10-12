namespace MicroGestion.Api.Models;

// Esta clase ES la tabla "usuarios": cada propiedad es una columna.
// Reemplaza a la tabla "usuarios" que antes vivía en Supabase.
public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();     // clave primaria
    public string Name { get; set; } = "";             // nombre completo
    public string Email { get; set; } = "";            // correo (único, en minúsculas)
    public string PasswordHash { get; set; } = "";     // contraseña cifrada con BCrypt (nunca en texto plano)
    public string Role { get; set; } = Roles.Pendiente; // cargo actual: admin, vendedor, ...
    public string? RolSolicitado { get; set; }         // cargo que pidió al registrarse
    public bool Aprobado { get; set; }                 // true cuando un admin le dio acceso
    public float[]? FaceDescriptor { get; set; }       // 128 números del rostro (null si no tiene)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Propiedad calculada: no es columna, se deduce del descriptor.
    public bool FaceRegistered => FaceDescriptor is { Length: > 0 };
}

// Los cargos en un solo lugar para no repetir textos "mágicos".
public static class Roles
{
    public const string Admin = "admin";
    public const string Vendedor = "vendedor";
    public const string Inventario = "inventario";
    public const string Rrhh = "rrhh";
    public const string Pendiente = "pendiente"; // aún sin aprobar

    // Cargos que un admin puede asignar (todos menos "pendiente").
    public static readonly string[] Asignables = { Admin, Vendedor, Inventario, Rrhh };
}
