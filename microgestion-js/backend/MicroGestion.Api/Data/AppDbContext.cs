using System.Text.Json;
using MicroGestion.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace MicroGestion.Api.Data;

// El DbContext es la "puerta" a la base de datos: aquí se declaran las tablas
// (DbSet) y cómo se mapean. Con él se hacen las consultas LINQ.
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Tabla de usuarios: db.Usuarios.Where(...).ToListAsync() es LINQ → SQL.
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var usuario = modelBuilder.Entity<Usuario>();

        usuario.ToTable("usuarios");
        usuario.HasKey(u => u.Id);
        usuario.HasIndex(u => u.Email).IsUnique();          // no se repite el correo
        usuario.Property(u => u.Name).HasMaxLength(120).IsRequired();
        usuario.Property(u => u.Email).HasMaxLength(200).IsRequired();
        usuario.Property(u => u.PasswordHash).IsRequired();
        usuario.Property(u => u.Role).HasMaxLength(20).IsRequired();
        usuario.Property(u => u.RolSolicitado).HasMaxLength(20);
        usuario.Ignore(u => u.FaceRegistered);              // propiedad calculada, no es columna

        // SQLite no tiene tipo "arreglo de números": se guarda como texto JSON
        // ("[0.12,-0.5,...]") y EF lo convierte solo al leer y al escribir.
        var convertidor = new ValueConverter<float[], string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<float[]>(v, (JsonSerializerOptions?)null)!);

        // El comparador le dice a EF cuándo dos arreglos son "iguales" (para detectar cambios).
        var comparador = new ValueComparer<float[]>(
            (a, b) => a!.SequenceEqual(b!),
            v => v.Aggregate(0, (h, x) => HashCode.Combine(h, x.GetHashCode())),
            v => v.ToArray());

        usuario.Property(u => u.FaceDescriptor).HasConversion(convertidor, comparador);
    }
}
