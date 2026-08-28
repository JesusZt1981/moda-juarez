# Migración definitiva a WOMAN 656

La marca visible y las claves internas nuevas ya usan **WOMAN 656**. Los nombres
técnicos antiguos que todavía aparecen en URLs activas se conservan temporalmente
para no interrumpir la tienda, el acceso ADMIN, OAuth ni el bot.

## Archivos de entrada actualizados

- `index.html`: tienda, identidad, catálogo, carrito, atribución, sesión y respaldos.
- `accounting.html` + `accounting.js`: Contabilidad y precios con la misma sesión ADMIN.
- `marketing-studio.js`: campañas y pop-ups con claves WOMAN 656.
- Bot: `app/static/index.html`, `app/main.py`, `.env.example` y `README.md`.

## Supabase

1. En **Project Settings > General**, cambiar el nombre mostrado del proyecto a `WOMAN 656`.
   Esto no cambia la URL ni las llaves del proyecto.
2. No crear otra base ni volver a ejecutar migraciones ya aplicadas.
3. En **Authentication > URL Configuration**, mantener la URL actual de Render hasta
   que el nuevo dominio esté publicado. Después agregar el nuevo dominio a Redirect URLs,
   probar Google y finalmente cambiar Site URL.
4. En Google Cloud OAuth, agregar el nuevo origen web y la URL callback de Supabase.
   Mantener el origen anterior durante la transición.

## Render

1. La tienda está activa en `https://moda-juarez.onrender.com` y el estudio en
   `https://bot-moda-juarez.onrender.com`; no eliminarlos ni renombrarlos sin probar primero.
2. La opción recomendada es asignar un dominio propio de WOMAN 656 a la tienda y otro
   subdominio al estudio. Render conserva el subdominio `onrender.com` como respaldo.
3. Cuando exista el nuevo dominio, actualizar en el bot `BOT_ALLOWED_ORIGINS` con ambos
   orígenes separados por coma durante la transición.
4. Actualizar `STORE_CONFIG.botApiUrl` y `marketingLandingUrl` sólo cuando las nuevas URLs
   respondan correctamente.

## GitHub

Se pueden renombrar los repositorios a `woman-656-store` y `woman-656-studio`. Después,
GitHub Desktop debe actualizar el remoto o volver a localizar cada repositorio. Renombrar
GitHub no cambia automáticamente Render; revisar la conexión de cada servicio.

## Brevo / correo

La tienda todavía **no está conectada a Brevo**. El formulario WOMAN 656 CLUB sólo guarda
la preferencia localmente y registra un evento del piloto. Para conectarlo de forma segura
se requieren: una API key de Brevo guardada únicamente en Render, el ID de la lista, un
remitente o dominio autenticado y el texto de consentimiento. Nunca se debe poner la API
key dentro de `index.html`.

## Corte final

Cuando el dominio nuevo esté confirmado: probar tienda pública, login Google, ADMIN,
Contabilidad, apertura del Studio, catálogo Supabase, carrito, leads y eventos. Sólo después
retirar los orígenes y enlaces antiguos.
