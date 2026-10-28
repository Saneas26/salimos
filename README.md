# Salimos

Dónde comer, tomar algo, bailar o ligar en Gran Canaria, según la gente que sale.
Gratis, sin anuncios y sin patrocinios. Del Grupo Saneas.

- Web: https://salimos.saneas.es (Vercel, proyecto `salimos`, desde `main`).
- Web estática sin compilar: `index.html`, `css/`, `js/`, `privacidad.html`.
- Datos: Supabase, proyecto **gajos** (`dzddxyrcdznebhxcrxmy`, París), esquema propio **`salimos`**.
  Las tablas no salen por la API; el navegador solo llama a `public.salimos_*`.
  Todo en `sql/01-salimos.sql`; la prueba de punta a punta, que se deshace sola, en `sql/99-prueba.sql`.
- Cuentas compartidas con Trivial Saneas (mismo Auth). Borrar Salimos no borra Trivial.
- Si se toca un criterio o una respuesta rápida, hay que tocar a la vez `js/datos.js` y `sql/01-salimos.sql`.
- Componente Grupo Saneas: `js/grupo-saneas.js` es una COPIA; no se edita aquí.
- Contador del grupo: `js/telemetria.js` (app `salimos`), no se carga en localhost.
