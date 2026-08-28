-- WOMAN 656: cinco imágenes y un video corto por producto.
alter table public.shop_products
  add column if not exists image_4 text,
  add column if not exists image_5 text,
  add column if not exists video_url text;

update storage.buckets
set file_size_limit=20971520,
    allowed_mime_types=array[
      'image/jpeg','image/png','image/webp','video/mp4','video/webm'
    ]
where id='productos';
