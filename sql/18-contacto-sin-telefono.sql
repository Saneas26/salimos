-- Salimos · Contacto de los locales sin teléfono en Google (01/11/2026). Óscar: «cuando no tengan teléfono,
-- ponemos lo que tengan, si es facebook, web o el máximo contacto que podamos poner».
-- La columna web admite varios enlaces separados por espacios (web, Instagram, Facebook, mailto:); la ficha pinta uno por cada uno.
-- Mojito Sur: el teléfono es el que publica su propia página de Facebook (Mojito Sur Kasbah).
-- Sparkles: solo reserva por formulario en su web; el correo es el que pone al pie de su web.
update salimos.locales l
set telefono = coalesce(v.tel, l.telefono), web = v.web
from (values
  ('Mojito Sur', '653 66 99 16', 'https://www.instagram.com/mojitosur/ https://www.facebook.com/p/Mojito-Sur-Kasbah-100063777300816/'),
  ('Ca''tita', null, 'https://www.instagram.com/restauranteasadorcatita/ https://www.facebook.com/BochincheAsadorCaTita'),
  ('Sparkles', null, 'https://sparkles-showbar.com/pages/reserve-a-table mailto:info@sonnyscanaries.com')
) v(nombre, tel, web)
where l.nombre = v.nombre;

select nombre, telefono, web from salimos.locales where nombre in ('Mojito Sur', 'Ca''tita', 'Sparkles');
