# Supabase independiente para Moda Juárez

Estos archivos preparan un proyecto nuevo sin modificar el Supabase de
`inversor-facil`.

## Orden seguro

1. Crear un proyecto Supabase llamado `moda-juarez` en la misma organización.
2. Guardar la contraseña de base de datos en un gestor de contraseñas. No ponerla
   en Git, capturas ni mensajes.
3. Abrir **SQL Editor** en el proyecto nuevo.
4. Ejecutar `migrations/001_moda_juarez_core.sql`.
5. Ejecutar `migrations/002_bot_private_tables.sql`.
6. Ejecutar `migrations/003_verify_setup.sql`; debe listar 11 tablas y el bucket
   público `productos`.
7. Configurar Google en **Authentication > Providers** y agregar como URL de
   redirección `https://moda-juarez.onrender.com`.
8. Antes de cambiar la configuración, entrar como ADMIN en la tienda actual y
   pulsar **Descargar respaldo JSON**. Conservar ese archivo hasta terminar la
   migración.
9. Sustituir en `index.html` únicamente `PUBLIC_SUPABASE_URL` y
   `PUBLIC_SUPABASE_KEY` por los valores públicos del proyecto nuevo.
10. Publicar la tienda, iniciar sesión una vez con Google y ejecutar una copia de
   `PROMOTE_ADMIN_TEMPLATE.sql` con el correo real escrito solo dentro del SQL
   Editor de Supabase.
11. Con la sesión ADMIN activa, pulsar **Restaurar respaldo JSON**, seleccionar
    el archivo descargado en el paso 8 y después pulsar **Guardar catálogo en
    Supabase**. Comprobar que se guardan los 150 productos.
12. Actualizar en el servicio Render del bot `SUPABASE_URL` y
    `SUPABASE_PUBLISHABLE_KEY` con los valores públicos del proyecto nuevo.
13. La conexión PostgreSQL permanente del bot se habilitará en una fase
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
