/* Salimos · la app.
   Rutas por almohadilla: #/explorar, #/zonas, #/top, #/local/ID, #/votar(/ID), #/entrar, #/recomendar, #/tu…
   Los datos viven en Supabase, apartado «salimos» del proyecto Gajos (ver sql/01-salimos.sql).
   El navegador solo llama a las funciones public.salimos_*: las tablas no salen por la API. */
(function () {
  var S = window.SALIMOS;
  var vista = document.getElementById('vista');

  /* La clave publicable va en el navegador a propósito: lo que protege son las funciones. */
  var SB_URL = 'https://dzddxyrcdznebhxcrxmy.supabase.co';
  var SB_KEY = 'sb_publishable_svuHlCmWv1g_wcH5P4S8Lg_jjwQzT0G';
  /* El correo del código distingue Salimos de Trivial por esta dirección de vuelta. */
  var VUELTA = 'https://salimos.saneas.es/';
  var sb = window.supabase.createClient(SB_URL, SB_KEY);
  var FOTOS = 'salimos-fotos';
  function urlFoto(ruta) { return SB_URL + '/storage/v1/object/public/' + FOTOS + '/' + ruta; }

  var TODOS = [];                                    // de salimos_locales(): los de todos los destinos
  var LOCALES = [];                                  // los del destino elegido arriba
  var DESTINO = leer('destino', 'Gran Canaria');
  var YO = { sesion: null, perfil: false, admin: false, votos: {}, checkins: {} };

  async function cargarLocales() {
    var r = await sb.rpc('salimos_locales');
    if (r.error) throw r.error;
    TODOS = r.data.map(function (l) { l.zona = S.zonaDe(l); return l; });
    elegirDestino(DESTINO);
  }
  /* Solo se ofrecen los destinos que ya tienen sitios: primero los de datos.js, en su orden. */
  function destinosConSitios() {
    var ids = S.DESTINOS.map(function (d) { return d.id; });
    TODOS.forEach(function (l) { if (ids.indexOf(l.destino) < 0) ids.push(l.destino); });
    return ids.filter(function (id) { return TODOS.some(function (l) { return l.destino === id; }); });
  }
  function elegirDestino(id) {
    var hay = destinosConSitios();
    if (hay.indexOf(id) < 0) id = hay[0] || 'Gran Canaria';
    if (id !== DESTINO) filtro.zona = '';
    DESTINO = id;
    LOCALES = TODOS.filter(function (l) { return l.destino === id; });
    var b = document.getElementById('destino-nombre'); if (b) b.textContent = id;
  }
  async function cargarYo() {
    var s = await sb.auth.getSession();
    YO.sesion = s.data.session;
    if (!YO.sesion) { YO.perfil = false; YO.admin = false; YO.votos = {}; YO.checkins = {}; return; }
    var r = await sb.rpc('salimos_mi_estado');
    if (r.error) throw r.error;
    YO.perfil = r.data.perfil; YO.admin = r.data.admin; YO.votos = r.data.votos || {}; YO.checkins = r.data.checkins || {}; YO.cuentanTodos = r.data.cuentan_todos;
  }
  /* Los mensajes de error de las funciones ya vienen en castellano y para el usuario. */
  function textoError(e) { return (e && e.message) || 'No se ha podido. Prueba otra vez.'; }

  /* ───────── almacén local (puede fallar en privado: entonces no se guarda nada) ───────── */
  function leer(k, def) { try { var v = localStorage.getItem('salimos-' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem('salimos-' + k, JSON.stringify(v)); } catch (e) {} }
  function borrar(k) { try { localStorage.removeItem('salimos-' + k); } catch (e) {} }

  /* ───────── utilidades ───────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function tipo(id) { return S.TIPOS.filter(function (t) { return t.id === id; })[0]; }
  function local(id) { return TODOS.filter(function (l) { return l.id === id; })[0]; }
  function zona(id) { return S.destino(DESTINO).zonas.filter(function (z) { return z.id === id; })[0]; }
  function votosDe() { return YO.votos; }
  function usuario() { return YO.sesion ? { correo: YO.sesion.user.email } : null; }

  var tostadaT;
  function tostada(txt) {
    var t = document.getElementById('tostada'); t.textContent = txt; t.classList.add('ver');
    clearTimeout(tostadaT); tostadaT = setTimeout(function () { t.classList.remove('ver'); }, 2600);
  }

  /* Cifras de un local tal como las da el servidor (el voto propio ya va dentro). */
  function cifras(l) {
    var crit = {};
    S.criteriosDe(l.tipo, l.tipo2).forEach(function (c) {
      var b = l.crit[c.id] || { suma: 0, n: 0 };
      crit[c.id] = { media: b.n ? b.suma / b.n : null, n: b.n };
    });
    var medias = Object.keys(crit).map(function (k) { return crit[k].media; }).filter(function (m) { return m != null; });
    var nota = medias.length ? medias.reduce(function (a, b) { return a + b; }, 0) / medias.length : null;
    return { nota: nota, votos: l.votos, crit: crit, rapidas: l.rapidas || {}, mio: votosDe()[l.id] };
  }

  /* El tramo de edad que más han marcado quienes votan (con 3 respuestas como mínimo). */
  function mayoria(c) {
    var d = c.rapidas.edad || {}, mejor = null, tot = 0;
    Object.keys(d).forEach(function (k) { tot += d[k]; if (!mejor || d[k] > d[mejor]) mejor = k; });
    return tot >= 3 ? S.EDADES.filter(function (e) { return e.id === mejor; })[0] : null;
  }
  /* Un local encaja con un tramo buscado si su mayoría cae dentro: buscar 25–50 trae también los de 25–35. */
  function encajaEdad(m, buscados) {
    return buscados.some(function (id) { var b = S.EDADES.filter(function (e) { return e.id === id; })[0]; return m && m.min >= b.min && m.max <= b.max; });
  }

  /* ───────── piezas del diseño de Stitch (carpeta stitch, los code.html) ─────────
     Las clases son las de Stitch tal cual; solo cambian los textos y los datos, que son los reales. */
  function ic(nombre, clases, relleno) {
    return '<span class="material-symbols-outlined ' + (clases || '') + '"' + (relleno ? ' style="font-variation-settings: \'FILL\' 1;"' : '') + ' aria-hidden="true">' + nombre + '</span>';
  }
  function n1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function nombreTipos(l) { return esc(tipo(l.tipo).nombre + (l.tipo2 ? ' y ' + tipo(l.tipo2).nombre.toLowerCase() : '')); }
  function euros(l) { return l.precio ? '€€€'.slice(0, l.precio) : ''; }
  function rotulo(l) { return esc((l.barrio || l.municipio).replace(/ · /g, ' • ')); }
  function seccion(t) { var s = document.getElementById('seccion'); if (s) s.textContent = t; }

  /* Las cuatro píldoras de criterio de las tarjetas, en el orden de colores de Stitch. */
  var PILDORA = [
    ['bg-tertiary-fixed/20 text-on-tertiary-fixed', 'text-tertiary'],
    ['bg-secondary-fixed text-on-secondary-fixed', ''],
    ['bg-surface-container-high text-on-surface', 'text-primary'],
    ['bg-surface-container-high text-on-surface', '']
  ];
  function pildoras(l, c) {
    var items = S.criteriosDe(l.tipo, l.tipo2).filter(function (cr) { return c.crit[cr.id].media != null; })
      .map(function (cr) { return [cr.icono, cr.nombre + ' ' + n1(c.crit[cr.id].media)]; });
    if (!items.length) items = (l.etiquetas || []).map(function (e) { return ['check_circle', e]; });
    return items.slice(0, 4).map(function (it, i) {
      return '<div class="flex items-center gap-1 px-2 py-1 rounded-DEFAULT ' + PILDORA[i][0] + ' min-w-0">' + ic(it[0], 'text-[14px] ' + PILDORA[i][1]) +
        '<span class="font-label-badge text-label-badge truncate">' + esc(it[1]) + '</span></div>';
    }).join('');
  }

  /* El hueco de la foto: hasta que haya fotos propias, el degradado del banner de Stitch con el icono del tipo. */
  function lienzo(l, alto) {
    if (l.foto) return '<div class="relative w-full ' + alto + ' bg-secondary overflow-hidden"><img src="' + esc(urlFoto(l.foto)) + '" alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover">';
    return '<div class="relative w-full ' + alto + ' bg-gradient-to-br from-secondary via-on-secondary-container to-secondary overflow-hidden">' +
      '<div class="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div>' +
      '<div class="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-tertiary-fixed/15 blur-xl pointer-events-none"></div>' +
      '<div class="absolute inset-0 flex items-center justify-center">' + ic(tipo(l.tipo).icono, 'text-[88px] text-secondary-fixed/25', true) + '</div>';
  }

  function tarjetaCarrusel(l) {
    var c = cifras(l), puntua = c.nota != null;
    return '<a href="#/local/' + l.id + '" class="flex-shrink-0 w-[290px] rounded-lg bg-surface-container-lowest shadow-md overflow-hidden flex flex-col transition-transform duration-200 active:scale-[0.99]">' +
      lienzo(l, 'h-44') +
      '<div class="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-on-surface/75 backdrop-blur-md text-surface-container-lowest font-label-badge text-label-badge"><span class="w-1.5 h-1.5 rounded-full bg-tertiary-fixed"></span><span>100% Sin Patrocinio</span></div>' +
      '<div class="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary-container shadow-md">' +
      (puntua ? '<span class="font-score-display text-score-display leading-none">' + n1(c.nota) + '</span><span class="font-label-micro text-label-micro font-bold opacity-80">/10</span>'
              : '<span class="font-label-prominent text-label-prominent leading-none py-1">Sin votos</span>') + '</div></div>' +
      '<div class="p-space-md flex flex-col gap-space-xs">' +
      '<div class="flex items-center justify-between gap-2"><span class="font-label-micro text-label-micro text-secondary font-bold uppercase tracking-wider truncate">' + rotulo(l) + '</span>' +
      '<span class="font-label-micro text-label-micro text-on-surface-variant flex items-center gap-0.5 flex-shrink-0">' + ic('how_to_vote', 'text-[13px] text-tertiary') + ' ' + c.votos + (c.votos === 1 ? ' voto' : ' votos') + '</span></div>' +
      '<h4 class="font-headline-md text-headline-md text-on-surface leading-tight">' + esc(l.nombre) + '</h4>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">' + nombreTipos(l) + (l.precio ? ' • ' + euros(l) : '') + '</p>' +
      '<div class="grid grid-cols-2 gap-1.5 pt-2">' + pildoras(l, c) + '</div></div></a>';
  }

  /* Fila de ranking: número grande, nombre y nota con estrella. */
  var COLOR_PUESTO = ['text-primary', 'text-secondary', 'text-on-surface-variant'];
  function filaRanking(l, i, valor, n, colorNota) {
    return '<a href="#/local/' + l.id + '" class="flex items-center justify-between p-2.5 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container transition-colors">' +
      '<div class="flex items-center gap-3 min-w-0"><span class="font-score-display text-score-display ' + (COLOR_PUESTO[i] || 'text-on-surface-variant') + ' flex-shrink-0 w-6 text-center">' + (i + 1) + '</span>' +
      '<div class="flex flex-col min-w-0"><span class="font-label-prominent text-label-prominent text-on-surface truncate">' + esc(l.nombre) + '</span>' +
      '<span class="font-label-micro text-label-micro text-on-surface-variant truncate">' + nombreTipos(l) + ' • ' + rotulo(l) + '</span></div></div>' +
      '<div class="flex flex-col items-end flex-shrink-0 pl-2"><div class="flex items-center gap-1 ' + (colorNota || 'text-tertiary') + '"><span class="font-headline-md text-headline-md leading-none">' + n1(valor) + '</span>' + ic('star', 'text-[16px]', true) + '</div>' +
      '<span class="font-label-micro text-label-micro text-on-surface-variant">' + n + (n === 1 ? ' voto' : ' votos') + '</span></div></a>';
  }
  /* Fila de un sitio que aún no puntúa: el icono de su tipo donde iría el puesto. */
  function filaSitio(l) {
    var c = cifras(l);
    return '<a href="#/local/' + l.id + '" class="flex items-center justify-between p-2.5 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container transition-colors">' +
      '<div class="flex items-center gap-3 min-w-0"><span class="w-6 flex justify-center flex-shrink-0">' + ic(tipo(l.tipo).icono, 'text-[22px] text-secondary') + '</span>' +
      '<div class="flex flex-col min-w-0"><span class="font-label-prominent text-label-prominent text-on-surface truncate">' + esc(l.nombre) + '</span>' +
      '<span class="font-label-micro text-label-micro text-on-surface-variant truncate">' + nombreTipos(l) + ' • ' + rotulo(l) + '</span></div></div>' +
      '<span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed font-label-badge text-label-badge flex-shrink-0 ml-2">' +
      (c.votos ? c.votos + (c.votos === 1 ? ' voto' : ' votos') : 'Sin votos') + '</span></a>';
  }

  /* Bloque de ranking de Stitch: círculo con icono, título, «Top 3» y las filas. */
  var CIRCULO = { tertiary: ['bg-tertiary-fixed text-on-tertiary-fixed', 'bg-tertiary-fixed/30 text-on-tertiary-fixed', 'text-tertiary'],
                  secondary: ['bg-secondary-fixed text-on-secondary-fixed', 'bg-secondary-fixed/50 text-on-secondary-fixed', 'text-primary'],
                  neutro: ['bg-surface-container-highest text-on-surface', 'bg-surface-container text-on-surface-variant', 'text-secondary'] };
  function bloqueRanking(icono, tono, titulo, sub, lista, criterio) {
    var t = CIRCULO[tono];
    var filas = lista.slice(0, 3).map(function (l, i) {
      var c = cifras(l), v = criterio ? c.crit[criterio].media : c.nota, n = criterio ? c.crit[criterio].n : c.votos;
      return filaRanking(l, i, v, n, t[2]);
    }).join('');
    return '<div class="flex flex-col rounded-lg bg-surface-container-lowest shadow-md p-space-md gap-space-md">' +
      '<div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 min-w-0"><div class="w-10 h-10 rounded-full ' + t[0] + ' flex items-center justify-center flex-shrink-0">' + ic(icono, 'text-[20px]', true) + '</div>' +
      '<div class="min-w-0"><h4 class="font-label-prominent text-label-prominent text-on-surface">' + titulo + '</h4><span class="font-label-micro text-label-micro text-on-surface-variant">' + sub + '</span></div></div>' +
      '<span class="px-2 py-0.5 rounded-full ' + t[1] + ' font-label-badge text-label-badge flex-shrink-0">Top 3</span></div>' +
      '<div class="flex flex-col gap-space-xs">' + (filas || '<p class="p-2.5 rounded-DEFAULT bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">Todavía ningún sitio llega a ' + S.MIN_VOTOS_RANKING + ' votos en esto. Si has ido a alguno, vota.</p>') + '</div></div>';
  }
  function cabeceraSeccion(antetitulo, titulo, sub) {
    return '<div class="flex flex-col gap-0.5 px-1"><span class="font-label-micro text-label-micro text-tertiary uppercase tracking-wider font-bold">' + antetitulo + '</span>' +
      '<h3 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">' + titulo + '</h3>' +
      (sub ? '<p class="font-body-sm text-body-sm text-on-surface-variant">' + sub + '</p>' : '') + '</div>';
  }
  function llamadaRecomendar() {
    return '<section class="rounded-lg bg-surface-container-high p-space-lg flex flex-col items-center text-center gap-space-sm relative overflow-hidden shadow-sm">' +
      '<div class="w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-md animate-bounce">' + ic('add_location_alt', 'text-[28px]') + '</div>' +
      '<div class="flex flex-col gap-1 max-w-xs"><h3 class="font-headline-md text-headline-md text-on-surface">¿Conoces un sitio auténtico?</h3>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant">Recomiéndalo. Darlo de alta es gratis y ningún local puede pagar por entrar.</p></div>' +
      '<a class="mt-1 w-full max-w-xs py-3 px-6 rounded-full bg-primary-container text-on-primary-container font-label-prominent text-label-prominent shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2" href="#/recomendar">' +
      ic('add_circle', 'text-[18px]') + '<span>Recomendar un sitio</span></a></section>';
  }
  function ordenarPorNota(lista, criterio) {
    return lista
      .map(function (l) { var c = cifras(l); return { l: l, v: criterio ? (c.crit[criterio] && c.crit[criterio].media) : c.nota, votos: criterio ? (c.crit[criterio] ? c.crit[criterio].n : 0) : c.votos }; })
      .filter(function (x) { return x.v != null && x.votos >= S.MIN_VOTOS_RANKING; })
      .sort(function (a, b) { return b.v - a.v; })
      .map(function (x) { return x.l; });
  }
  function porVotos(lista) {
    return lista.slice().sort(function (a, b) { return (b.votos - a.votos) || a.nombre.localeCompare(b.nombre, 'es'); });
  }

  /* ───────── pantallas ───────── */
  var P = {};

  /* Portada: el manifiesto de Stitch, con los pilares que de verdad cumple Salimos. */
  P.bienvenida = function () {
    seccion('Bienvenida');
    var pilares = [
      ['money_off', 'bg-error-container text-on-error-container', 'Pilar 01', 'Aquí nadie paga', 'Ni locales, ni marcas, ni anuncios. Ningún sitio puede comprar su puesto ni pagar por un diez.'],
      ['checklist_rtl', 'bg-primary-fixed text-on-primary-fixed', 'Pilar 02', 'Notas por partes', 'Cada sitio se vota en lo que importa de verdad. Cada uno mira lo que más le importa.', ['Limpieza', 'Ambiente', 'Servicio', 'Precio justo', 'Parking', 'Guagua']],
      ['fingerprint', 'bg-tertiary-fixed text-on-tertiary-fixed', 'Pilar 03', 'Una persona, un voto por sitio', 'Entras con tu correo y un código. Puedes cambiar tu voto cuando quieras, pero no votar dos veces.'],
      ['hub', 'bg-secondary-fixed text-on-secondary-fixed', 'Pilar 04', 'Del Grupo Saneas', 'Salimos es gratis y es de Gran Canaria. De momento, solo nuestra isla.']
    ];
    vista.innerHTML = '<div class="flex flex-col w-full px-margin pb-space-xl animate-screen-enter" id="manifiesto">' +
      '<section class="flex flex-col items-center text-center my-space-md relative">' +
      '<div class="relative flex items-center justify-center mb-space-lg mt-space-md"><div class="absolute w-24 h-24 rounded-full bg-primary-container/20 animate-pulse"></div><div class="absolute w-32 h-32 rounded-full bg-secondary-fixed/30"></div>' +
      '<div class="relative w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform">' + ic('verified', 'text-primary-container text-[42px]', true) +
      '<span class="absolute -top-1 -right-1 flex h-4 w-4"><span class="relative inline-flex rounded-full h-4 w-4 bg-tertiary-container items-center justify-center">' + ic('bolt', 'text-on-tertiary-container text-body-sm font-bold') + '</span></span></div></div>' +
      '<div class="inline-flex items-center gap-1 bg-primary-fixed text-on-primary-fixed px-space-md py-0.5 rounded-full mb-space-sm font-label-badge text-label-badge">' + ic('shield_lock', 'text-body-sm', true) + ' GRUPO SANEAS • GRAN CANARIA</div>' +
      '<h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight mb-space-xs max-w-xs">El ocio de Gran Canaria, sin trucos ni pagos</h1>' +
      '<p class="font-body-md text-body-md text-on-surface-variant max-w-sm">Dónde comer, tomar algo, bailar o ligar, según la gente que sale. Creado por <strong class="font-semibold text-secondary">Grupo Saneas</strong>: aquí ningún local puede comprar su puesto.</p></section>' +
      '<section class="flex flex-col gap-space-md mb-space-lg"><div class="flex items-center justify-between px-space-xs"><h2 class="font-headline-md text-headline-md text-on-surface">Los 4 pilares</h2>' +
      '<span class="font-label-badge text-label-badge bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full">Salimos</span></div>' +
      pilares.map(function (p) {
        return '<div class="pillar-card group cursor-pointer p-space-lg rounded-2xl bg-surface-container-low shadow-sm flex flex-col gap-space-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]">' +
          '<div class="flex items-center justify-between"><div class="w-10 h-10 rounded-xl ' + p[1] + ' flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">' + ic(p[0], 'text-body-lg font-bold') + '</div>' +
          '<span class="pillar-badge font-label-badge text-label-badge bg-surface-container-highest text-on-surface-variant px-space-sm py-0.5 rounded-full transition-all duration-300">' + p[2] + '</span></div>' +
          '<h3 class="font-label-prominent text-headline-md text-on-surface mt-1">' + p[3] + '</h3><p class="font-body-md text-body-md text-on-surface-variant">' + p[4] + '</p>' +
          (p[5] ? '<div class="flex flex-wrap gap-1 mt-space-xs">' + p[5].map(function (x) { return '<span class="font-label-badge text-label-badge bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded-md">' + x + '</span>'; }).join('') + '</div>' : '') + '</div>';
      }).join('') + '</section>' +
      '<div class="flex flex-col gap-space-sm pt-space-xs sticky bottom-0 bg-gradient-to-t from-surface via-surface to-transparent pb-space-sm">' +
      '<button type="button" class="w-full h-14 bg-primary-container text-on-primary-container font-label-prominent text-label-prominent rounded-full flex items-center justify-center gap-space-sm shadow-lg hover:brightness-105 active:scale-95 transition-all" id="empezar">' + ic('how_to_reg', 'text-headline-md', true) + '<span>Entrar en Salimos</span></button>' +
      '<a class="w-full py-space-sm text-center font-label-prominent text-label-prominent text-secondary hover:text-primary transition-colors" href="#/como-funciona">Cómo funciona</a></div></div>';

    /* El pilar que queda en el centro de la pantalla se enciende, como en Stitch. */
    var cartas = vista.querySelectorAll('.pillar-card');
    cartas[0].classList.add('pillar-active');
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { cartas.forEach(function (c) { c.classList.remove('pillar-active'); }); e.target.classList.add('pillar-active'); } });
      }, { rootMargin: '-20% 0px -20% 0px', threshold: 0.5 });
      cartas.forEach(function (c) { obs.observe(c); });
    }
    document.getElementById('empezar').onclick = function () {
      var b = this; guardar('visto', 1);
      b.innerHTML = ic('sync', 'text-headline-md animate-spin') + '<span>Entrando…</span>';
      document.getElementById('manifiesto').classList.add('page-exit');
      setTimeout(function () { location.hash = '#/explorar'; }, 450);
    };
  };

  var filtro = { tipo: '', zona: '', texto: '', edades: [] };
  var PILL_ON = 'bg-primary-container text-on-primary-container shadow-sm', PILL_OFF = 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest';
  var CHIP_ON = 'bg-secondary-fixed text-on-secondary-fixed', CHIP_OFF = 'bg-surface-container-lowest text-on-surface';

  P.explorar = function () {
    seccion('Explorar');
    var des = S.destino(DESTINO);
    var votosTot = LOCALES.reduce(function (a, l) { return a + l.votos; }, 0);
    var zonaPill = function (id, txt) { return '<button type="button" class="zone-pill whitespace-nowrap px-4 py-2 rounded-full font-label-prominent text-label-prominent transition-all ' + (filtro.zona === id ? PILL_ON : PILL_OFF) + '" data-zona="' + id + '" aria-pressed="' + (filtro.zona === id) + '">' + txt + '</button>'; };
    var catChip = function (id, icono, txt) { return '<button type="button" class="category-chip flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-sm active:scale-95 transition-all flex-shrink-0 ' + (filtro.tipo === id ? CHIP_ON : CHIP_OFF) + '" data-tipo="' + id + '" aria-pressed="' + (filtro.tipo === id) + '">' + ic(icono, 'text-[18px]') + '<span class="font-label-prominent text-label-prominent whitespace-nowrap">' + txt + '</span></button>'; };
    var edadPill = function (e) { var on = filtro.edades.indexOf(e.id) >= 0; return '<button type="button" class="zone-pill whitespace-nowrap px-4 py-2 rounded-full font-label-prominent text-label-prominent transition-all ' + (on ? PILL_ON : PILL_OFF) + '" data-edad="' + e.id + '" aria-pressed="' + on + '">' + e.nombre + ' años</button>'; };

    vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile sm:px-gutter space-y-space-lg pb-6 pt-space-md animate-screen-enter">' +
      /* Banner de Stitch */
      '<section class="relative overflow-hidden rounded-lg bg-gradient-to-br from-secondary via-on-secondary-container to-secondary p-space-lg shadow-xl text-on-secondary">' +
      '<div class="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div><div class="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-tertiary-fixed/15 blur-xl pointer-events-none"></div>' +
      '<div class="relative z-10 flex flex-col gap-space-sm"><div class="flex flex-wrap items-center justify-between gap-space-xs">' +
      '<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md"><span class="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-ping"></span><span class="font-label-badge text-label-badge text-tertiary-fixed uppercase tracking-wider">0% Publicidad • 100% Voto Real</span></div>' +
      '<div class="flex items-center gap-1 text-secondary-fixed font-label-micro text-label-micro">' + ic('verified', 'text-[15px] text-tertiary-fixed', true) + '<span>Grupo Saneas</span></div></div>' +
      '<div class="mt-1"><h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-secondary tracking-tight">El Ocio de ' + esc(DESTINO) + ' <span class="text-primary-container">Sin Filtros</span> Ni Pagos</h2>' +
      '<p class="font-body-md text-body-md text-secondary-fixed mt-1 opacity-90 leading-snug">Lo vota la gente que sale. Sin comisiones, acuerdos ni reseñas patrocinadas.</p></div>' +
      '<div class="grid grid-cols-3 gap-space-xs mt-space-xs pt-space-xs">' +
      '<div class="flex flex-col p-2 rounded-DEFAULT bg-surface-container-lowest/10 backdrop-blur-sm text-center"><span class="font-headline-md text-headline-md text-primary-fixed">' + votosTot.toLocaleString('es-ES') + '</span><span class="font-label-micro text-label-micro text-secondary-fixed">Votos libres</span></div>' +
      '<div class="flex flex-col p-2 rounded-DEFAULT bg-surface-container-lowest/10 backdrop-blur-sm text-center"><span class="font-headline-md text-headline-md text-tertiary-fixed">' + LOCALES.length + '</span><span class="font-label-micro text-label-micro text-secondary-fixed">Sitios</span></div>' +
      '<div class="flex flex-col p-2 rounded-DEFAULT bg-surface-container-lowest/10 backdrop-blur-sm text-center"><span class="font-headline-md text-headline-md text-surface-container-lowest">0€</span><span class="font-label-micro text-label-micro text-secondary-fixed">Pagos de locales</span></div>' +
      '</div></div></section>' +
      /* Buscador (el de la pantalla Mapa de Stitch) */
      '<label class="flex items-center gap-3 h-14 px-5 rounded-full bg-surface-container-lowest shadow-md">' + ic('search', 'text-[24px] text-secondary') +
      '<span class="sr-only">Buscar un sitio</span><input type="search" id="busca" class="flex-1 min-w-0 bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none" placeholder="Buscar zona, bar o restaurante…" value="' + esc(filtro.texto) + '" autocomplete="off"></label>' +
      /* Cerca de mí */
      botonCerca() +
      /* Zonas */
      '<section class="flex flex-col gap-space-xs"><div class="flex items-center justify-between px-1"><span class="font-label-prominent text-label-prominent text-on-surface">' + esc(des.titulo) + '</span>' +
      '<button type="button" class="font-label-micro text-label-micro text-primary flex items-center gap-0.5" data-destinos>' + ic(des.icono, 'text-[13px]') + ' ' + esc(DESTINO) + ic('expand_more', 'text-[13px]') + '</button></div>' +
      '<div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1 -mx-gutter-mobile px-gutter-mobile sm:mx-0 sm:px-0">' +
      zonaPill('', esc(des.todo)) + des.zonas.map(function (z) { return zonaPill(z.id, esc(z.nombre)); }).join('') + '</div></section>' +
      /* Tipos */
      '<section class="flex items-center gap-space-xs overflow-x-auto no-scrollbar -mx-gutter-mobile px-gutter-mobile sm:mx-0 sm:px-0 py-1">' +
      catChip('', 'apps', 'Todo') + S.TIPOS.map(function (t) { return catChip(t.id, t.icono, t.plural); }).join('') + '</section>' +
      /* Edades del público */
      '<section class="flex flex-col gap-space-xs"><div class="flex items-center justify-between px-1"><span class="font-label-prominent text-label-prominent text-on-surface">Con gente de…</span>' +
      '<span class="font-label-micro text-label-micro text-primary flex items-center gap-0.5">' + ic('group', 'text-[13px]') + ' Puedes marcar varios</span></div>' +
      '<div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1 -mx-gutter-mobile px-gutter-mobile sm:mx-0 sm:px-0">' + S.EDADES.map(edadPill).join('') + '</div></section>' +
      /* Carrusel */
      '<section class="flex flex-col gap-space-sm pt-2"><div class="flex items-center justify-between px-1"><div class="flex items-center gap-2">' + ic('local_fire_department', 'text-primary-container text-[22px]') +
      '<h3 class="font-headline-md text-headline-md text-on-surface tracking-tight">Lo más votado</h3></div>' +
      '<span class="font-label-prominent text-label-prominent text-primary" id="cuantos"></span></div>' +
      '<div class="flex items-stretch gap-space-md overflow-x-auto no-scrollbar -mx-gutter-mobile px-gutter-mobile sm:mx-0 sm:px-0 py-2" id="carrusel"></div></section>' +
      /* Rankings por criterio */
      '<section class="flex flex-col gap-space-md pt-2">' + cabeceraSeccion('Sin trucos ni algoritmos ocultos', 'Rankings por Criterio Imparcial', 'Solo entran los sitios con ' + S.MIN_VOTOS_RANKING + ' votos o más.') +
      '<div class="flex flex-col gap-space-md" id="rankings"></div>' +
      '<a class="font-label-prominent text-label-prominent text-primary flex items-center justify-center gap-0.5" href="#/top">Ver todas las listas ' + ic('chevron_right', 'text-[16px]') + '</a></section>' +
      llamadaRecomendar() + '</div>';

    vista.querySelectorAll('[data-zona]').forEach(function (b) {
      b.onclick = function () { filtro.zona = b.dataset.zona; P.explorar(); };
    });
    vista.querySelectorAll('[data-destinos]').forEach(function (b) { b.onclick = abrirDestinos; });
    vista.querySelectorAll('[data-tipo]').forEach(function (b) {
      b.onclick = function () { filtro.tipo = b.dataset.tipo; P.explorar(); };
    });
    vista.querySelectorAll('[data-edad]').forEach(function (b) {
      b.onclick = function () {
        var i = filtro.edades.indexOf(b.dataset.edad);
        if (i >= 0) filtro.edades.splice(i, 1); else filtro.edades.push(b.dataset.edad);
        b.className = b.className.replace(i >= 0 ? PILL_ON : PILL_OFF, i >= 0 ? PILL_OFF : PILL_ON);
        b.setAttribute('aria-pressed', i < 0);
        pintarResultados();
      };
    });
    document.getElementById('busca').oninput = function (e) { filtro.texto = e.target.value; pintarResultados(); };
    pintarResultados();
  };

  function sinTildes(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function filtrados() {
    var q = sinTildes(filtro.texto.trim());
    return LOCALES.filter(function (l) {
      if (filtro.tipo && l.tipo !== filtro.tipo && l.tipo2 !== filtro.tipo) return false;
      if (filtro.zona && l.zona !== filtro.zona) return false;
      if (filtro.edades.length && !encajaEdad(mayoria(cifras(l)), filtro.edades)) return false;
      if (q && sinTildes(l.nombre + ' ' + l.municipio + ' ' + (l.barrio || '') + ' ' + tipo(l.tipo).nombre + ' ' + ((zona(l.zona) || {}).nombre || '')).indexOf(q) < 0) return false;
      return true;
    });
  }
  function pintarResultados() {
    var base = filtrados();
    document.getElementById('cuantos').textContent = base.length + (base.length === 1 ? ' sitio' : ' sitios');
    document.getElementById('carrusel').innerHTML = base.length ? porVotos(base).map(tarjetaCarrusel).join('')
      : '<div class="w-full rounded-lg bg-surface-container-lowest shadow-md p-space-lg text-center font-body-md text-body-md text-on-surface-variant">No hay ningún sitio con estos filtros todavía.<br><a class="font-label-prominent text-label-prominent text-primary" href="#/recomendar">¿Conoces uno? Recomiéndalo</a></div>';
    var con = function (cid) { return base.filter(function (l) { return S.criteriosDe(l.tipo, l.tipo2).some(function (c) { return c.id === cid; }); }); };
    document.getElementById('rankings').innerHTML =
      bloqueRanking('sanitizer', 'tertiary', 'Campeones de Limpieza', 'Baños, barra, mesas y cocina', ordenarPorNota(con('limpieza'), 'limpieza'), 'limpieza') +
      bloqueRanking('local_bar', 'secondary', 'Reyes de las Consumiciones', 'Lo que comes y bebes: calidad y cantidad', ordenarPorNota(con('consumiciones'), 'consumiciones'), 'consumiciones') +
      bloqueRanking('local_parking', 'neutro', 'Fácil Parking & Cero Estrés', 'Si se aparca fácil', ordenarPorNota(con('parking'), 'parking'), 'parking');
  }

  /* Top Listas: el mejor en cada cosa, toda la isla. */
  P.top = function () {
    seccion('Top Listas');
    var tonos = ['tertiary', 'secondary', 'neutro'];
    var bloques = [bloqueRanking('emoji_events', 'secondary', 'Los mejor votados', 'La nota media de todo', ordenarPorNota(LOCALES), null)]
      .concat(S.BASE.concat(S.EXTRAS).map(function (c, i) {
        var aplica = LOCALES.filter(function (l) { return S.criteriosDe(l.tipo, l.tipo2).some(function (x) { return x.id === c.id; }); });
        return bloqueRanking(c.icono, tonos[i % 3], 'Lo mejor en ' + esc(c.nombre.toLowerCase()), esc(c.ayuda), ordenarPorNota(aplica, c.id), c.id);
      }));
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile sm:px-gutter gap-space-md pb-6 pt-space-md animate-screen-enter">' +
      cabeceraSeccion('Sin trucos ni algoritmos ocultos', 'Top Listas', 'Lo que más te importa hoy, ordenado por lo que vota la gente. Solo entran los sitios con ' + S.MIN_VOTOS_RANKING + ' votos o más.') +
      bloques.join('') + llamadaRecomendar() + '</div>';
  };

  P.zonas = function () {
    seccion('Zonas');
    var des = S.destino(DESTINO);
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile sm:px-gutter gap-space-md pb-6 pt-space-md animate-screen-enter">' +
      cabeceraSeccion(esc(DESTINO) + ', de punta a punta', 'Por zonas', 'Los sitios de cada zona: primero los que ya tienen nota.') +
      botonCerca() +
      des.zonas.map(function (z) {
        var enZona = LOCALES.filter(function (l) { return l.zona === z.id; });
        var top = ordenarPorNota(enZona), resto = porVotos(enZona.filter(function (l) { return top.indexOf(l) < 0; }));
        var filas = top.map(function (l, i) { var c = cifras(l); return filaRanking(l, i, c.nota, c.votos); }).join('') + resto.map(filaSitio).join('');
        return '<div class="flex flex-col rounded-lg bg-surface-container-lowest shadow-md p-space-md gap-space-md">' +
          '<div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 min-w-0"><div class="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center flex-shrink-0">' + ic('location_on', 'text-[20px]', true) + '</div>' +
          '<div class="min-w-0"><h4 class="font-label-prominent text-label-prominent text-on-surface">' + esc(z.nombre) + '</h4><span class="font-label-micro text-label-micro text-on-surface-variant">' + esc(z.lugares.join(' • ')) + '</span></div></div>' +
          '<span class="px-2 py-0.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed font-label-badge text-label-badge flex-shrink-0">' + enZona.length + (enZona.length === 1 ? ' sitio' : ' sitios') + '</span></div>' +
          '<div class="flex flex-col gap-space-xs">' + (filas || '<p class="p-2.5 rounded-DEFAULT bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">Todavía no hay sitios aquí. <a class="font-bold text-primary" href="#/recomendar">Recomienda uno</a></p>') + '</div></div>';
      }).join('') + '</div>';
  };

  /* Ficha: «Detalle Local» de Stitch. */
  var CRIT_COLOR = [
    ['bg-secondary-container/20 text-secondary', 'text-tertiary', 'bg-tertiary-container'],
    ['bg-primary-container/20 text-primary', 'text-primary', 'bg-primary-container'],
    ['bg-secondary/15 text-secondary', 'text-secondary', 'bg-secondary'],
    ['bg-tertiary/15 text-tertiary', 'text-tertiary', 'bg-tertiary'],
    ['bg-primary/15 text-primary', 'text-primary', 'bg-primary-container'],
    ['bg-error-container text-on-error-container', 'text-secondary', 'bg-secondary-container'],
    ['bg-surface-container-high text-on-surface', 'text-secondary', 'bg-secondary-container']
  ];
  function guardados() { return leer('guardados', []); }

  P.local = function (id) {
    var l = local(id); if (!l) return P.noExiste();
    seccion('Detalle Local');
    var c = cifras(l), m = mayoria(c);
    var mapa = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.nombre + ', ' + (l.direccion || l.barrio || '') + ', ' + l.municipio + ', ' + l.destino);

    var criterios = S.criteriosDe(l.tipo, l.tipo2).map(function (cr, i) {
      var d = c.crit[cr.id], k = CRIT_COLOR[i % CRIT_COLOR.length];
      return '<div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm"><div class="flex items-center justify-between mb-1.5"><div class="flex items-center gap-2 min-w-0">' +
        '<div class="w-8 h-8 rounded-full ' + k[0] + ' flex items-center justify-center flex-shrink-0">' + ic(cr.icono, 'text-[18px]') + '</div>' +
        '<div class="min-w-0"><h4 class="font-body-lg text-body-lg text-on-surface font-bold">' + esc(cr.nombre) + '</h4><p class="font-body-sm text-body-sm text-on-surface-variant">' + esc(cr.ayuda) + (d.media == null ? '' : ' • ' + d.n + (d.n === 1 ? ' voto' : ' votos')) + '</p></div></div>' +
        '<span class="font-score-display text-score-display ' + (d.media == null ? 'text-on-surface-variant' : k[1]) + ' ml-2">' + (d.media == null ? '–' : n1(d.media)) + '</span></div>' +
        '<div class="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden"><div class="h-full ' + k[2] + ' rounded-full" style="width: ' + (d.media == null ? 0 : d.media * 10) + '%;"></div></div></div>';
    }).join('');

    /* Veredicto: la respuesta más votada de cada pregunta rápida, con su porcentaje. */
    var ICONO_RAPIDA = { volver: 'thumb_up', precio: 'price_check', guagua: 'directions_bus', edad: 'group' };
    var veredicto = S.RAPIDAS.map(function (r) {
      var d = c.rapidas[r.id] || {}, tot = 0, mejor = null;
      r.opciones.forEach(function (o) { tot += d[o[0]] || 0; if (!mejor || (d[o[0]] || 0) > (d[mejor[0]] || 0)) mejor = o; });
      if (!tot) return '';
      return '<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-badge text-label-badge shadow-sm">' + ic(ICONO_RAPIDA[r.id], 'text-[16px] text-tertiary') +
        '<span>' + esc(r.pregunta.replace(/[¿?]/g, '')) + ': ' + esc(mejor[1]) + ' • ' + Math.round((d[mejor[0]] || 0) / tot * 100) + ' %</span></div>';
    }).join('');
    var etiquetas = (l.etiquetas || []).map(function (e) {
      return '<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-badge text-label-badge shadow-sm">' + ic('check_circle', 'text-[16px] text-tertiary') + '<span>' + esc(e) + '</span></div>';
    }).join('');
    var dato = function (icono, html) { return '<div class="flex items-start gap-2 bg-surface-container-lowest p-2.5 rounded-DEFAULT">' + ic(icono, 'text-[18px] text-secondary flex-shrink-0') + '<span class="font-body-md text-body-md text-on-surface min-w-0 break-words">' + html + '</span></div>'; };
    var datos = [
      l.direccion ? dato('location_on', esc(l.direccion)) : '',
      l.telefono ? dato('call', '<a class="font-bold text-secondary" href="tel:+34' + l.telefono.replace(/\D/g, '') + '">' + esc(l.telefono) + '</a>') : '',
      l.web ? dato('language', '<a class="font-bold text-secondary" href="' + esc(l.web) + '" target="_blank" rel="noopener">' + esc(l.web.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a>') : '',
      l.precios ? dato('euro', esc(l.precios)) : '',
      l.consejo ? dato('lightbulb', esc(l.consejo)) : ''
    ].join('');
    var guardado = guardados().indexOf(id) >= 0;

    vista.innerHTML = '<div class="flex flex-col w-full animate-screen-enter">' +
      '<div class="px-gutter pt-space-md pb-space-sm flex items-center justify-between gap-2"><div class="flex items-center gap-space-xs min-w-0">' +
      '<button type="button" class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-all flex-shrink-0" id="atras" aria-label="Volver">' + ic('arrow_back_ios_new', 'text-[22px]') + '</button>' +
      '<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary/10 text-tertiary min-w-0">' + ic('verified', 'text-[16px]', true) + '<span class="font-label-badge text-label-badge uppercase tracking-wider truncate">Votos de la comunidad</span></div></div>' +
      '<div class="flex items-center gap-space-xs flex-shrink-0">' +
      '<button type="button" class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-transform active:scale-95 shadow-sm" id="btn-share" aria-label="Compartir">' + ic('share', 'text-[20px]') + '</button>' +
      '<button type="button" class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-transform active:scale-95 shadow-sm" id="btn-bookmark" aria-label="Guardar" aria-pressed="' + guardado + '">' +
      '<span class="material-symbols-outlined text-[20px]' + (guardado ? ' text-primary-container' : '') + '" id="bookmark-icon"' + (guardado ? ' style="font-variation-settings: \'FILL\' 1;"' : '') + ' aria-hidden="true">' + (guardado ? 'bookmark' : 'bookmark_border') + '</span></button></div></div>' +
      /* Cabecera con el degradado donde irá la foto */
      '<div class="px-gutter pb-space-md"><div class="relative w-full h-56 rounded-lg overflow-hidden shadow-md group" id="cab-foto">' + lienzo(l, 'h-full') + '</div>' +
      '<div class="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/25 to-transparent"></div>' +
      '<div class="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm"><div class="w-2.5 h-2.5 rounded-full bg-tertiary-container animate-ping"></div><span class="font-label-badge text-label-badge text-on-surface">100% Libre • Sin Patrocinio</span></div>' +
      (l.precio ? '<div class="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-secondary text-on-secondary font-label-prominent text-label-prominent flex items-center gap-1">' + euros(l) + '</div>' : '') +
      '<div class="absolute bottom-3 left-3 right-3 text-surface-container-lowest flex items-end justify-between gap-2"><div class="min-w-0">' +
      '<span class="font-label-badge text-label-badge uppercase tracking-wider text-primary-fixed-dim">' + rotulo(l) + '</span>' +
      '<h2 class="font-headline-lg-mobile text-headline-lg-mobile text-surface-container-lowest leading-tight">' + esc(l.nombre) + '</h2></div>' +
      (m ? '<span class="px-2.5 py-1 rounded-full bg-surface-container-lowest/20 backdrop-blur-md font-label-micro text-label-micro text-surface-container-lowest flex-shrink-0">Gente de ' + m.nombre.replace('De ', '').toLowerCase() + '</span>' : '') +
      '</div></div><p class="hidden pt-1.5 font-label-micro text-label-micro text-on-surface-variant text-right" id="credito-google"></p></div>' +
      '<div class="px-gutter pb-space-md"><p class="font-body-md text-body-md text-on-surface-variant flex items-center gap-1.5">' + ic('explore', 'text-[18px] text-secondary flex-shrink-0') +
      '<span>' + nombreTipos(l) + ' • ' + esc(l.municipio) + '</span></p></div>' +
      /* Tarjeta azul de la nota */
      '<div class="px-gutter pb-space-md"><div class="relative overflow-hidden rounded-lg bg-secondary text-on-secondary p-space-lg shadow-xl">' +
      '<div class="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none"></div>' +
      '<div class="flex items-center justify-between gap-space-md relative z-10"><div class="flex items-center gap-space-md">' +
      '<div class="relative flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-lg">' + ic('ecg_heart', 'text-[32px] text-on-secondary', true) +
      '<div class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container shadow">' + ic('check', 'text-[16px] font-bold') + '</div></div>' +
      '<div><div class="flex items-baseline gap-1"><span class="font-display-hero text-display-hero text-on-secondary tracking-tight">' + (c.nota == null ? '–' : n1(c.nota)) + '</span><span class="font-headline-md text-headline-md text-primary-fixed-dim">/ 10</span></div>' +
      '<p class="font-label-prominent text-label-prominent text-surface-container-high">Nota Salimos</p></div></div>' +
      '<div class="text-right"><div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-on-secondary font-label-micro text-label-micro">' + ic('how_to_reg', 'text-[14px]') + '<span>Con cuenta</span></div>' +
      '<p class="font-body-sm text-body-sm text-surface-variant mt-1">' + (c.votos ? c.votos + (c.votos === 1 ? ' voto real' : ' votos reales') : 'Todavía sin votos') + '</p></div></div>' +
      '<div class="mt-space-md pt-space-sm bg-on-secondary-fixed/30 rounded-DEFAULT px-3 py-2 flex items-center justify-between gap-2 relative z-10"><div class="flex items-center gap-2">' + ic('shield_lock', 'text-[18px] text-tertiary-fixed') +
      '<span class="font-label-micro text-label-micro text-surface-container-lowest">' + (c.votos < S.MIN_VOTOS_RANKING ? 'Entra en los rankings con ' + S.MIN_VOTOS_RANKING + ' votos' : 'Una persona, un voto por sitio') + '</span></div>' +
      '<span class="font-label-badge text-label-badge text-primary-fixed flex-shrink-0">100% ' + esc(l.destino.toUpperCase()) + '</span></div></div></div>' +
      tarjetaCheckin(l) +
      '<div class="px-gutter pb-space-lg" id="fotos"></div>' +
      (etiquetas ? '<div class="px-gutter pb-space-lg"><div class="flex items-center justify-between mb-space-xs"><h3 class="font-headline-md text-headline-md text-on-surface">Lo que tiene</h3><span class="font-label-micro text-label-micro text-secondary font-semibold">Datos del sitio</span></div>' +
        '<div class="flex flex-wrap gap-space-xs mt-space-xs">' + etiquetas + '</div></div>' : '') +
      '<div class="px-gutter pb-space-lg"><div class="flex items-center justify-between mb-space-xs"><h3 class="font-headline-md text-headline-md text-on-surface">Veredicto de la Comunidad</h3><span class="font-label-micro text-label-micro text-secondary font-semibold">Basado en votos</span></div>' +
      '<div class="flex flex-wrap gap-space-xs mt-space-xs">' + (veredicto || '<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-badge text-label-badge shadow-sm">' + ic('how_to_vote', 'text-[16px] text-primary-container') + '<span>Todavía sin respuestas: sé el primero</span></div>') + '</div></div>' +
      '<div class="px-gutter pb-space-lg"><div class="flex items-center justify-between mb-space-sm"><h3 class="font-headline-md text-headline-md text-on-surface">Evaluación Multicriterio</h3><span class="font-label-badge text-label-badge text-on-surface-variant">' + S.criteriosDe(l.tipo, l.tipo2).length + ' Dimensiones</span></div>' +
      '<div class="flex flex-col gap-space-sm">' + criterios + '</div></div>' +
      (datos ? '<div class="px-gutter pb-space-lg"><div class="bg-surface-container p-space-md rounded-lg"><div class="flex items-center gap-2 mb-2">' + ic('storefront', 'text-[18px] text-secondary') +
        '<h4 class="font-label-prominent text-label-prominent text-on-surface">Cómo encontrarlo</h4></div><div class="flex flex-col gap-2">' + datos + '</div></div></div>' : '') +
      (l.comentarios ? '<div class="px-gutter pb-space-xl" id="comentarios" aria-busy="true"><div class="flex items-center justify-between mb-space-sm"><h3 class="font-headline-md text-headline-md text-on-surface">Últimas Evaluaciones</h3>' +
        '<span class="font-label-badge text-label-badge text-secondary">' + l.comentarios + (l.comentarios === 1 ? ' comentario' : ' comentarios') + '</span></div><div class="flex flex-col gap-space-sm lista"><p class="font-body-sm text-body-sm text-on-surface-variant">Cargando comentarios…</p></div></div>' : '') +
      '<div class="sticky bottom-0 inset-x-0 bg-surface-container-lowest/90 backdrop-blur-xl p-space-md shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-40"><div class="flex items-center gap-space-sm max-w-lg mx-auto">' +
      '<a class="flex-1 h-12 rounded-full bg-surface-container-high text-on-surface font-label-prominent text-label-prominent flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-transform active:scale-95 shadow-sm" href="' + mapa + '" target="_blank" rel="noopener">' + ic('map', 'text-[20px] text-secondary') + '<span>Ver en mapa</span></a>' +
      '<a class="flex-[1.4] h-12 rounded-full bg-primary-container text-on-surface font-headline-md text-[15px] flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 hover:brightness-105" href="#/votar/' + l.id + '">' + ic('how_to_vote', 'text-[20px]') + '<span>' + (c.mio ? 'Cambiar mi voto' : 'Evaluar este local') + '</span></a></div></div></div>';

    document.getElementById('atras').onclick = function () { if (history.length > 1) history.back(); else location.hash = '#/explorar'; };
    var bc = document.getElementById('checkin'); if (bc) bc.onclick = function () { hacerCheckin(l, bc); };
    pintarFotos(l);
    fotoGoogle(l);
    document.getElementById('btn-bookmark').onclick = function () {
      var g = guardados(), i = g.indexOf(id), on = i < 0, b = document.getElementById('bookmark-icon');
      if (on) g.push(id); else g.splice(i, 1);
      guardar('guardados', g);
      b.textContent = on ? 'bookmark' : 'bookmark_border'; b.style.fontVariationSettings = on ? "'FILL' 1" : "'FILL' 0"; b.classList.toggle('text-primary-container', on);
      this.setAttribute('aria-pressed', on); tostada(on ? 'Guardado en «Tú».' : 'Quitado de guardados.');
    };
    document.getElementById('btn-share').onclick = function () {
      var url = location.origin + location.pathname + '#/local/' + l.id;
      if (navigator.share) navigator.share({ title: l.nombre + ' · Salimos', text: l.nombre + ' en Salimos: lo que vota la gente que sale en ' + l.destino + '.', url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { tostada('Enlace copiado.'); });
    };
    pintarComentarios(l);
  };

  function haceCuanto(iso) {
    var d = (Date.now() - new Date(iso).getTime()) / 864e5;
    if (d < 1) return 'Hoy'; if (d < 2) return 'Ayer'; if (d < 7) return 'Hace ' + Math.floor(d) + ' días';
    if (d < 14) return 'Hace 1 semana'; if (d < 60) return 'Hace ' + Math.floor(d / 7) + ' semanas';
    return new Date(iso).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  async function pintarComentarios(l) {
    var caja = document.getElementById('comentarios'); if (!caja) return;
    var r = await sb.rpc('salimos_comentarios', { p_local: l.id });
    if (!document.body.contains(caja)) return;
    caja.removeAttribute('aria-busy');
    /* Lo que este móvil ha denunciado o bloqueado no se vuelve a ver aquí. */
    var bloqueados = leer('bloqueados', []), denunciados = leer('denunciados', []);
    var lista = (r.error ? [] : r.data).filter(function (k) { return bloqueados.indexOf(k.autor) < 0 && denunciados.indexOf(l.id + ':' + k.autor) < 0; });
    if (r.error) { caja.querySelector('.lista').innerHTML = '<p class="font-body-sm text-body-sm text-on-surface-variant">No se han podido cargar.</p>'; return; }
    caja.querySelector('.lista').innerHTML = lista.length ? lista.map(function (k) {
      var acciones = k.mio ? '' : '<div class="flex items-center gap-2 mt-3">' +
        '<button type="button" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label-badge text-label-badge active:scale-95 transition-all" data-denunciar="' + esc(k.autor) + '">' + ic('flag', 'text-[14px]') + 'Denunciar</button>' +
        '<button type="button" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label-badge text-label-badge active:scale-95 transition-all" data-bloquear="' + esc(k.autor) + '">' + ic('block', 'text-[14px]') + 'Bloquear a esta persona</button></div>';
      return '<div class="bg-surface-container-lowest p-space-md rounded-lg shadow-sm"><div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2">' +
        '<div class="w-9 h-9 rounded-full ' + (k.mio ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-secondary-fixed text-on-secondary-fixed') + ' flex items-center justify-center">' + ic('person', 'text-[20px]', true) + '</div>' +
        '<div><div class="flex items-center gap-1.5"><span class="font-label-prominent text-label-prominent text-on-surface">' + (k.mio ? 'Tu comentario' : k.verificado ? 'Estuvo allí' : 'Persona con cuenta') + '</span>' + ic(k.verificado ? 'verified' : 'check_circle', 'text-[15px] text-tertiary', true) + '</div>' +
        '<span class="font-label-micro text-label-micro text-on-surface-variant">' + esc(l.destino) + ' • ' + haceCuanto(k.fecha) + '</span></div></div></div>' +
        '<p class="font-body-sm text-body-sm text-on-surface">"' + esc(k.texto) + '"</p>' + acciones + '</div>';
    }).join('') : '<p class="font-body-sm text-body-sm text-on-surface-variant">No hay comentarios que mostrar.</p>';
    caja.querySelectorAll('[data-denunciar]').forEach(function (b) {
      b.onclick = async function () {
        if (!confirm('¿Denunciar este comentario? Lo revisamos en menos de 24 horas y, si no respeta las normas, lo quitamos.')) return;
        b.disabled = true;
        var d = await sb.rpc('salimos_denunciar', { p_local: l.id, p_autor: b.dataset.denunciar, p_motivo: null });
        if (d.error) { b.disabled = false; tostada(textoError(d.error)); return; }
        var ds = leer('denunciados', []); ds.push(l.id + ':' + b.dataset.denunciar); guardar('denunciados', ds);
        tostada('Gracias. Lo revisamos en menos de 24 horas.'); pintarComentarios(l);
      };
    });
    caja.querySelectorAll('[data-bloquear]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('¿Dejar de ver los comentarios de esta persona en todos los sitios? Se guarda en este móvil.')) return;
        var bs = leer('bloqueados', []); bs.push(b.dataset.bloquear); guardar('bloqueados', bs);
        tostada('Bloqueada. Ya no verás sus comentarios.'); pintarComentarios(l);
      };
    });
  }

  /* Votar sin sitio elegido: la lista para escoger. */
  function elegirParaVotar() {
    seccion('Votar');
    vista.innerHTML = '<div class="px-gutter pt-space-md pb-space-lg flex flex-col gap-space-md animate-screen-enter">' + cabeceraVotar(null) +
      '<div class="flex flex-col gap-space-sm"><h2 class="font-label-prominent text-label-prominent text-on-surface uppercase tracking-wider px-1">¿Dónde has estado?</h2>' +
      '<label class="flex items-center gap-3 h-14 px-5 rounded-full bg-surface-container-lowest shadow-md">' + ic('search', 'text-[24px] text-secondary') +
      '<span class="sr-only">Buscar un sitio</span><input type="search" id="busca-voto" class="flex-1 min-w-0 bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none" placeholder="Busca el sitio…" autocomplete="off"></label>' +
      '<div class="flex flex-col gap-space-xs" id="para-votar"></div></div>' + llamadaRecomendar() + '</div>';
    function pinta(q) {
      q = sinTildes(q || '');
      var l = porVotos(LOCALES).filter(function (x) { return !q || sinTildes(x.nombre + ' ' + x.municipio + ' ' + (x.barrio || '')).indexOf(q) >= 0; });
      document.getElementById('para-votar').innerHTML = l.map(function (x) { return filaSitio(x).replace('#/local/', '#/votar/'); }).join('') ||
        '<p class="p-2.5 rounded-DEFAULT bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">No está. <a class="font-bold text-primary" href="#/recomendar">Recomiéndalo</a> y lo damos de alta.</p>';
    }
    document.getElementById('busca-voto').oninput = function (e) { pinta(e.target.value); };
    pinta('');
  }
  function cabeceraVotar(l) {
    return '<div class="relative overflow-hidden rounded-lg bg-surface-container p-space-lg shadow-sm"><div class="flex items-start justify-between gap-space-sm"><div class="flex flex-col min-w-0">' +
      '<div class="flex items-center gap-space-xs mb-1"><span class="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-micro text-label-micro uppercase tracking-wider">Voto libre</span><span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span></div>' +
      '<h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">' + (l && votosDe()[l.id] ? 'Cambia tu voto' : 'Califica tu experiencia real') + '</h1>' +
      (l ? '<div class="flex items-center gap-1.5 mt-1 text-on-surface-variant min-w-0">' + ic('storefront', 'text-[18px] text-primary flex-shrink-0') + '<span class="font-body-md text-body-md font-semibold text-on-surface truncate">' + esc(l.nombre) + '</span>' +
        '<span class="font-body-sm text-body-sm text-on-surface-variant truncate">• ' + esc(l.barrio || l.municipio) + '</span></div>' : '') + '</div>' +
      (l ? '<div class="flex-shrink-0 flex flex-col items-center justify-center p-space-sm rounded-lg bg-inverse-surface text-inverse-on-surface shadow-md min-w-[76px]"><div class="relative flex items-center justify-center">' +
        '<div class="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm">' + ic('pulse_alert', 'text-[16px]', true) + '</div>' +
        '<div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed flex items-center justify-center shadow-xs">' + ic('check', 'text-[11px] font-bold') + '</div></div>' +
        '<span class="font-score-display text-score-display text-primary-fixed-dim mt-1" id="global-live-score">–</span><span class="font-label-micro text-label-micro tracking-widest uppercase opacity-80">Media</span></div>' : '') + '</div>' +
      '<div class="mt-space-md p-space-sm rounded-DEFAULT bg-tertiary-fixed/40 text-on-tertiary-fixed flex items-center gap-space-sm shadow-xs"><div class="w-8 h-8 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center flex-shrink-0">' + ic('verified_user', 'text-[18px]') + '</div>' +
      '<p class="font-body-sm text-body-sm leading-snug"><strong class="font-label-prominent">100% libre y anónimo:</strong> en Salimos ningún local paga, infla ni puede borrar tus notas. Tu criterio manda.</p></div></div>';
  }

  var TAG_ON = 'tag-pill active-tag px-3 py-1.5 rounded-full bg-secondary text-on-secondary font-label-badge text-label-badge transition-all flex items-center gap-1 shadow-xs';
  var TAG_OFF = 'tag-pill px-3 py-1.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-badge text-label-badge hover:bg-surface-variant transition-all flex items-center gap-1';

  P.votar = function (id) {
    if (!id) return elegirParaVotar();
    var l = local(id); if (!l) return P.noExiste();
    if (!usuario() || !YO.perfil) { guardar('vuelta', '#/votar/' + id); location.hash = '#/entrar'; return; }
    seccion('Votar');
    var previo = votosDe()[id] || { crit: {}, rapidas: {} };
    var voto = { crit: Object.assign({}, previo.crit), rapidas: Object.assign({}, previo.rapidas), comentario: previo.comentario };
    var crits = S.criteriosDe(l.tipo, l.tipo2);
    var PALABRA = ['Fatal', 'Fatal', 'Muy mal', 'Mal', 'Flojo', 'Regular', 'Aprobado', 'Bien', 'Muy bien', 'Excelente', 'Perfecto'];

    vista.innerHTML = '<div class="px-gutter pt-space-md pb-space-lg flex flex-col gap-space-md animate-screen-enter">' + cabeceraVotar(l) + avisoVerificado(l, previo) +
      '<div class="flex flex-col gap-space-sm"><div class="flex items-center justify-between px-1"><h2 class="font-label-prominent text-label-prominent text-on-surface uppercase tracking-wider">' + crits.length + ' cosas que votar</h2>' +
      '<span class="font-label-badge text-label-badge text-secondary font-semibold">Toca o desliza</span></div>' +
      crits.map(function (c) {
        var v = voto.crit[c.id];
        return '<div class="criteria-card rounded-DEFAULT bg-surface-container-lowest p-space-md shadow-sm transition-all flex flex-col gap-2' + (v == null ? ' sin-votar' : '') + '" data-c="' + c.id + '">' +
          '<div class="flex items-center justify-between"><div class="flex items-center gap-2 min-w-0">' + ic(c.icono, 'text-[22px] text-primary') +
          '<div class="flex flex-col min-w-0"><label class="font-label-prominent text-label-prominent text-on-surface" for="r-' + c.id + '">' + esc(c.nombre) + '</label>' +
          '<span class="font-body-sm text-body-sm text-tertiary font-semibold truncate" id="p-' + c.id + '"></span></div></div>' +
          '<span class="font-score-display text-score-display text-primary-container" id="o-' + c.id + '"></span></div>' +
          '<input class="rating-slider w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-container-highest accent-primary-container" type="range" id="r-' + c.id + '" min="0" max="10" step="1" value="' + (v == null ? 5 : v) + '">' +
          '<div class="flex items-center justify-between"><span class="font-label-micro text-label-micro text-on-surface-variant">' + esc(c.ayuda) + '</span>' +
          '<button type="button" class="no-se px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label-badge text-label-badge flex-shrink-0 ml-2" data-c="' + c.id + '">No lo sé</button></div></div>';
      }).join('') + '</div>' +
      '<div class="flex flex-col gap-space-sm pt-space-xs"><h2 class="font-label-prominent text-label-prominent text-on-surface uppercase tracking-wider px-1">Veredicto flash (1 toque)</h2>' +
      S.RAPIDAS.map(function (r) {
        return '<div class="rounded-DEFAULT bg-surface-container-low p-space-md shadow-xs flex flex-col gap-2"><span class="font-body-md text-body-md font-semibold text-on-surface" id="q-' + r.id + '">' + r.pregunta + '</span>' +
          '<div class="flex items-center gap-2 flex-wrap" role="group" aria-labelledby="q-' + r.id + '">' + r.opciones.map(function (o) {
            var on = voto.rapidas[r.id] === o[0];
            return '<button type="button" class="' + (on ? TAG_ON : TAG_OFF) + '" data-r="' + r.id + '" data-v="' + o[0] + '" aria-pressed="' + on + '"><span>' + o[1] + '</span></button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="flex flex-col gap-2 pt-space-xs"><div class="flex items-center justify-between px-1"><label class="font-label-prominent text-label-prominent text-on-surface uppercase tracking-wider" for="review-opinion">Comentario libre</label>' +
      '<span class="font-label-micro text-label-micro text-on-surface-variant">Opcional</span></div>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant px-1">Lo que le dirías a un amigo: si lo recomiendas y para quién. Sin insultos ni nombres de trabajadores. Se publica al momento; si no respeta estas normas, lo quitamos.</p>' +
      (previo.retirado ? '<p class="font-body-sm text-body-sm text-error font-semibold px-1">Este comentario se retiró por no cumplir las normas. Si lo cambias, se vuelve a publicar.</p>' : '') +
      '<div class="relative rounded-DEFAULT bg-surface-container-lowest p-space-md shadow-sm"><textarea class="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline/70 focus:outline-none resize-none" id="review-opinion" maxlength="300" rows="3" placeholder="Raciones, mejor plato, consejos para aparcar…">' + esc(voto.comentario || '') + '</textarea>' +
      '<div class="flex items-center justify-between mt-2 pt-2 text-on-surface-variant"><div class="flex items-center gap-1 font-label-micro text-label-micro text-tertiary">' + ic('lock', 'text-[14px]') + '<span>Nadie ve tu nombre ni tu correo</span></div>' +
      '<span class="font-label-micro text-label-micro" id="char-count">' + (voto.comentario || '').length + '/300</span></div></div></div>' +
      '<div class="pt-space-sm pb-space-md"><button class="boton-off w-full h-14 rounded-full bg-primary-container text-on-primary-container font-headline-md text-headline-md flex items-center justify-center gap-space-sm shadow-md active:scale-95 transition-transform hover:shadow-lg" id="submit-vote-btn" type="button">' +
      ic('send', 'text-[24px]', true) + '<span>Publicar mi voto</span></button>' +
      '<p class="font-label-prominent text-label-prominent text-center text-error mt-2" id="falta" role="alert"></p>' +
      '<p class="font-label-micro text-label-micro text-center text-on-surface-variant mt-2">Tu voto cuenta una sola vez por sitio y puedes cambiarlo cuando quieras.</p></div>' +
      '<div class="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-md hidden flex items-center justify-center p-gutter" id="vote-modal-success"><div class="w-full max-w-sm rounded-lg bg-surface-container-lowest p-space-lg shadow-xl flex flex-col items-center text-center animate-screen-enter">' +
      '<div class="w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-space-sm shadow-sm">' + ic('how_to_reg', 'text-[36px]', true) + '</div>' +
      '<h3 class="font-headline-md text-headline-md text-on-surface">¡Voto publicado!</h3><p class="font-body-md text-body-md text-on-surface-variant mt-1">Tu nota para <strong class="text-on-surface">' + esc(l.nombre) + '</strong> ya cuenta en Salimos.</p>' +
      '<div class="mt-space-md p-space-sm rounded-DEFAULT bg-surface-container flex items-center justify-between w-full"><span class="font-body-sm text-body-sm text-on-surface-variant">Tu nota media:</span><span class="font-score-display text-score-display text-primary" id="modal-final-score"></span></div>' +
      '<a class="mt-space-lg w-full h-12 rounded-full bg-secondary text-on-secondary font-label-prominent text-label-prominent flex items-center justify-center active:scale-95 transition-all" href="#/local/' + id + '">Ver la ficha</a>' +
      '<a class="mt-space-sm w-full h-12 rounded-full bg-surface-container-high text-on-surface font-label-prominent text-label-prominent flex items-center justify-center active:scale-95 transition-all" href="#/explorar">Continuar explorando</a></div></div></div>';

    function media() {
      var k = Object.keys(voto.crit); if (!k.length) return '–';
      return n1(k.reduce(function (a, x) { return a + voto.crit[x]; }, 0) / k.length);
    }
    function marcar(cid, v) {
      if (v == null) delete voto.crit[cid]; else voto.crit[cid] = v;
      var r = document.getElementById('r-' + cid);
      document.getElementById('o-' + cid).textContent = v == null ? '–' : v;
      document.getElementById('p-' + cid).textContent = v == null ? 'Sin votar · desliza para votar' : PALABRA[v] + ' · ' + v;
      r.setAttribute('aria-valuetext', v == null ? 'Sin votar' : v + ', ' + PALABRA[v]);
      if (v == null) r.value = 5;
      r.closest('.criteria-card').classList.toggle('sin-votar', v == null);
      document.getElementById('global-live-score').textContent = media();
      revisar();
    }
    function revisar() {
      var n = Object.keys(voto.crit).length, falta = Math.max(0, 3 - n);
      document.getElementById('submit-vote-btn').disabled = falta > 0;
      document.getElementById('falta').textContent = falta ? 'Vota al menos 3 cosas para publicar (te ' + (falta === 1 ? 'falta 1' : 'faltan ' + falta) + ').' : '';
    }
    crits.forEach(function (c) { marcar(c.id, voto.crit[c.id] == null ? null : voto.crit[c.id]); });
    vista.querySelectorAll('input[type=range]').forEach(function (r) { r.oninput = function () { marcar(r.id.slice(2), +r.value); }; });
    vista.querySelectorAll('.no-se').forEach(function (b) { b.onclick = function () { marcar(b.dataset.c, null); }; });
    vista.querySelectorAll('[data-r]').forEach(function (b) {
      b.onclick = function () {
        var on = voto.rapidas[b.dataset.r] === b.dataset.v;
        if (on) delete voto.rapidas[b.dataset.r]; else voto.rapidas[b.dataset.r] = b.dataset.v;
        vista.querySelectorAll('[data-r="' + b.dataset.r + '"]').forEach(function (o) { var a = !on && o === b; o.className = a ? TAG_ON : TAG_OFF; o.setAttribute('aria-pressed', a); });
      };
    });
    document.getElementById('review-opinion').oninput = function (e) { document.getElementById('char-count').textContent = e.target.value.length + '/300'; };
    document.getElementById('submit-vote-btn').onclick = async function () {
      var b = this, antes = b.innerHTML; b.disabled = true;
      b.innerHTML = ic('sync', 'text-[24px] animate-spin') + '<span>Publicando…</span>';
      var r = await sb.rpc('salimos_votar', { p_local: id, p_crit: voto.crit, p_rapidas: voto.rapidas, p_comentario: document.getElementById('review-opinion').value.trim() });
      if (r.error) { b.disabled = false; b.innerHTML = antes; document.getElementById('falta').textContent = textoError(r.error); return; }
      document.getElementById('modal-final-score').textContent = media();
      await Promise.all([cargarLocales(), cargarYo()]);
      document.getElementById('vote-modal-success').classList.remove('hidden');
    };
  };

  /* Formularios con las piezas del de «Recomendar» de Stitch. */
  var INPUT = 'w-full h-13 px-space-lg rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm placeholder:text-outline-variant focus:outline-none focus:bg-surface-container-low transition-all';
  var BOTON = 'boton-off w-full h-14 rounded-full bg-primary-container text-on-primary-container font-label-prominent text-body-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform';
  function etiquetaCampo(icono, txt, para, extra) {
    return '<label class="font-label-prominent text-label-prominent text-on-surface flex items-center justify-between"' + (para ? ' for="' + para + '"' : '') + '><span class="flex items-center gap-1.5">' + ic(icono, 'text-[18px] text-primary') + txt + '</span>' +
      (extra ? '<span class="font-label-micro text-label-micro text-on-surface-variant">' + extra + '</span>' : '') + '</label>';
  }
  function casilla(id, html) {
    return '<div class="p-space-md rounded-DEFAULT bg-secondary-fixed/50 flex items-start gap-3 shadow-sm"><input class="mt-1 w-5 h-5 rounded-md accent-secondary text-secondary cursor-pointer flex-shrink-0" id="' + id + '" type="checkbox">' +
      '<label class="font-body-sm text-body-sm text-on-secondary-fixed cursor-pointer" for="' + id + '">' + html + '</label></div>';
  }
  /* Banner oscuro de «Recomendar» de Stitch. */
  function bannerOscuro(icono, ante, titulo, texto, pacto) {
    return '<section class="relative overflow-hidden rounded-lg bg-inverse-surface p-space-lg shadow-md">' +
      '<div class="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-secondary opacity-30 blur-2xl pointer-events-none"></div><div class="absolute -left-6 -top-6 w-32 h-32 rounded-full bg-primary-container opacity-20 blur-xl pointer-events-none"></div>' +
      '<div class="relative z-10 flex items-start gap-space-md"><div class="relative flex-shrink-0 w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center shadow-lg">' + ic(icono, 'text-[30px] text-primary-container', true) +
      '<span class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container shadow-sm">' + ic('check', 'text-[14px]', true) + '</span></div>' +
      '<div class="flex flex-col min-w-0"><div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary-fixed font-label-micro text-label-micro tracking-wide uppercase mb-1 self-start"><span class="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-pulse"></span>' + ante + '</div>' +
      '<h1 class="font-headline-lg-mobile text-headline-lg-mobile text-inverse-on-surface">' + titulo + '</h1><p class="font-body-sm text-body-sm text-surface-container-high mt-0.5 break-words">' + texto + '</p></div></div>' +
      (pacto ? '<div class="mt-space-md pt-space-sm bg-surface/10 rounded-DEFAULT p-space-sm backdrop-blur-md relative z-10"><div class="flex items-center gap-2 text-surface-container-lowest">' + ic('verified_user', 'text-primary-container text-[18px]') +
        '<span class="font-label-prominent text-label-prominent text-surface-bright">' + pacto[0] + '</span></div><p class="font-body-sm text-body-sm text-surface-container-high mt-1 leading-snug">' + pacto[1] + '</p></div>' : '') + '</section>';
  }

  P.entrar = function () {
    /* Con sesión (por ejemplo, de Trivial) pero sin perfil de Salimos: solo falta confirmar la edad. */
    var soloEdad = !!YO.sesion && !YO.perfil;
    if (YO.sesion && YO.perfil) { location.hash = leer('vuelta', '#/tu'); borrar('vuelta'); return; }
    seccion('Entrar');
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter pt-space-md pb-8 gap-space-lg animate-screen-enter">' +
      bannerOscuro('key', 'Sin contraseña', soloEdad ? 'Un paso más' : 'Entra para votar',
        soloEdad ? 'Ya has entrado con ' + esc(YO.sesion.user.email) + '. Para votar en Salimos, confirma esto.' : 'Te mandamos un código a tu correo. Así cada persona vota una sola vez por sitio.') +
      '<form class="flex flex-col gap-space-lg" id="f1" novalidate>' +
      (soloEdad ? '' : '<div class="flex flex-col gap-1.5">' + etiquetaCampo('mail', 'Tu correo', 'correo') + '<input class="' + INPUT + '" type="email" id="correo" autocomplete="email" inputmode="email" placeholder="nombre@correo.com" required></div>') +
      casilla('mayor', '<strong>Tengo 18 años o más.</strong>') +
      casilla('acepto', 'He leído la <a class="font-bold underline" href="privacidad.html" target="_blank">política de privacidad</a>.') +
      '<div class="flex flex-col gap-2"><button class="' + BOTON + '" type="submit">' + ic(soloEdad ? 'how_to_reg' : 'send', 'text-[22px]') + (soloEdad ? 'Confirmar' : 'Mandarme el código') + '</button>' +
      '<p class="font-label-prominent text-label-prominent text-center text-error" id="err1" role="alert"></p></div></form>' +
      '<form class="flex flex-col gap-space-lg" id="f2" hidden novalidate><div class="flex flex-col gap-1.5">' + etiquetaCampo('pin', 'Código que te ha llegado', 'cod') +
      '<span class="font-body-sm text-body-sm text-on-surface-variant" id="aquien"></span>' +
      '<input class="' + INPUT + ' text-center font-score-display text-score-display tracking-[0.4em]" type="text" id="cod" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="········"></div>' +
      '<div class="flex flex-col gap-2"><button class="' + BOTON + '" type="submit">' + ic('login', 'text-[22px]') + 'Entrar</button>' +
      '<p class="font-label-micro text-label-micro text-center text-on-surface-variant">¿No llega? Mira en «Correo no deseado» o espera un minuto.</p>' +
      '<p class="font-label-prominent text-label-prominent text-center text-error" id="err2" role="alert"></p></div></form></div>';

    async function terminar() {
      var r = await sb.rpc('salimos_alta_perfil', { p_mayor_edad: true });
      if (r.error) throw r.error;
      await Promise.all([cargarYo(), cargarLocales()]);
      var vuelta = leer('vuelta', '#/tu'); borrar('vuelta'); tostada('Ya estás dentro.'); location.hash = vuelta;
    }
    var correo;
    document.getElementById('f1').onsubmit = async function (e) {
      e.preventDefault();
      var err = document.getElementById('err1'), f1 = this, bt = f1.querySelector('button');
      err.textContent = '';
      if (!soloEdad) {
        correo = document.getElementById('correo').value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { err.textContent = 'Revisa el correo: parece que falta algo.'; return; }
      }
      if (!document.getElementById('mayor').checked) { err.textContent = 'Para votar hay que tener 18 años o más.'; return; }
      if (!document.getElementById('acepto').checked) { err.textContent = 'Marca la casilla de privacidad para seguir.'; return; }
      bt.disabled = true;
      try {
        if (soloEdad) { await terminar(); return; }
        /* La cuenta con la que revisan Apple y Google (la misma de Trivial, que comparte las
           cuentas): no pueden leer nuestro correo, así que para ESTA dirección —y solo para
           esta— el servidor da el código (función «codigo-demo») y sale ya escrito. */
        if (correo === 'revision@saneas.es') {
          var dm = await sb.functions.invoke('codigo-demo', { body: { email: correo } });
          if (dm.error || !dm.data || !dm.data.codigo) throw new Error('No se ha podido preparar la cuenta de revisión.');
          f1.hidden = true; document.getElementById('f2').hidden = false;
          document.getElementById('aquien').textContent = 'Cuenta de revisión: el código ya está escrito. Pulsa «Entrar».';
          document.getElementById('cod').value = dm.data.codigo;
          bt.disabled = false; return;
        }
        var r = await sb.auth.signInWithOtp({ email: correo, options: { shouldCreateUser: true, emailRedirectTo: VUELTA } });
        if (r.error) throw r.error;
        f1.hidden = true; document.getElementById('f2').hidden = false;
        document.getElementById('aquien').textContent = 'Lo hemos mandado a ' + correo + '. Puede tardar un minuto.';
        document.getElementById('cod').focus();
      } catch (x) { err.textContent = /rate|seconds/i.test(textoError(x)) ? 'Espera un minuto antes de pedir otro código.' : textoError(x); }
      bt.disabled = false;
    };
    document.getElementById('f2').onsubmit = async function (e) {
      e.preventDefault();
      var err = document.getElementById('err2'), bt = this.querySelector('button'), cod = document.getElementById('cod').value.trim();
      if (!/^\d{6,10}$/.test(cod)) { err.textContent = 'Escribe el código tal como te ha llegado, solo las cifras.'; return; }
      bt.disabled = true; err.textContent = '';
      var r = await sb.auth.verifyOtp({ email: correo, token: cod, type: 'email' });
      if (r.error) { bt.disabled = false; err.textContent = 'Ese código no es. Mira el correo otra vez.'; return; }
      try { await terminar(); } catch (x) { bt.disabled = false; err.textContent = textoError(x); }
    };
  };

  P.recomendar = function () {
    seccion('Recomendar');
    var puede = !!usuario() && YO.perfil;
    if (!puede) { guardar('vuelta', '#/recomendar'); }
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter pt-space-md pb-8 gap-space-lg animate-screen-enter">' +
      bannerOscuro('add_location_alt', 'Lo propone la gente', 'Recomienda un Local', '¿Conoces un sitio de Gran Canaria que merece estar aquí y que la gente lo vote? Lo revisamos y lo damos de alta.',
        ['Gratis y sin pagos', 'Darlo de alta no cuesta nada y ningún local puede pagar por entrar ni por salir.']) +
      (puede ? '' : '<a class="p-space-md rounded-DEFAULT bg-primary-fixed text-on-primary-fixed flex items-center gap-3 shadow-sm font-label-prominent text-label-prominent" href="#/entrar">' + ic('login', 'text-[22px]') + 'Para recomendar hace falta entrar con tu correo. Toca aquí.</a>') +
      '<form class="flex flex-col gap-space-lg" id="fr" novalidate>' +
      '<div class="flex flex-col gap-1.5">' + etiquetaCampo('storefront', 'Nombre del establecimiento *', 'rn', 'Obligatorio') +
      '<div class="relative"><input class="' + INPUT + '" type="text" id="rn" placeholder="Ej: Bar Avenida" maxlength="80">' + ic('edit', 'absolute right-4 top-1/2 -translate-y-1/2 text-outline text-[20px]') + '</div></div>' +
      '<div class="flex flex-col gap-2">' + etiquetaCampo('local_bar', 'Tipo de ocio o gastronomía *') + '<div class="flex flex-wrap gap-2">' +
      S.TIPOS.map(function (t) { return '<button type="button" class="category-chip px-3.5 py-2 rounded-full font-label-prominent text-label-prominent bg-surface-container-high text-on-surface transition-all active:scale-95 flex items-center gap-1.5 shadow-sm" data-t="' + t.id + '" aria-pressed="false">' + ic(t.icono, 'text-[18px]') + '<span>' + t.nombre + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="flex flex-col gap-1.5">' + etiquetaCampo('pin_drop', 'Municipio de Gran Canaria *', 'rm') + '<div class="relative"><select class="' + INPUT + ' appearance-none" id="rm"><option value="">Selecciona el municipio…</option>' +
      S.MUNICIPIOS.map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + '</select>' + ic('expand_more', 'absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[22px]') + '</div></div>' +
      '<div class="flex flex-col gap-1.5">' + etiquetaCampo('link', 'Dirección o enlace del mapa', 'rd', 'Opcional') + '<input class="' + INPUT + '" type="text" id="rd" placeholder="Calle, número o enlace" maxlength="200"></div>' +
      casilla('rno', '<strong>Declaración:</strong> no trabajo en este sitio ni gano nada por recomendarlo. Es una recomendación de verdad, de haber ido.') +
      '<div class="flex flex-col gap-2 pt-2"><button class="' + BOTON + '" type="submit"' + (puede ? '' : ' disabled') + '>' + ic('send', 'text-[22px]') + 'Enviar recomendación</button>' +
      '<p class="font-label-prominent text-label-prominent text-center text-error" id="er" role="alert"></p>' +
      '<p class="font-label-micro text-label-micro text-center text-on-surface-variant">Lo revisamos antes de abrirlo a votación.</p></div></form></div>';
    var tipoSel = '', ON = 'bg-secondary text-on-secondary', OFF = 'bg-surface-container-high text-on-surface';
    vista.querySelectorAll('[data-t]').forEach(function (b) {
      b.onclick = function () {
        tipoSel = b.dataset.t;
        vista.querySelectorAll('[data-t]').forEach(function (o) { var a = o === b; o.className = o.className.replace(a ? OFF : ON, a ? ON : OFF); o.setAttribute('aria-pressed', a); });
      };
    });
    document.getElementById('fr').onsubmit = async function (e) {
      e.preventDefault();
      var er = document.getElementById('er'), nombre = document.getElementById('rn').value.trim(), mun = document.getElementById('rm').value;
      if (nombre.length < 2) { er.textContent = 'Falta el nombre del sitio.'; return; }
      if (!tipoSel) { er.textContent = 'Elige qué tipo de sitio es.'; return; }
      if (!mun) { er.textContent = 'Elige el municipio.'; return; }
      if (!document.getElementById('rno').checked) { er.textContent = 'Marca la declaración: aquí no se recomienda el sitio propio.'; return; }
      var bt = this.querySelector('button[type=submit]'); bt.disabled = true;
      var r = await sb.rpc('salimos_recomendar', { p_nombre: nombre, p_tipo: tipoSel, p_municipio: mun, p_direccion: document.getElementById('rd').value.trim() });
      if (r.error) { bt.disabled = false; er.textContent = textoError(r.error); return; }
      vista.innerHTML = '<div class="px-gutter pt-space-lg pb-8 animate-screen-enter"><div class="rounded-lg bg-surface-container-lowest p-space-lg shadow-xl flex flex-col items-center text-center">' +
        '<div class="w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-space-sm shadow-sm">' + ic('how_to_reg', 'text-[36px]', true) + '</div>' +
        '<h3 class="font-headline-md text-headline-md text-on-surface">Gracias</h3><p class="font-body-md text-body-md text-on-surface-variant mt-1">Revisamos «' + esc(nombre) + '» y, si es un sitio de Gran Canaria abierto al público, lo damos de alta. Te avisamos por correo.</p>' +
        '<a class="mt-space-lg w-full h-12 rounded-full bg-secondary text-on-secondary font-label-prominent text-label-prominent flex items-center justify-center active:scale-95 transition-all" href="#/explorar">Continuar explorando</a></div></div>';
    };
  };

  P.tu = function () {
    seccion('Tú');
    var u = usuario();
    var envolver = function (html) { vista.innerHTML = '<div class="flex flex-col w-full px-gutter pt-space-md pb-8 gap-space-lg animate-screen-enter">' + html + '</div>'; };
    var g = guardados().map(local).filter(Boolean);
    var bloqueGuardados = '<div class="flex flex-col rounded-lg bg-surface-container-lowest shadow-md p-space-md gap-space-md"><div class="flex items-center gap-2"><div class="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center">' + ic('bookmark', 'text-[20px]', true) + '</div>' +
      '<div><h4 class="font-label-prominent text-label-prominent text-on-surface">Guardados</h4><span class="font-label-micro text-label-micro text-on-surface-variant">Solo en este móvil</span></div></div>' +
      '<div class="flex flex-col gap-space-xs">' + (g.length ? g.map(filaSitio).join('') : '<p class="p-2.5 rounded-DEFAULT bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">Toca el marcador de una ficha para guardarla aquí.</p>') + '</div></div>';
    if (!u) {
      envolver(bannerOscuro('person', 'Tu cuenta', 'Tú', 'Para mirar no hace falta cuenta. Para votar y recomendar, sí: así nadie vota dos veces.') +
        '<a class="' + BOTON + '" href="#/entrar">' + ic('login', 'text-[22px]') + 'Entrar con mi correo</a>' + bloqueGuardados);
      return;
    }
    if (!YO.perfil) { location.hash = '#/entrar'; return; }
    var ids = Object.keys(votosDe()).filter(local);
    envolver(bannerOscuro('person', 'Tu cuenta', 'Tú', 'Has entrado como ' + esc(u.correo) + '.') +
      '<div class="flex flex-col rounded-lg bg-surface-container-lowest shadow-md p-space-md gap-space-md"><div class="flex items-center gap-2"><div class="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">' + ic('how_to_vote', 'text-[20px]', true) + '</div>' +
      '<div><h4 class="font-label-prominent text-label-prominent text-on-surface">Tus votos</h4><span class="font-label-micro text-label-micro text-on-surface-variant">Toca un sitio para cambiar tu voto</span></div></div>' +
      '<div class="flex flex-col gap-space-xs">' + (ids.length ? ids.map(function (id) { return filaSitio(local(id)).replace('#/local/', '#/votar/'); }).join('') : '<p class="p-2.5 rounded-DEFAULT bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">Todavía no has votado ningún sitio.</p>') + '</div></div>' +
      bloqueGuardados +
      (leer('bloqueados', []).length ? '<button type="button" class="font-label-prominent text-label-prominent text-secondary underline self-center" id="desbloquear">Volver a ver a las personas bloqueadas (' + leer('bloqueados', []).length + ')</button>' : '') +
      '<button type="button" class="w-full h-12 rounded-full bg-surface-container-high text-on-surface font-label-prominent text-label-prominent flex items-center justify-center gap-2 active:scale-95 transition-all" id="salir">' + ic('logout', 'text-[20px] text-secondary') + 'Cerrar sesión</button>' +
      '<button type="button" class="font-label-prominent text-label-prominent text-error underline self-center" id="borrarCuenta">Borrar mi cuenta y mis votos</button>');
    if (document.getElementById('desbloquear')) document.getElementById('desbloquear').onclick = function () { borrar('bloqueados'); tostada('Desbloqueadas.'); P.tu(); };
    document.getElementById('salir').onclick = async function () { await sb.auth.signOut(); await cargarYo(); tostada('Sesión cerrada.'); P.tu(); };
    document.getElementById('borrarCuenta').onclick = async function () {
      if (!confirm('¿Borrar tu cuenta y todos tus votos y comentarios? No se puede deshacer.')) return;
      await borrarMisFotos();
      var r = await sb.rpc('salimos_borrar_mis_datos');
      if (r.error) { tostada(textoError(r.error)); return; }
      try { await sb.auth.signOut({ scope: 'local' }); } catch (x) { /* la cuenta ya no está */ }
      await Promise.all([cargarYo(), cargarLocales()]); tostada('Borrado.'); P.tu();
    };
  };

  P['como-funciona'] = function () {
    seccion('Cómo funciona');
    /* Lo que dice aquí tiene que ser verdad en sql/01-salimos.sql. */
    var p = [
      ['how_to_reg', 'bg-tertiary-fixed text-on-tertiary-fixed', 'Quién vota', 'Personas con cuenta. Se entra con el correo y un código, sin contraseña. Cada persona tiene un voto por sitio, que puede cambiar cuando quiera.'],
      ['checklist_rtl', 'bg-primary-fixed text-on-primary-fixed', 'Cómo sale la nota', 'Cada sitio se vota por partes: limpieza, ambiente, servicio, consumiciones, precio, ubicación, parking y guagua, y además lo propio de cada tipo de sitio (la carta, los vinos, la música o las vistas). La nota general es la media de esas partes. Un sitio no entra en los rankings hasta tener ' + S.MIN_VOTOS_RANKING + ' votos.'],
      ['verified', 'bg-tertiary-container text-on-tertiary-container', 'Voto verificado: «Estuvo allí»', 'Si estás en el local, pulsa «Estoy aquí» en su ficha: comprobamos que estás a menos de 150 m y tu voto sale con el sello «Estuvo allí». Tienes 24 horas para votar, así en una discoteca haces check-in en la puerta y votas al día siguiente. Hasta el 30 de noviembre de 2026 cuentan todos los votos; desde el 1 de diciembre, en la nota y en los rankings solo cuentan los verificados.'],
      ['photo_camera', 'bg-primary-fixed text-on-primary-fixed', 'Fotos', 'Las fotos son de quien ha estado allí (con check-in, hechas con su móvil en el momento) o las cede el propio local. Nunca copiamos fotos de otras webs. Sin personas que se reconozcan: cualquiera puede denunciar una foto y con tres denuncias se retira.'],
      ['money_off', 'bg-error-container text-on-error-container', 'Quién paga', 'Nadie. Ningún local, marca ni anunciante puede pagar por salir, subir o quitar una nota. Salimos es del Grupo Saneas y es gratis.'],
      ['fingerprint', 'bg-secondary-fixed text-on-secondary-fixed', 'Votos falsos', 'Una cuenta solo puede votar una vez cada sitio, y hay un tope de sitios nuevos al día. Vigilamos los votos raros —muchas cuentas nuevas votando el mismo sitio de golpe— y los que sean de mentira no cuentan.'],
      ['forum', 'bg-surface-container-highest text-on-surface', 'Comentarios', 'Se publican al momento. Quitamos los que insultan, señalan a trabajadores con nombre o no tienen que ver con el sitio. Cualquiera puede denunciar un comentario y lo revisamos en menos de 24 horas; con tres denuncias se retira solo hasta que lo miremos. Y si alguien te molesta, puedes bloquearlo y no volverás a ver lo que escribe.']
    ];
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile pt-space-md pb-8 gap-space-md animate-screen-enter">' + cabeceraSeccion('Sin letra pequeña', 'Cómo funciona', '') +
      p.map(function (x) {
        return '<div class="p-space-lg rounded-2xl bg-surface-container-low shadow-sm flex flex-col gap-space-xs"><div class="w-10 h-10 rounded-xl ' + x[1] + ' flex items-center justify-center">' + ic(x[0], 'text-body-lg font-bold') + '</div>' +
          '<h3 class="font-label-prominent text-headline-md text-on-surface mt-1">' + x[2] + '</h3><p class="font-body-md text-body-md text-on-surface-variant">' + x[3] + '</p></div>';
      }).join('') + '</div>';
  };

  P.privacidad = function () { location.replace('privacidad.html'); };

  P.noExiste = function () {
    seccion('Salimos');
    vista.innerHTML = '<div class="px-gutter pt-space-lg"><div class="rounded-lg bg-surface-container-lowest p-space-lg shadow-md text-center font-body-md text-body-md text-on-surface-variant">Este sitio no existe o ya no está.<br><a class="font-label-prominent text-label-prominent text-primary" href="#/explorar">Volver a explorar</a></div></div>';
  };

  /* ───────── destino: isla, provincia o ciudad ───────── */
  function abrirDestinos() {
    var hay = destinosConSitios();
    var caja = document.createElement('div');
    caja.className = 'fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-md flex items-end sm:items-center justify-center p-gutter';
    caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-modal', 'true'); caja.setAttribute('aria-labelledby', 'destinos-titulo');
    caja.innerHTML = '<div class="w-full max-w-sm rounded-lg bg-surface-container-lowest p-space-lg shadow-xl flex flex-col gap-space-md animate-screen-enter">' +
      '<div class="flex items-center justify-between gap-2"><div class="flex flex-col"><span class="font-label-micro text-label-micro text-tertiary uppercase tracking-wider font-bold">Isla, provincia o ciudad</span>' +
      '<h3 class="font-headline-md text-headline-md text-on-surface" id="destinos-titulo">¿Dónde sales?</h3></div>' +
      '<button type="button" class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center" data-cerrar aria-label="Cerrar">' + ic('close', 'text-[20px] text-on-surface') + '</button></div>' +
      '<div class="flex flex-col gap-space-xs">' + hay.map(function (id) {
        var d = S.destino(id), n = TODOS.filter(function (l) { return l.destino === id; }).length, on = id === DESTINO;
        return '<button type="button" class="flex items-center justify-between p-3 rounded-DEFAULT text-left transition-colors ' + (on ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-low hover:bg-surface-container text-on-surface') + '" data-destino="' + esc(id) + '" aria-pressed="' + on + '">' +
          '<span class="flex items-center gap-3">' + ic(d.icono, 'text-[22px]') + '<span class="font-label-prominent text-label-prominent">' + esc(id) + '</span></span>' +
          '<span class="flex items-center gap-1 font-label-badge text-label-badge">' + n + (n === 1 ? ' sitio' : ' sitios') + (on ? ic('check', 'text-[18px]') : '') + '</span></button>';
      }).join('') + '</div>' + botonCerca() + '</div>';
    function cerrar() { caja.remove(); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    caja.onclick = function (e) {
      if (e.target === caja || e.target.closest('[data-cerrar]')) return cerrar();
      var b = e.target.closest('[data-destino]');
      if (b) { elegirDestino(b.dataset.destino); guardar('destino', DESTINO); cerrar(); ir(); return; }
      if (e.target.closest('[data-cerca]')) cerrar();
    };
    document.addEventListener('keydown', tecla);
    document.body.appendChild(caja);
    caja.querySelector('[data-cerrar]').focus();
  }

  /* ───────── cerca de mí ─────────
     La posición se pide al pulsar, se usa en este móvil para ordenar por distancia y no se envía ni se guarda. */
  var POS = null;
  function botonCerca() {
    /* La app 1.0.0 de las tiendas no pide permiso de ubicación: hasta el próximo binario, solo en la web. */
    if (window.Capacitor) return '';
    return '<a href="#/cerca" data-cerca class="flex items-center gap-3 p-space-md rounded-lg bg-gradient-to-br from-secondary via-on-secondary-container to-secondary text-on-secondary shadow-md active:scale-[0.98] transition-transform">' +
      '<span class="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">' + ic('near_me', 'text-[22px]', true) + '</span>' +
      '<span class="flex flex-col min-w-0 flex-1"><span class="font-label-prominent text-label-prominent">Dónde salir cerca de mí</span>' +
      '<span class="font-label-micro text-label-micro text-secondary-fixed">Ordenado por distancia. Tu ubicación no sale de tu móvil.</span></span>' + ic('chevron_right', 'text-[22px] text-secondary-fixed') + '</a>';
  }
  function kmEntre(a, b, c, d) {
    var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
    return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
  }
  function distancia(km) { return km < 1 ? Math.round(km * 1000 / 50) * 50 + ' m' : (km < 10 ? num(km) : Math.round(km)) + ' km'; }
  function pedirPosicion(precisa) {
    return new Promise(function (ok, mal) {
      if (!navigator.geolocation) return mal({ code: 0 });
      navigator.geolocation.getCurrentPosition(function (p) { ok({ lat: p.coords.latitude, lng: p.coords.longitude }); }, mal,
        precisa ? { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 } : { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
    });
  }
  var filtroCerca = '';
  P.cerca = async function () {
    seccion('Cerca de mí');
    var cab = cabeceraSeccion('Con tu ubicación, solo en tu móvil', 'Cerca de ti', 'Los sitios más cercanos a donde estás ahora, del más cerca al más lejos.');
    if (!POS) {
      vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile sm:px-gutter gap-space-md pb-6 pt-space-md animate-screen-enter">' + cab +
        '<p class="p-space-md rounded-lg bg-surface-container-lowest shadow-md font-body-md text-body-md text-on-surface-variant" aria-busy="true">Buscando dónde estás…</p></div>';
      try { POS = await pedirPosicion(); }
      catch (e) {
        if (location.hash !== '#/cerca') return;
        var txt = e && e.code === 1 ? 'No nos has dado permiso para saber dónde estás. Puedes darlo en los ajustes del navegador o del móvil, o buscar por zona.'
          : 'No hemos podido saber dónde estás. Mira que tengas la ubicación encendida y vuelve a probar, o busca por zona.';
        vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile sm:px-gutter gap-space-md pb-6 pt-space-md animate-screen-enter">' + cab +
          '<div class="p-space-md rounded-lg bg-surface-container-lowest shadow-md flex flex-col gap-space-sm"><p class="font-body-md text-body-md text-on-surface">' + txt + '</p>' +
          '<div class="flex flex-wrap gap-space-xs"><button type="button" class="' + BOTON + '" id="otra-vez">' + ic('refresh', 'text-[20px]') + ' Volver a probar</button>' +
          '<a class="font-label-prominent text-label-prominent text-primary flex items-center gap-0.5 px-2" href="#/zonas">Buscar por zona ' + ic('chevron_right', 'text-[16px]') + '</a></div></div></div>';
        document.getElementById('otra-vez').onclick = P.cerca;
        return;
      }
      if (location.hash !== '#/cerca') return;
      /* Si estás en otro destino con sitios, te lo cambiamos. */
      var masCerca = TODOS.filter(function (l) { return l.lat != null; }).sort(function (a, b) { return kmEntre(POS.lat, POS.lng, a.lat, a.lng) - kmEntre(POS.lat, POS.lng, b.lat, b.lng); })[0];
      if (masCerca && masCerca.destino !== DESTINO && kmEntre(POS.lat, POS.lng, masCerca.lat, masCerca.lng) < 60) { elegirDestino(masCerca.destino); guardar('destino', DESTINO); }
    }
    var lista = TODOS.filter(function (l) { return l.lat != null && (!filtroCerca || l.tipo === filtroCerca || l.tipo2 === filtroCerca); })
      .map(function (l) { return { l: l, km: kmEntre(POS.lat, POS.lng, l.lat, l.lng) }; })
      .sort(function (a, b) { return a.km - b.km; }).slice(0, 25);
    var chip = function (id, icono, txt) { var on = filtroCerca === id; return '<button type="button" class="category-chip flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-sm active:scale-95 transition-all flex-shrink-0 ' + (on ? CHIP_ON : CHIP_OFF) + '" data-tipo="' + id + '" aria-pressed="' + on + '">' + ic(icono, 'text-[18px]') + '<span class="font-label-prominent text-label-prominent whitespace-nowrap">' + txt + '</span></button>'; };
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile sm:px-gutter gap-space-md pb-6 pt-space-md animate-screen-enter">' + cab +
      '<section class="flex items-center gap-space-xs overflow-x-auto no-scrollbar -mx-gutter-mobile px-gutter-mobile sm:mx-0 sm:px-0 py-1">' +
      chip('', 'apps', 'Todo') + S.TIPOS.map(function (t) { return chip(t.id, t.icono, t.plural); }).join('') + '</section>' +
      (lista.length && lista[0].km > 60 ? '<p class="p-space-md rounded-lg bg-surface-container-high font-body-sm text-body-sm text-on-surface">Todavía no tenemos sitios cerca de donde estás. Estos son los más cercanos.</p>' : '') +
      '<div class="flex flex-col gap-space-xs">' + (lista.length ? lista.map(function (x) {
        return filaSitio(x.l).replace(/<span class="flex items-center gap-1 px-2\.5[^]*?<\/span><\/a>$/,
          '<span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-badge text-label-badge flex-shrink-0 ml-2">' + ic('near_me', 'text-[14px]') + distancia(x.km) + '</span></a>');
      }).join('') : '<p class="p-2.5 rounded-DEFAULT bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">No hay sitios de este tipo todavía.</p>') + '</div>' +
      '<button type="button" class="font-label-prominent text-label-prominent text-primary flex items-center justify-center gap-1" id="recolocar">' + ic('my_location', 'text-[16px]') + ' Me he movido: actualizar</button></div>';
    vista.querySelectorAll('[data-tipo]').forEach(function (b) { b.onclick = function () { filtroCerca = b.dataset.tipo; P.cerca(); }; });
    document.getElementById('recolocar').onclick = function () { POS = null; P.cerca(); };
  };

  /* ───────── check-in: «Estoy aquí» ─────────
     Estando en el local (a 150 m o menos) abre el voto verificado 24 horas. El servidor mide la distancia
     con la posición y no la guarda. Hasta el 30/11 cuenta cualquier voto; desde el 1/12, solo los verificados. */
  function checkinVivo(id) { var h = YO.checkins[id]; return !!h && new Date(h) > new Date(); }
  function hora(iso) { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
  function tarjetaCheckin(l) {
    if (window.Capacitor) return '';   /* la app 1.0.0 no pide ubicación: llega con la 1.0.1 */
    var vivo = checkinVivo(l.id), verificado = (votosDe()[l.id] || {}).verificado;
    var cuantos = l.verificados ? '<span class="font-label-badge text-label-badge text-on-secondary-fixed bg-secondary-fixed/60 px-2 py-0.5 rounded-full flex-shrink-0">' + l.verificados + (l.verificados === 1 ? ' verificado' : ' verificados') + '</span>' : '';
    var cuerpo = vivo || verificado
      ? '<p class="font-body-sm text-body-sm text-on-surface">' + (verificado ? 'Tu voto de este sitio está <strong>verificado</strong>: lleva el sello «Estuvo allí».' : 'Check-in hecho. Tu voto saldrá <strong>verificado</strong> si votas antes de las ' + hora(YO.checkins[l.id]) + ' de mañana.') + '</p>' +
        (verificado ? '' : '<a class="' + BOTON + '" href="#/votar/' + l.id + '">' + ic('how_to_vote', 'text-[20px]') + ' Votar ahora</a>')
      : '<p class="font-body-sm text-body-sm text-on-surface-variant">¿Estás aquí? Haz check-in y tu voto saldrá con el sello <strong class="text-on-surface">«Estuvo allí»</strong>. Tienes 24 horas para votar: en una discoteca, check-in en la puerta y votas al día siguiente.</p>' +
        '<button type="button" class="' + BOTON + '" id="checkin">' + ic('where_to_vote', 'text-[20px]') + ' Estoy aquí · check-in</button>' +
        '<p class="font-label-micro text-label-micro text-on-surface-variant text-center">Usamos tu ubicación solo para ver que estás a menos de 150 m. No la guardamos.</p>';
    return '<div class="px-gutter pb-space-lg"><div class="rounded-lg bg-surface-container-lowest shadow-md p-space-md flex flex-col gap-space-sm">' +
      '<div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2">' + ic('verified', 'text-[22px] text-tertiary', true) +
      '<h3 class="font-headline-md text-headline-md text-on-surface">Voto verificado</h3></div>' + cuantos + '</div>' + cuerpo + '</div></div>';
  }
  async function hacerCheckin(l, boton) {
    if (!usuario() || !YO.perfil) { guardar('vuelta', '#/local/' + l.id); location.hash = '#/entrar'; return; }
    boton.disabled = true; boton.innerHTML = ic('my_location', 'text-[20px]') + ' Mirando dónde estás…';
    var pos;
    try { pos = await pedirPosicion(true); }
    catch (e) {
      tostada(e && e.code === 1 ? 'Sin permiso de ubicación no se puede hacer check-in. Puedes darlo en los ajustes.' : 'No hemos podido saber dónde estás. Prueba otra vez.');
      return P.local(l.id);
    }
    var r = await sb.rpc('salimos_checkin', { p_local: l.id, p_lat: pos.lat, p_lng: pos.lng });
    if (r.error) { tostada(textoError(r.error)); return P.local(l.id); }
    YO.checkins[l.id] = r.data.hasta;
    if (YO.votos[l.id]) { YO.votos[l.id].verificado = true; await cargarLocales().catch(function () {}); }
    tostada(YO.votos[l.id] ? 'Check-in hecho: tu voto ya está verificado.' : 'Check-in hecho. Ya puedes votar con el sello «Estuvo allí».');
    P.local(l.id);
  }
  function avisoVerificado(l, previo) {
    if (window.Capacitor) return '';
    if (checkinVivo(l.id) || previo.verificado)
      return '<div class="flex items-center gap-2 p-space-sm rounded-DEFAULT bg-tertiary-container/30 text-on-surface font-body-sm text-body-sm">' + ic('verified', 'text-[20px] text-tertiary', true) + '<span>Tu voto sale <strong>verificado</strong>: «Estuvo allí».</span></div>';
    return '<a href="#/local/' + l.id + '" class="flex items-center gap-2 p-space-sm rounded-DEFAULT bg-surface-container-high text-on-surface font-body-sm text-body-sm">' + ic('where_to_vote', 'text-[20px] text-secondary') +
      '<span>Voto sin verificar. ' + (YO.cuentanTodos === false ? 'En la nota solo cuentan los votos con check-in.' : 'Desde el 1 de diciembre, en la nota solo contarán los votos con check-in.') + ' <strong class="text-primary">Haz check-in desde la ficha</strong></span></a>';
  }

  /* ───────── fotos ─────────
     Las suben quienes han hecho check-in (con la cámara, estando allí) y Óscar las de los locales, con su permiso.
     El móvil la reduce a 1600 px y la vuelve a codificar en JPEG: así no viajan los datos GPS de la foto. */
  /* Mientras un sitio no tiene foto propia, la cabecera de la ficha enseña una de Google Maps por su servicio oficial.
     Normas de Google: no se guarda (se pide cada vez; aquí solo vive mientras dura la visita), va con su autor,
     enlaza a su origen en Google Maps y lleva la marca «Google Maps». */
  var GOOGLE = {};
  async function fotoGoogle(l) {
    if (l.foto || window.Capacitor) return;
    var g = GOOGLE[l.id];
    if (!g) {
      try { g = await (await fetch(SB_URL + '/functions/v1/salimos-foto-google?local=' + encodeURIComponent(l.id))).json(); } catch (e) { return; }
      GOOGLE[l.id] = g;
    }
    var cab = document.getElementById('cab-foto'), cr = document.getElementById('credito-google');
    if (!g.uri || !cab || !cr || !cab.firstElementChild) return;
    var img = document.createElement('img');
    img.src = g.uri; img.alt = ''; img.referrerPolicy = 'no-referrer';
    img.className = 'absolute inset-0 w-full h-full object-cover';
    img.onload = function () {
      cr.innerHTML = 'Foto' + (g.autor ? ' de ' + (g.autorUri ? '<a class="underline" href="' + esc(g.autorUri) + '" target="_blank" rel="noopener">' + esc(g.autor) + '</a>' : esc(g.autor)) : '') +
        ' · ' + (g.mapsUri ? '<a class="underline font-semibold" href="' + esc(g.mapsUri) + '" target="_blank" rel="noopener">Google Maps</a>' : '<span class="font-semibold">Google Maps</span>');
      cr.classList.remove('hidden');
    };
    cab.firstElementChild.appendChild(img);
  }
  function puedeSubirFoto(l) { return !window.Capacitor && !!usuario() && YO.perfil && (YO.admin || checkinVivo(l.id)); }
  async function pintarFotos(l) {
    var caja = document.getElementById('fotos'); if (!caja) return;
    var r = await sb.rpc('salimos_fotos', { p_local: l.id });
    var fotos = r.error ? [] : r.data;
    var sube = puedeSubirFoto(l);
    if (!fotos.length && !sube) { caja.innerHTML = ''; return; }
    caja.innerHTML = '<div class="flex items-center justify-between mb-space-xs"><h3 class="font-headline-md text-headline-md text-on-surface">Fotos</h3>' +
      '<span class="font-label-micro text-label-micro text-secondary font-semibold">' + (fotos.length ? 'De quien estuvo allí y del local' : 'Todavía ninguna') + '</span></div>' +
      (fotos.length ? '<div class="grid grid-cols-3 gap-1.5 rounded-lg overflow-hidden">' + fotos.map(function (f, i) {
        return '<button type="button" class="relative aspect-square bg-surface-container overflow-hidden" data-foto="' + i + '" aria-label="Ver foto ' + (i + 1) + '"><img src="' + esc(urlFoto(f.ruta)) + '" alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover"></button>';
      }).join('') + '</div>' : '') +
      (sube ? '<div class="flex flex-col gap-space-xs mt-space-sm">' +
        (YO.admin ? '<input class="' + INPUT + '" id="credito" maxlength="80" value="Cedida por el local" aria-label="De quién es la foto">' : '') +
        '<label class="' + BOTON + ' cursor-pointer" for="subir-foto">' + ic('add_a_photo', 'text-[20px]') + (YO.admin ? ' Subir foto del local' : ' Añadir una foto tuya') + '</label>' +
        '<input type="file" id="subir-foto" class="sr-only" accept="image/*"' + (YO.admin ? '' : ' capture="environment"') + '>' +
        '<p class="font-label-micro text-label-micro text-on-surface-variant text-center">' + (YO.admin ? 'Solo fotos con permiso del local.' : 'Hecha por ti, aquí y ahora. Sin personas que se reconozcan.') + '</p></div>' : '');
    caja.querySelectorAll('[data-foto]').forEach(function (b) { b.onclick = function () { verFoto(l, fotos[+b.dataset.foto]); }; });
    var inp = document.getElementById('subir-foto');
    if (inp) inp.onchange = function () { if (inp.files[0]) subirFoto(l, inp.files[0]); };
  }
  function reducir(file) {
    return new Promise(function (ok, mal) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? ok(b) : mal(); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(u); mal(); };
      img.src = u;
    });
  }
  async function subirFoto(l, file) {
    var caja = document.getElementById('fotos');
    var lbl = caja.querySelector('label[for="subir-foto"]'); if (lbl) lbl.innerHTML = ic('hourglass_top', 'text-[20px]') + ' Subiendo…';
    var blob;
    try { blob = await reducir(file); } catch (e) { tostada('No hemos podido leer esa foto. Prueba con otra.'); return pintarFotos(l); }
    var ruta = YO.sesion.user.id + '/' + l.id + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.jpg';
    var up = await sb.storage.from(FOTOS).upload(ruta, blob, { contentType: 'image/jpeg', upsert: false });
    if (up.error) { tostada('No se ha podido subir. ' + (checkinVivo(l.id) || YO.admin ? 'Prueba otra vez.' : 'Haz check-in primero.')); return pintarFotos(l); }
    var cr = document.getElementById('credito');
    var r = await sb.rpc('salimos_foto_registrar', { p_local: l.id, p_ruta: ruta, p_credito: cr ? cr.value : null });
    if (r.error) { await sb.storage.from(FOTOS).remove([ruta]); tostada(textoError(r.error)); return pintarFotos(l); }
    tostada('Foto subida. Gracias.');
    await cargarLocales().catch(function () {});
    pintarFotos(l);
  }
  function huella() { var h = leer('huella', ''); if (!h) { h = Date.now().toString(36) + Math.random().toString(36).slice(2, 12); guardar('huella', h); } return h; }
  function verFoto(l, f) {
    var caja = document.createElement('div');
    caja.className = 'fixed inset-0 z-50 bg-inverse-surface/90 backdrop-blur-md flex flex-col items-center justify-center p-gutter gap-space-sm';
    caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-modal', 'true'); caja.setAttribute('aria-label', 'Foto de ' + l.nombre);
    var quitar = f.mia || YO.admin;
    caja.innerHTML = '<img src="' + esc(urlFoto(f.ruta)) + '" alt="Foto de ' + esc(l.nombre) + '" class="max-w-full max-h-[70vh] rounded-lg shadow-xl object-contain">' +
      '<p class="font-label-micro text-label-micro text-surface-container-lowest">' + (f.origen === 'local' ? esc(f.credito || 'Cedida por el local') : 'De alguien que estuvo allí') + ' • ' + haceCuanto(f.fecha) + '</p>' +
      '<div class="flex flex-wrap items-center justify-center gap-space-xs">' +
      (quitar ? '<button type="button" class="flex items-center gap-1 px-3 py-2 rounded-full bg-surface-container-lowest text-on-surface font-label-prominent text-label-prominent" data-quitar>' + ic('delete', 'text-[18px]') + ' Quitar</button>'
              : '<button type="button" class="flex items-center gap-1 px-3 py-2 rounded-full bg-surface-container-lowest text-on-surface font-label-prominent text-label-prominent" data-denunciar>' + ic('flag', 'text-[18px]') + ' Denunciar</button>') +
      '<button type="button" class="flex items-center gap-1 px-3 py-2 rounded-full bg-primary-container text-on-primary-container font-label-prominent text-label-prominent" data-cerrar>' + ic('close', 'text-[18px]') + ' Cerrar</button></div>';
    function cerrar() { caja.remove(); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    caja.onclick = async function (e) {
      if (e.target === caja || e.target.closest('[data-cerrar]')) return cerrar();
      if (e.target.closest('[data-denunciar]')) {
        if (!confirm('¿Denunciar esta foto? La revisamos en menos de 24 horas.')) return;
        var d = await sb.rpc('salimos_denunciar_foto', { p_foto: f.id, p_quien: huella(), p_motivo: null });
        tostada(d.error ? textoError(d.error) : 'Gracias. La revisamos en menos de 24 horas.'); cerrar(); return pintarFotos(l);
      }
      if (e.target.closest('[data-quitar]')) {
        if (!confirm('¿Quitar esta foto?')) return;
        var q = await sb.rpc('salimos_retirar_foto', { p_foto: f.id });
        if (q.error) return tostada(textoError(q.error));
        if (f.mia) await sb.storage.from(FOTOS).remove([f.ruta]);
        tostada('Foto quitada.'); cerrar(); await cargarLocales().catch(function () {}); return pintarFotos(l);
      }
    };
    document.addEventListener('keydown', tecla);
    document.body.appendChild(caja);
    caja.querySelector('[data-cerrar]').focus();
  }
  /* Al borrar la cuenta, sus fotos se van del almacén (las filas se borran solas con el perfil). */
  async function borrarMisFotos() {
    try {
      var uid = YO.sesion.user.id, carpetas = await sb.storage.from(FOTOS).list(uid, { limit: 1000 });
      for (var i = 0; carpetas.data && i < carpetas.data.length; i++) {
        var d = uid + '/' + carpetas.data[i].name, fs = await sb.storage.from(FOTOS).list(d, { limit: 1000 });
        if (fs.data && fs.data.length) await sb.storage.from(FOTOS).remove(fs.data.map(function (f) { return d + '/' + f.name; }));
      }
    } catch (e) {}
  }

  /* ───────── enrutador ───────── */
  var TAB_ON = 'text-primary font-bold', TAB_OFF = 'text-on-surface-variant hover:text-on-surface';
  function ir() {
    var h = location.hash.replace(/^#\/?/, '');
    if (!h) h = leer('visto', 0) ? 'explorar' : 'bienvenida';
    var partes = h.split('/'), nombre = partes[0], arg = partes[1];
    (P[nombre] || P.noExiste)(arg);
    /* La ficha lleva su propia barra de botones abajo, como en Stitch: ahí no van las pestañas. */
    var sinPestanas = nombre === 'local' || nombre === 'bienvenida';
    document.querySelector('.pestanas').style.display = sinPestanas ? 'none' : '';
    document.getElementById('pie').style.display = nombre === 'bienvenida' ? 'none' : '';
    var tab = { explorar: 'explorar', cerca: 'explorar', local: 'explorar', votar: 'votar', zonas: 'zonas', recomendar: 'recomendar', top: 'top' }[nombre];
    document.querySelectorAll('.pestanas a').forEach(function (a) {
      var on = a.dataset.tab === tab;
      a.className = a.className.replace(on ? TAB_OFF : TAB_ON, on ? TAB_ON : TAB_OFF);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0); vista.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', ir);

  async function arrancar() {
    vista.innerHTML = '<p class="px-gutter pt-space-lg font-body-md text-body-md text-on-surface-variant" aria-busy="true">Cargando…</p>';
    try { await Promise.all([cargarLocales(), cargarYo()]); }
    catch (e) { vista.innerHTML = '<p class="px-gutter pt-space-lg font-body-md text-body-md text-on-surface-variant">No se ha podido cargar. Mira tu conexión y <a class="font-bold text-primary" href="">vuelve a intentarlo</a>.</p>'; return; }
    ir();
  }
  document.getElementById('destino').onclick = abrirDestinos;
  sb.auth.onAuthStateChange(function (evento) { if (evento === 'SIGNED_OUT') { YO = { sesion: null, perfil: false, admin: false, votos: {}, checkins: {} }; } });
  arrancar();
})();
