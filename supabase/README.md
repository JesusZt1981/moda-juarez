# Supabase independiente para WOMAN 656

Estos archivos preparan un proyecto nuevo sin modificar el Supabase de
`inversor-facil`.

## Orden seguro

1. Crear un proyecto Supabase llamado `WOMAN 656` en la misma organización.
   Mantener **Enable Data API** activado y desactivar **Automatically expose new
   tables**; el script concede únicamente los privilegios necesarios para la
   tienda.
2. Guardar la contraseña de base de datos en un gestor de contraseñas. No ponerla
   en Git, capturas ni mensajes.
3. Abrir **SQL Editor** en el proyecto nuevo.
4. Ejecutar `migrations/001_moda_juarez_core.sql` (el nombre del archivo se conserva como historial técnico).
5. Ejecutar `migrations/002_bot_private_tables.sql`.
6. Ejecutar `migrations/003_verify_setup.sql`; debe listar 11 tablas y el bucket
   público `productos`.
7. Ejecutar `migrations/004_campaign_media_library.sql` para crear la biblioteca
   privada de campañas, reels, imágenes y carruseles.
8. Ejecutar `migrations/005_verify_campaign_library.sql`; debe devolver las tres
   comprobaciones en `true` y seis políticas.
9. Ejecutar `migrations/006_accounting_and_pricing.sql` para crear compras,
   partidas, tabulador de precios y el bucket privado de facturas.
10. Ejecutar `migrations/007_verify_accounting.sql`; debe devolver las cuatro
   comprobaciones en `true`, tres políticas de tablas y cuatro de Storage.
11. Configurar Google en **Authentication > Providers** y agregar como URL de
   redirección del dominio activo de WOMAN 656. Mientras se completa la migración,
   permanece `https://moda-juarez.onrender.com`.
12. Antes de cambiar la configuración, entrar como ADMIN en la tienda actual y
   pulsar **Descargar respaldo JSON**. Conservar ese archivo hasta terminar la
   migración.
13. Sustituir en `index.html` únicamente `PUBLIC_SUPABASE_URL` y
   `PUBLIC_SUPABASE_KEY` por los valores públicos del proyecto nuevo.
14. Publicar la tienda, iniciar sesión una vez con Google y ejecutar una copia de
   `PROMOTE_ADMIN_TEMPLATE.sql` con el correo real escrito solo dentro del SQL
   Editor de Supabase.
15. Con la sesión ADMIN activa, pulsar **Restaurar respaldo JSON**, seleccionar
    el archivo descargado en el paso 8 y después pulsar **Guardar catálogo en
    Supabase**. Comprobar que se guardan los 150 productos.
16. Actualizar en el servicio Render del bot `SUPABASE_URL` y
    `SUPABASE_PUBLISHABLE_KEY` con los valores públicos del proyecto nuevo.
17. La conexión PostgreSQL permanente del bot se habilitará en una fase
    posterior con `DATABASE_URL`, guardada exclusivamente como Secret en Render.

## Separación y seguridad

- Las tablas `shop_*` son de la tienda.
- Las tablas `bot_*` quedan reservadas para el bot.
- RLS permite lectura pública solo del catálogo activo y su inventario.
- Solo un usuario con `profiles.role='admin'` puede modificar catálogo, stock o
  imágenes.
- Las tablas `bot_*` tienen RLS activado y ninguna política pública.
- La publishable key es pública. Nunca se debe usar una `service_role` o secret
  key en `index.html`.
- No borrar el proyecto `inversor-facil` hasta completar y verificar toda la
  migración.
