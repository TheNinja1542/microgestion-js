using System.Security.Claims;
using System.Text;
using MicroGestion.Api.Data;
using MicroGestion.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// 1) Base de datos: EF Core + SQLite. La cadena está en appsettings.json.
//    Para SQL Server: UseSqlServer(...) y el paquete Microsoft.EntityFrameworkCore.SqlServer.
builder.Services.AddDbContext<AppDbContext>(opciones =>
    opciones.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// 2) Servicios propios (se crean solos cuando un controlador los pide en su constructor).
builder.Services.AddScoped<TokenService>();
builder.Services.AddControllers();

// 3) CORS: permite que el frontend (otro puerto) llame a esta API desde el navegador.
var origenes = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(c => c.AddDefaultPolicy(p =>
    p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()));

// 4) Autenticación con JWT: lee y valida el token "Authorization: Bearer ..." de cada petición.
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opciones =>
    {
        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwt["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
            ValidateLifetime = true,
        };

        // Extra de seguridad: aunque el token sea válido, se confirma en la base que el
        // usuario siga aprobado y con el mismo cargo. Así "Quitar acceso" o un cambio de
        // rol surten efecto de inmediato y no cuando el token expire.
        opciones.Events = new JwtBearerEvents
        {
            OnTokenValidated = async contexto =>
            {
                var db = contexto.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var idTexto = contexto.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var rol = contexto.Principal?.FindFirst(ClaimTypes.Role)?.Value;

                if (!Guid.TryParse(idTexto, out var id))
                {
                    contexto.Fail("Token inválido");
                    return;
                }

                var vigente = await db.Usuarios.AnyAsync(u => u.Id == id && u.Aprobado && u.Role == rol);
                if (!vigente) contexto.Fail("Acceso revocado");
            }
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// 5) Crea el archivo microgestion.db y la tabla "usuarios" si todavía no existen.
using (var alcance = app.Services.CreateScope())
{
    alcance.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
}

// 6) Orden importante: CORS → quién eres (Authentication) → qué puedes hacer (Authorization).
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
