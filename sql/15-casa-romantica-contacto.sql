-- Salimos · Casa Romántica: web y teléfonos para reservar (30/10/2026), de su web oficial casaromanticaagaete.com.
-- Varios teléfonos van en la misma columna separados por « / »: la ficha pinta un enlace por cada uno.
update salimos.locales
set web = 'https://casaromanticaagaete.com',
    telefono = '928 800 069 / 628 922 588',
    direccion = 'Carretera de los Berrazales, km 3, Valle de Agaete'
where nombre = 'Casa Romántica';

select nombre, web, telefono, direccion from salimos.locales where nombre = 'Casa Romántica';
