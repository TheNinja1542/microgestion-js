using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MicroGestion.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace MicroGestion.Api.Services;

// Crea el token JWT que el frontend guarda y manda en cada petición.
// Hace el papel de la sesión de Supabase Auth.
public class TokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config) => _config = config;

    public string Crear(Usuario u)
    {
        var jwt = _config.GetSection("Jwt");

        // "Claims" = datos que lleva el token: quién es y qué cargo tiene.
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()),
            new Claim(ClaimTypes.Email, u.Email),
            new Claim(ClaimTypes.Role, u.Role),
        };

        // El token se firma con la clave secreta: si alguien lo modifica, la firma deja de valer.
        var clave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var credenciales = new SigningCredentials(clave, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(jwt.GetValue("ExpireHours", 8)),
            signingCredentials: credenciales);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
