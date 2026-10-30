/* Salimos · lo fijo: tipos de sitio, criterios, preguntas rápidas, destinos con sus zonas y tramos de edad.
   Cada uno lleva su icono de Material Symbols, el juego de iconos del diseño de Stitch.
   Los locales y los votos vienen de Supabase (apartado «salimos» del proyecto Gajos).
   Si se toca un criterio o una respuesta, hay que tocar también sql/01-salimos.sql. */
(function () {
  var TIPOS = [
    { id: 'restaurante', nombre: 'Restaurante',    plural: 'Comer',        icono: 'restaurant' },
    { id: 'guachinche',  nombre: 'Guachinche',     plural: 'Guachinches',  icono: 'outdoor_grill' },
    { id: 'terraza',     nombre: 'Terraza',        plural: 'Terrazas',     icono: 'deck' },
    { id: 'copas',       nombre: 'Bar de copas',   plural: 'Copas',        icono: 'local_bar' },
    { id: 'musica',      nombre: 'Bar de música',  plural: 'Música',       icono: 'music_note' },
    { id: 'discoteca',   nombre: 'Discoteca',      plural: 'Discotecas',   icono: 'nightlife' },
    { id: 'vinoteca',    nombre: 'Vinoteca',       plural: 'Vinotecas',    icono: 'wine_bar' }
  ];

  // Base común: la votan todos los locales.
  var BASE = [
    { id: 'limpieza',      nombre: 'Limpieza',       icono: 'sanitizer', ayuda: 'Baños, barra, mesas y cocina' },
    { id: 'ambiente',      nombre: 'Ambiente',       icono: 'mood', ayuda: 'Cómo se está: gente, luz, ruido' },
    { id: 'servicio',      nombre: 'Servicio',       icono: 'room_service', ayuda: 'Trato y rapidez' },
    { id: 'consumiciones', nombre: 'Consumiciones',  icono: 'local_bar', ayuda: 'Lo que comes y bebes: calidad y cantidad' },
    { id: 'precio',        nombre: 'Precio justo',   icono: 'euro', ayuda: 'Lo que pagas por lo que te dan' },
    { id: 'ubicacion',     nombre: 'Ubicación',      icono: 'location_on', ayuda: 'Dónde está y qué hay alrededor' },
    { id: 'parking',       nombre: 'Parking',        icono: 'directions_car', ayuda: 'Si se aparca fácil' },
    { id: 'guagua',        nombre: 'Guagua',         icono: 'directions_bus', ayuda: 'Si se llega bien en transporte público' }
  ];

  // Extras: solo en los tipos de local donde tienen sentido.
  var EXTRAS = [
    { id: 'carta',    nombre: 'Carta',         icono: 'restaurant_menu', ayuda: 'Variedad y platos que merecen la pena', tipos: ['restaurante', 'guachinche'] },
    { id: 'vinoteca', nombre: 'Vinos',         icono: 'wine_bar', ayuda: 'Carta de vinos y cómo los sirven',      tipos: ['restaurante', 'vinoteca'] },
    { id: 'musica',   nombre: 'Música',        icono: 'music_note', ayuda: 'La música y el volumen',                tipos: ['copas', 'musica', 'discoteca'] },
    { id: 'vistas',   nombre: 'Sombra y vistas', icono: 'wb_twilight', ayuda: 'Lo que se ve y si se está a gusto al sol', tipos: ['terraza'] }
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

  // Destinos: lo que se elige arriba del todo (isla, provincia o ciudad). Solo se ofrecen los que ya tienen sitios.
  // Cada destino tiene sus zonas. La zona de un local sale de su municipio; si una zona se queda con
  // parte de un municipio (Arguineguín dentro de Mogán), manda el barrio.
  var DESTINOS = [
    { id: 'Gran Canaria', icono: 'landscape', todo: 'Toda la isla', titulo: 'Zonas de la isla', zonas: [
      { id: 'lpgc',        nombre: 'Las Palmas de G.C.', lugares: ['Las Palmas de Gran Canaria'], municipios: ['Las Palmas de Gran Canaria'] },
      { id: 'norte',       nombre: 'Norte',  lugares: ['Arucas', 'Firgas', 'Moya', 'Guía', 'Gáldar', 'Agaete', 'La Aldea'],
        municipios: ['Arucas', 'Firgas', 'Moya', 'Santa María de Guía', 'Gáldar', 'Agaete', 'La Aldea de San Nicolás'] },
      { id: 'centro',      nombre: 'Medianías y cumbre', lugares: ['Santa Brígida', 'San Mateo', 'Teror', 'Valleseco', 'Tejeda', 'Artenara', 'Valsequillo'],
        municipios: ['Santa Brígida', 'San Mateo (Vega de San Mateo)', 'Teror', 'Valleseco', 'Tejeda', 'Artenara', 'Valsequillo'] },
      { id: 'telde',       nombre: 'Telde', lugares: ['Telde'], municipios: ['Telde'] },
      { id: 'sureste',     nombre: 'Agüimes, Arinaga e Ingenio', lugares: ['Agüimes', 'Arinaga', 'Ingenio'], municipios: ['Agüimes', 'Ingenio'] },
      { id: 'vecindario',  nombre: 'Vecindario', lugares: ['Vecindario', 'Santa Lucía de Tirajana'], municipios: ['Santa Lucía de Tirajana'] },
      { id: 'maspalomas',  nombre: 'Maspalomas', lugares: ['Playa del Inglés', 'San Agustín', 'Meloneras', 'Maspalomas'], municipios: ['San Bartolomé de Tirajana'] },
      { id: 'arguineguin', nombre: 'Arguineguín', lugares: ['Arguineguín', 'Patalavaca', 'Puerto Rico', 'Amadores'], barrios: /arguinegu|patalavaca|puerto rico|amadores/i },
      { id: 'mogan',       nombre: 'Mogán', lugares: ['Puerto de Mogán', 'Taurito', 'Mogán pueblo'], municipios: ['Mogán'] }
    ] }
  ];
  function destino(id) { return DESTINOS.filter(function (d) { return d.id === id; })[0] || { id: id, icono: 'location_city', todo: 'Todo ' + id, titulo: 'Zonas', zonas: [] }; }

  // Para el formulario de recomendar (hoy solo hay sitios de Gran Canaria).
  var MUNICIPIOS = [];
  DESTINOS[0].zonas.forEach(function (z) { (z.municipios || []).forEach(function (m) { MUNICIPIOS.push(m); }); });
  MUNICIPIOS.sort(function (a, b) { return a.localeCompare(b, 'es'); });

  function zonaDe(l) {
    var zonas = destino(l.destino).zonas, i;
    for (i = 0; i < zonas.length; i++) if (zonas[i].barrios && zonas[i].barrios.test(l.barrio || '')) return zonas[i].id;
    for (i = 0; i < zonas.length; i++) if ((zonas[i].municipios || []).indexOf(l.municipio) >= 0) return zonas[i].id;
    return null;
  }

  // Un local puede tener dos tipos (p. ej. restaurante con terraza de copas): suma los extras de los dos.
  // Tiene que coincidir con salimos.criterios_de(tipo, tipo2) en sql/02-ficha-y-primeros-locales.sql.
  function criteriosDe(tipo, tipo2) {
    return BASE.concat(EXTRAS.filter(function (e) { return e.tipos.indexOf(tipo) >= 0 || (tipo2 && e.tipos.indexOf(tipo2) >= 0); }));
  }

  window.SALIMOS = {
    TIPOS: TIPOS, EDADES: EDADES, BASE: BASE, EXTRAS: EXTRAS, RAPIDAS: RAPIDAS, DESTINOS: DESTINOS, MUNICIPIOS: MUNICIPIOS,
    destino: destino,
    criteriosDe: criteriosDe, zonaDe: zonaDe,
    MIN_VOTOS_RANKING: 5
  };
})();
