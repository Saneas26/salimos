/* Salimos · lo fijo: tipos de sitio, criterios, preguntas rápidas, zonas y tramos de edad.
   Los locales y los votos vienen de Supabase (apartado «salimos» del proyecto Gajos).
   Si se toca un criterio o una respuesta, hay que tocar también sql/01-salimos.sql. */
(function () {
  var TIPOS = [
    { id: 'restaurante', nombre: 'Restaurante',    plural: 'Comer',        emoji: '🍽️', color: '#FDE7C2' },
    { id: 'guachinche',  nombre: 'Guachinche',     plural: 'Guachinches',  emoji: '🍖', color: '#FBD9C4' },
    { id: 'terraza',     nombre: 'Terraza',        plural: 'Terrazas',     emoji: '☀️', color: '#FEF3C7' },
    { id: 'copas',       nombre: 'Bar de copas',   plural: 'Copas',        emoji: '🍸', color: '#DBE4FF' },
    { id: 'musica',      nombre: 'Bar de música',  plural: 'Música',       emoji: '🎸', color: '#E4DCFB' },
    { id: 'discoteca',   nombre: 'Discoteca',      plural: 'Discotecas',   emoji: '🪩', color: '#F5D9F0' },
    { id: 'vinoteca',    nombre: 'Vinoteca',       plural: 'Vinotecas',    emoji: '🍷', color: '#F6D5D9' }
  ];

  // Base común: la votan todos los locales.
  var BASE = [
    { id: 'limpieza',      nombre: 'Limpieza',       emoji: '🧼', ayuda: 'Baños, barra, mesas y cocina' },
    { id: 'ambiente',      nombre: 'Ambiente',       emoji: '✨', ayuda: 'Cómo se está: gente, luz, ruido' },
    { id: 'servicio',      nombre: 'Servicio',       emoji: '🙋', ayuda: 'Trato y rapidez' },
    { id: 'consumiciones', nombre: 'Consumiciones',  emoji: '🥂', ayuda: 'Lo que comes y bebes: calidad y cantidad' },
    { id: 'precio',        nombre: 'Precio justo',   emoji: '💶', ayuda: 'Lo que pagas por lo que te dan' },
    { id: 'ubicacion',     nombre: 'Ubicación',      emoji: '📍', ayuda: 'Dónde está y qué hay alrededor' },
    { id: 'parking',       nombre: 'Parking',        emoji: '🚗', ayuda: 'Si se aparca fácil' },
    { id: 'guagua',        nombre: 'Guagua',         emoji: '🚌', ayuda: 'Si se llega bien en transporte público' }
  ];

  // Extras: solo en los tipos de local donde tienen sentido.
  var EXTRAS = [
    { id: 'carta',    nombre: 'Carta',         emoji: '📋', ayuda: 'Variedad y platos que merecen la pena', tipos: ['restaurante', 'guachinche'] },
    { id: 'vinoteca', nombre: 'Vinos',         emoji: '🍷', ayuda: 'Carta de vinos y cómo los sirven',      tipos: ['restaurante', 'vinoteca'] },
    { id: 'musica',   nombre: 'Música',        emoji: '🎶', ayuda: 'La música y el volumen',                tipos: ['copas', 'musica', 'discoteca'] },
    { id: 'vistas',   nombre: 'Sombra y vistas', emoji: '🌅', ayuda: 'Lo que se ve y si se está a gusto al sol', tipos: ['terraza'] }
  ];

  var RAPIDAS = [
    { id: 'volver', pregunta: '¿Volverías?', opciones: [['si', 'Sí, seguro'], ['depende', 'Depende'], ['no', 'No']] },
    { id: 'precio', pregunta: '¿El precio es honesto?', opciones: [['justo', 'Justo'], ['caro', 'Algo caro'], ['abusivo', 'Abusivo']] },
    { id: 'guagua', pregunta: '¿Se llega en guagua?', opciones: [['si', 'Sí, parada cerca'], ['coche', 'Mejor en coche']] },
    { id: 'edad', pregunta: '¿Qué edad tenía la mayoría de la gente?', opciones: [['18-24', 'De 18 a 24'], ['25-35', 'De 25 a 35'], ['25-50', 'De 25 a 50'], ['35-60', 'De 35 a 60']] }
  ];

  // Tramos de edad del público, tal cual los fijó Óscar: se pisan a propósito.
  // Sirven para BUSCAR; votar no depende de la edad de quien vota.
  var EDADES = [
    { id: '18-24', min: 18, max: 24, nombre: 'De 18 a 24' },
    { id: '25-35', min: 25, max: 35, nombre: 'De 25 a 35' },
    { id: '25-50', min: 25, max: 50, nombre: 'De 25 a 50' },
    { id: '35-60', min: 35, max: 60, nombre: 'De 35 a 60' }
  ];

  var ZONAS = [
    { id: 'lpgc',  nombre: 'Las Palmas de G.C.', municipios: ['Las Palmas de Gran Canaria'] },
    { id: 'norte', nombre: 'Norte',  municipios: ['Arucas', 'Firgas', 'Moya', 'Santa María de Guía', 'Gáldar', 'Agaete', 'La Aldea de San Nicolás'] },
    { id: 'centro', nombre: 'Medianías y cumbre', municipios: ['Santa Brígida', 'San Mateo (Vega de San Mateo)', 'Teror', 'Valleseco', 'Tejeda', 'Artenara', 'Valsequillo'] },
    { id: 'este',  nombre: 'Este',   municipios: ['Telde', 'Ingenio', 'Agüimes', 'Santa Lucía de Tirajana'] },
    { id: 'sur',   nombre: 'Sur',    municipios: ['San Bartolomé de Tirajana', 'Mogán'] }
  ];
  var MUNICIPIOS = [];
  ZONAS.forEach(function (z) { z.municipios.forEach(function (m) { MUNICIPIOS.push(m); }); });
  MUNICIPIOS.sort(function (a, b) { return a.localeCompare(b, 'es'); });

  function zonaDe(municipio) {
    for (var i = 0; i < ZONAS.length; i++) if (ZONAS[i].municipios.indexOf(municipio) >= 0) return ZONAS[i].id;
    return null;
  }

  // Un local puede tener dos tipos (p. ej. restaurante con terraza de copas): suma los extras de los dos.
  // Tiene que coincidir con salimos.criterios_de(tipo, tipo2) en sql/02-ficha-y-primeros-locales.sql.
  function criteriosDe(tipo, tipo2) {
    return BASE.concat(EXTRAS.filter(function (e) { return e.tipos.indexOf(tipo) >= 0 || (tipo2 && e.tipos.indexOf(tipo2) >= 0); }));
  }

  window.SALIMOS = {
    TIPOS: TIPOS, EDADES: EDADES, BASE: BASE, EXTRAS: EXTRAS, RAPIDAS: RAPIDAS, ZONAS: ZONAS, MUNICIPIOS: MUNICIPIOS,
    criteriosDe: criteriosDe, zonaDe: zonaDe,
    MIN_VOTOS_RANKING: 5
  };
})();
