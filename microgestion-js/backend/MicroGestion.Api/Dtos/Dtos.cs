namespace MicroGestion.Api.Dtos;

// DTO = "caja" con los datos que viajan entre el frontend y la API.
// Nunca se devuelve la entidad Usuario completa (tiene el hash y el rostro).

// ---- Lo que envía el frontend ----
public record RegisterRequest(string Name, string Email, string Password, string Role, float[]? FaceDescriptor);
public record LoginRequest(string Email, string Password);
public record FaceRequest(float[] Descriptor);
public record CambiarRolRequest(string NuevoRol);

// ---- Lo que responde la API ----
// Mismos campos que usaba el AuthContext original: id, name, email, role, faceRegistered, createdAt.
public record UsuarioDto(Guid Id, string Name, string Email, string Role, bool FaceRegistered, DateTime CreatedAt);
public record AuthResponse(string Token, UsuarioDto User);
public record RegisterResponse(bool NeedsApproval);

// Fila de la pantalla "Usuarios" (solo admin).
public record UsuarioListaDto(Guid Id, string Name, string Email, string Role, bool Aprobado, string? RolSolicitado, DateTime CreatedAt);
