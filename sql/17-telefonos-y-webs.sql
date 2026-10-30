-- Salimos · teléfonos para reservar y web oficial de los locales (30/10/2026). Petición de Óscar: el teléfono, en cada ficha.
-- Sacados de la ficha de cada sitio en Google Maps y revisados a mano. Web solo si es SUYA: su dominio, la página
-- del hotel donde está, su Instagram/Facebook o su página propia en un creador de webs. Nada de directorios
-- (guachinches.info fuera). Sin teléfono en Google: Ca'tita, Mojito Sur y Sparkles. Mojito Sur no tiene web.
-- Solo rellena: lo que viene vacío no borra lo que ya hubiera.
update salimos.locales l
set telefono = coalesce(v.tel, l.telefono), web = coalesce(v.web, l.web)
from (values
  ('19th Hole', '928 69 31 38', null),
  ('Alis Rooftop', '928 24 30 44', 'https://www.barcelo.com/es-es/santa-catalina-a-royal-hideaway-hotel/gastronomia/'),
  ('Atelier Cocktail Bar', '928 56 34 00', 'https://www.ateliercocktailbar.com/'),
  ('Bochinche Bar Suso', '928 02 31 26', null),
  ('Bochinche La Lechuza', '663 63 15 02', 'https://bochinche-cantina-la-lechuza.eatbu.com/'),
  ('Ca''tita', null, 'https://www.facebook.com/BochincheAsadorCaTita/'),
  ('Café del Mar Meloneras', '637 88 40 20', 'https://www.cafedelmarmeloneras.com/'),
  ('Casa Montesdeoca', '928 20 86 43', 'https://restaurantecasamontesdeoca.com/'),
  ('Chester Meloneras Club & Lounge', '677 58 25 96', 'https://chestercanarias.com/'),
  ('Deliciosa Marta', '676 37 70 32', null),
  ('El Senador', '928 14 20 68', 'https://elsenadorgc.com/'),
  ('Emblemática Rooftop', '628 40 05 54', 'https://www.emblematicarooftop.com/'),
  ('Greek Taverna', '928 76 67 85', 'https://www.sabordegrecia.com/greek_taverna/'),
  ('Guachinche Motor Grande', '928 91 73 50', null),
  ('La Aquarela', '928 73 58 91', 'https://www.restaurantelaaquarela.com/'),
  ('La Pizarra: Sabores del Mar', '928 88 11 39', 'https://saboresdelmar.lapizarra.es/'),
  ('La Vicaría', '928 78 82 81', 'https://restaurantelavicaria.com/'),
  ('Los Guayres', '928 72 41 00', 'https://losguayres.com/'),
  ('Mojito Sur', null, null),
  ('Nakar', '673 62 59 76', 'https://restaurantenakar.com/'),
  ('Poemas by Hermanos Padrón', '928 24 30 41', 'https://www.restaurantepoemas.com/'),
  ('Reina de la Noche Music Bar', '628 94 58 23', 'https://www.instagram.com/reina_de_la_noche/'),
  ('Rêver Restaurante', '928 45 64 55', 'https://restauranterever.com/'),
  ('Samsara', '653 73 26 74', 'https://www.samsara-gc.com/'),
  ('Sparkles', null, 'https://sparkles-showbar.com/'),
  ('Terraza Belvedere', '928 50 11 22', 'https://www.instagram.com/belvederesantaana/')
) v(nombre, tel, web)
where l.nombre = v.nombre;

select count(*) filter (where telefono is not null) con_telefono, count(*) filter (where web is not null) con_web, count(*) total
from salimos.locales where activo;
