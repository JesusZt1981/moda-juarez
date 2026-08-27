# WOMAN 656 · próximas mejoras de reels

## Terminadas en código

- Reel vertical WEBM de 6, 9 o 15 segundos.
- Enlace visible y QR con atribución UTM.
- Descarga local de respaldo.
- Biblioteca privada de campañas y archivos en Supabase.
- Reutilizar, descargar y eliminar piezas guardadas.
- Registro de productos, mensaje, duración, tamaño y versión.

## Prioridad siguiente

1. Ejecutar las migraciones `004_campaign_media_library.sql` y
   `005_verify_campaign_library.sql` en Supabase.
2. Publicar los cambios actuales y probar un reel guardado de principio a fin.
3. Añadir exportación MP4 H.264 compatible con Instagram, TikTok y Facebook.
4. Añadir portada, subtítulos y zonas seguras para interfaces de redes sociales.
5. Añadir música propia o con licencia y control independiente de volumen.
6. Conectar un proveedor opcional de imagen-a-video mediante una función segura
   del servidor; nunca colocar la clave del proveedor en `index.html`.
7. Guardar también el clip original de IA, el reel editado y el prompt utilizado.
8. Añadir presupuesto máximo, aprobación manual y registro del costo por pieza.
9. Conectar publicación automática solo cuando existan aplicaciones y permisos
   aprobados de Meta o TikTok.

## Regla de costos

El generador por plantillas debe seguir disponible sin costo por pieza. La IA de
video será opcional y deberá mostrar el costo estimado antes de generar. Si no
hay saldo o credencial, la tienda no debe dejar de funcionar.

## Regla de almacenamiento

Los archivos finales se guardan en el bucket privado `campaign-media`. Render no
se usa como almacenamiento permanente. Cuando se aproxime el límite de Supabase,
se debe permitir exportar, archivar o mover material antiguo antes de borrarlo.
