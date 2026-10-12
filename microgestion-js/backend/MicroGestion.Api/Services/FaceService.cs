namespace MicroGestion.Api.Services;

// Compara rostros. face-api.js saca 128 números por rostro; dos rostros de la
// misma persona dan vectores "cercanos" (distancia euclidiana pequeña).
// Esto reemplaza a las funciones SQL buscar_usuario_por_rostro y rostro_ya_registrado.
public static class FaceService
{
    // Un descriptor válido tiene exactamente 128 números finitos.
    public static bool EsValido(float[]? d) => d is { Length: 128 } && d.All(float.IsFinite);

    // Distancia euclidiana con LINQ: raíz de la suma de (a-b)².
    public static double Distancia(float[] a, float[] b) =>
        a.Length != b.Length
            ? double.MaxValue
            : Math.Sqrt(a.Zip(b, (x, y) => (double)(x - y) * (x - y)).Sum());
}
