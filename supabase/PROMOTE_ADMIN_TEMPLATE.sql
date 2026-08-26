-- Ejecutar DESPUÉS de iniciar sesión con Google una vez en el proyecto nuevo.
-- Sustituye el texto entre < > por tu correo exacto antes de ejecutar.
-- No compartas el correo ni una captura del resultado.

update public.profiles
set role='admin'
where lower(email)=lower('<TU_CORREO_ADMIN>');

select id,email,role
from public.profiles
where lower(email)=lower('<TU_CORREO_ADMIN>');

