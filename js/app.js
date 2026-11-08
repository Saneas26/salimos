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
    var d = document.getElementById('destino'); if (d) d.hidden = hay.length < 2;
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
  function cifras(l, cat) {
    var crit = {}, pc = cat && l.por_categoria ? l.por_categoria[cat] : null;
    S.criteriosDe(l.tipo, l.tipo2, l.tipo3).forEach(function (c) {
      var b = (pc && pc[c.id]) || l.crit[c.id] || { suma: 0, n: 0 };
      crit[c.id] = { media: b.n ? b.suma / b.n : null, n: b.n };
    });
    var medias = Object.keys(crit).map(function (k) { return crit[k].media; }).filter(function (m) { return m != null; });
    var nota = medias.length ? medias.reduce(function (a, b) { return a + b; }, 0) / medias.length : null;
    return { nota: nota, votos: l.votos, crit: crit, rapidas: l.rapidas || {}, mio: votosDe()[l.id] };
  }

  /* La nota del local en cada categoría votada aparte: lo que nadie ha votado en ella vale lo de la nota general. */
  function notasPorCategoria(l, c) {
    var pc = l.por_categoria || {};
    var cats = [l.tipo, l.tipo3, l.tipo2].filter(function (t) { return t && (t === l.tipo || pc[t]); });
    if (cats.length < 2) return [];
    var cambian = S.criteriosDe(l.tipo, l.tipo2, l.tipo3).filter(function (cr) { return cats.some(function (t) { var o = pc[t] && pc[t][cr.id]; return o && o.suma / o.n !== c.crit[cr.id].media; }); });
    return cats.map(function (t) {
      var valor = function (cr) { var o = pc[t] && pc[t][cr.id]; return o ? o.suma / o.n : c.crit[cr.id].media; };
      var medias = S.criteriosDe(l.tipo, l.tipo2, l.tipo3).map(valor).filter(function (v) { return v != null; });
      return { nombre: tipo(t).nombre, icono: tipo(t).icono, nota: medias.reduce(function (a, b) { return a + b; }, 0) / medias.length,
        detalle: cambian.map(function (cr) { return cr.nombre + ' ' + n1(valor(cr)); }).join(' • ') };
    });
  }

  /* Los tramos de edad que más han marcado quienes votan (con 3 respuestas como mínimo). Si empatan, salen todos. */
  function mayoria(c) {
    var d = c.rapidas.edad || {}, max = 0, tot = 0;
    Object.keys(d).forEach(function (k) { tot += d[k]; if (d[k] > max) max = d[k]; });
    return tot >= 3 ? S.EDADES.filter(function (e) { return d[e.id] === max; }) : [];
  }
  /* Un local encaja con un tramo buscado si una de sus mayorías cae dentro: buscar 25–50 trae también los de 25–35. */
  function encajaEdad(m, buscados) {
    return buscados.some(function (id) { var b = S.EDADES.filter(function (e) { return e.id === id; })[0]; return m.some(function (x) { return x.min >= b.min && x.max <= b.max; }); });
  }

  /* ───────── piezas del diseño de Stitch (carpeta stitch, los code.html) ─────────
     Las clases son las de Stitch tal cual; solo cambian los textos y los datos, que son los reales. */
  function ic(nombre, clases, relleno) {
    return '<span class="material-symbols-outlined ' + (clases || '') + '"' + (relleno ? ' style="font-variation-settings: \'FILL\' 1;"' : '') + ' aria-hidden="true">' + nombre + '</span>';
  }
  function n1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function nombreTipos(l) {
    var resto = [l.tipo3, l.tipo2].filter(Boolean).map(function (t) { return tipo(t).nombre.toLowerCase(); });
    return esc(tipo(l.tipo).nombre + (resto.length > 1 ? ', ' + resto[0] + ' y ' + resto[1] : resto.length ? ' y ' + resto[0] : ''));
  }
  function euros(l) { return l.precio ? '€€€'.slice(0, l.precio) : ''; }
  function rotulo(l) { return esc((l.barrio || l.municipio).replace(/ · /g, ' • ')); }
  function seccion(t) { var s = document.getElementById('seccion'); if (s) s.textContent = t; }

  /* El hueco de la foto: hasta que haya fotos propias, el degradado del banner de Stitch con el icono del tipo. */
  /* Mapa pequeño de Gran Canaria con un punto rojo: de un vistazo, si el sitio te pilla lejos. Contorno de Natural Earth (dominio público). */
  function mapaIsla(l, clase) {
    if (l.destino !== 'Gran Canaria' || l.lat == null || l.lng == null) return '';
    var x = (l.lng - (-15.8218)) * 0.88336 * 247.101 + 8, y = (28.1798 - l.lat) * 247.101 + 8;
    return '<svg viewBox="0 0 116 126.1" class="' + clase + '" role="img" aria-label="En el mapa de Gran Canaria: ' + esc(l.municipio) + '">' +
      '<path d="M101.9 45.0 107.1 48.5 108.0 50.0 105.1 62.9 108.0 66.9 108.0 68.6 105.6 69.7 104.0 71.9 101.9 77.2 105.3 85.1 104.9 88.9 98.5 92.4 88.5 104.0 69.6 110.3 63.8 116.8 61.2 118.1 54.8 114.1 45.4 113.4 37.7 110.9 25.9 100.8 23.3 96.6 18.7 93.9 15.8 90.9 9.5 76.8 8.1 71.7 9.2 66.9 8.0 60.2 9.2 53.4 11.2 51.2 23.7 43.5 29.1 38.4 32.8 32.2 31.6 26.2 34.1 24.0 35.0 19.5 34.6 14.6 33.2 11.1 38.0 11.0 42.2 12.7 45.3 11.9 57.1 16.0 73.6 16.0 87.2 19.3 92.4 17.6 91.6 9.2 98.0 8.0 98.9 8.5 100.1 11.6 100.0 13.6 98.2 14.4 96.6 17.5 96.8 24.1 99.2 38.5 101.9 45.0Z" fill="#dce1ff" stroke="#4059aa" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11" fill="#e11d1d" stroke="#fff" stroke-width="3"/></svg>';
  }
  function lienzo(l, alto) {
    if (l.foto) return '<div class="relative w-full ' + alto + ' bg-secondary overflow-hidden"><img src="' + esc(urlFoto(l.foto)) + '" alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover">';
    return '<div class="relative w-full ' + alto + ' bg-gradient-to-br from-secondary via-on-secondary-container to-secondary overflow-hidden">' +
      '<div class="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div>' +
      '<div class="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-tertiary-fixed/15 blur-xl pointer-events-none"></div>' +
      '<div class="absolute inset-0 flex items-center justify-center">' + ic(tipo(l.tipo).icono, 'text-[88px] text-secondary-fixed/25', true) + '</div>';
  }

  /* Fila de un sitio que aún no puntúa: el icono de su tipo donde iría el puesto. */
  function filaSitio(l) {
    var c = cifras(l);
    return '<a href="#/local/' + l.id + '" class="flex items-center justify-between min-h-[68px] p-3 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container transition-colors">' +
      '<div class="flex items-center gap-3 min-w-0"><span class="w-11 flex justify-center flex-shrink-0">' + (mapaIsla(l, 'w-11 h-12') || ic(tipo(l.tipo).icono, 'text-[22px] text-secondary')) + '</span>' +
      '<div class="flex flex-col min-w-0 gap-0.5"><span class="font-headline-md text-[21px] leading-[26px] font-bold text-on-surface break-words">' + esc(l.nombre) + '</span>' +
      '<span class="font-body-md text-body-md text-on-surface-variant break-words">' + rotulo(l) + '</span></div></div>' +
      '<span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed font-label-badge text-label-badge flex-shrink-0 ml-2">' +
      (c.votos ? c.votos + (c.votos === 1 ? ' voto' : ' votos') : 'Sin votos') + '</span></a>';
  }

  /* Salimos es gratis y lleva al Grupo Saneas: la tarjeta de Saneas (asesoría nutricional) y el botón a las demás apps.
     Va en el verde de Saneas para que nadie la confunda con un local. */
  var SANEAS_WEB = 'https://saneas.es';
  function tarjetaSaneas(titulo, texto) {
    return '<a href="' + SANEAS_WEB + '" target="_blank" rel="noopener" class="w-full flex flex-col gap-2 p-space-md rounded-lg bg-[#19352d] text-white text-left shadow-md active:scale-[0.99] transition-transform" data-saneas>' +
      '<span class="font-label-micro text-label-micro uppercase tracking-wider font-bold text-[#f2c45c]">Del Grupo Saneas</span>' +
      '<span class="font-headline-md text-headline-md leading-tight">' + titulo + '</span>' +
      '<span class="font-body-lg text-body-lg text-white/90">' + texto + '</span>' +
      '<span class="mt-1 h-14 rounded-full bg-white text-[#19352d] font-body-lg text-body-lg font-bold flex items-center justify-center gap-2">' + ic('eco', 'text-[24px]', true) + 'Conocer Saneas</span></a>';
  }
  function botonAppsGrupo() {
    return '<button type="button" class="w-full min-h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 px-4 active:scale-95 transition-all" data-apps-grupo>' +
      ic('apps', 'text-[24px] text-secondary') + '¿Conoces las demás apps del Grupo Saneas?</button>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-apps-grupo]');
    if (b && window.GrupoSaneas) GrupoSaneas.abrirMenu();
  });
  function cabeceraSeccion(titulo) {
    return '<h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface px-1">' + titulo + '</h1>';
  }
  function llamadaRecomendar() {
    return '<a class="w-full h-16 rounded-full bg-primary-container text-on-primary-container font-headline-md text-headline-md shadow-md active:scale-95 transition-all flex items-center justify-center gap-2" href="#/recomendar">' +
      ic('add_location_alt', 'text-[28px] animate-bounce') + '<span>Añadir un sitio</span></a>';
  }
  /* ───────── filtros: cuatro botones grandes; cada uno abre sus opciones a la vista ───────── */
  var PRECIOS = [{ id: 1, txt: '€' }, { id: 2, txt: '€€' }, { id: 3, txt: '€€€' }];
  function resumenFiltro(k) {
    if (k === 'tipo') return filtro.tipo ? tipo(filtro.tipo).plural : '';
    if (k === 'zona') return filtro.zona === 'cerca' ? 'Cerca de mí' : filtro.zona ? zona(filtro.zona).nombre : '';
    if (k === 'orden') return filtro.orden ? (CRITERIOS().filter(function (c) { return c.id === filtro.orden; })[0] || {}).nombre : '';
    if (k === 'edad') return filtro.edades.map(function (id) { return S.EDADES.filter(function (e) { return e.id === id; })[0].nombre.replace('De ', ''); }).join(', ');
    return filtro.precio ? '€€€'.slice(0, filtro.precio) : '';
  }
  var FILTROS = { tipo: ['category', 'Qué'], zona: ['location_on', 'Dónde'], edad: ['group', 'Edad'], precio: ['euro', 'Precio'], orden: ['sort', 'Ordenar'] };
  function CRITERIOS() { return S.BASE.concat(S.EXTRAS); }
  function botonesFiltro(claves) {
    var alguno = claves.some(function (k) { return k !== 'orden' && resumenFiltro(k); });
    return '<section class="grid grid-cols-2 gap-space-xs">' + claves.map(function (k) {
      var v = resumenFiltro(k);
      /* Ordenar va a lo ancho y siempre dice cómo está ordenada la lista. */
      if (k === 'orden') return '<button type="button" class="col-span-2 min-h-16 px-4 py-2 rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-2 text-left bg-secondary text-on-secondary" data-filtro="orden" aria-haspopup="dialog">' +
        ic('sort', 'text-[26px] flex-shrink-0') + '<span class="font-body-lg text-body-lg font-bold flex-1 min-w-0 break-words">Ordenar: ' + esc(filtro.zona === 'cerca' && POS && !filtro.orden ? 'más cerca' : v ? 'mejor en ' + v.toLowerCase() : 'mejor nota') + '</span>' + ic('expand_more', 'text-[26px] flex-shrink-0') + '</button>';
      return '<button type="button" class="min-h-16 px-3 py-2 rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-2 text-left ' + (v ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface') + '" data-filtro="' + k + '" aria-haspopup="dialog">' +
        ic(FILTROS[k][0], 'text-[26px] flex-shrink-0') + '<span class="font-body-lg text-body-lg font-bold min-w-0 break-words">' + esc(v || FILTROS[k][1]) + '</span></button>';
    }).join('') + (alguno ? '<button type="button" class="col-span-2 h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition-all" data-quitar-filtros>' + ic('close', 'text-[24px]') + 'Quitar filtros</button>' : '') + '</section>';
  }
  function activarFiltros(repinta) {
    vista.querySelectorAll('[data-filtro]').forEach(function (b) { b.onclick = function () { abrirFiltro(b.dataset.filtro, repinta); }; });
    vista.querySelectorAll('[data-quitar-filtros]').forEach(function (b) {
      b.onclick = function () { filtro.tipo = ''; filtro.zona = ''; filtro.edades = []; filtro.precio = 0; filtro.orden = ''; repinta(); };
    });
  }
  function abrirFiltro(k, repinta) {
    var varias = k === 'edad';
    var ops = k === 'tipo' ? S.TIPOS.map(function (t) { return { id: t.id, icono: t.icono, txt: t.plural }; })
      : k === 'zona' ? [{ id: 'cerca', icono: 'near_me', txt: 'Cerca de mí' }].concat(S.destino(DESTINO).zonas.filter(function (z) { return LOCALES.some(function (l) { return l.zona === z.id; }); }).map(function (z) { return { id: z.id, icono: 'location_on', txt: z.nombre }; }))
      : k === 'orden' ? [{ id: '', icono: 'star', txt: 'Mejor nota' }].concat(CRITERIOS().map(function (c) { return { id: c.id, icono: c.icono, txt: 'Mejor en ' + c.nombre.toLowerCase() }; }))
      : k === 'edad' ? S.EDADES.map(function (e) { return { id: e.id, icono: 'group', txt: e.nombre + ' años' }; })
      : PRECIOS.map(function (o) { return { id: o.id, icono: 'euro', txt: o.txt }; });
    var marcado = function (id) { return k === 'tipo' ? filtro.tipo === id : k === 'zona' ? filtro.zona === id : k === 'orden' ? filtro.orden === id : k === 'edad' ? filtro.edades.indexOf(id) >= 0 : filtro.precio === id; };
    var fila = function (o) {
      var on = marcado(o.id);
      return '<button type="button" class="min-h-16 px-4 py-2 rounded-lg flex items-center gap-3 text-left active:scale-95 transition-all ' + (on ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface') + '" data-op="' + o.id + '" aria-pressed="' + on + '">' +
        ic(o.icono, 'text-[26px] flex-shrink-0') + '<span class="font-body-lg text-body-lg font-bold flex-1">' + esc(o.txt) + '</span>' + (on ? ic('check', 'text-[26px]') : '') + '</button>';
    };
    var caja = document.createElement('div');
    caja.className = 'fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-md flex items-end sm:items-center justify-center p-gutter';
    caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-modal', 'true'); caja.setAttribute('aria-label', FILTROS[k][1]);
    function pinta() {
      caja.innerHTML = '<div class="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-lg bg-surface-container-lowest p-space-md shadow-xl flex flex-col gap-space-xs animate-screen-enter">' +
        '<div class="flex items-center justify-between gap-2 mb-1"><h3 class="font-headline-md text-headline-md text-on-surface">' + FILTROS[k][1] + '</h3>' +
        '<button type="button" class="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center" data-cerrar aria-label="Cerrar">' + ic('close', 'text-[26px] text-on-surface') + '</button></div>' +
        ops.map(fila).join('') +
        (varias ? '<button type="button" class="h-16 rounded-full bg-primary-container text-on-primary-container font-headline-md text-headline-md mt-1 active:scale-95 transition-all" data-cerrar>Listo</button>' : '') + '</div>';
    }
    function cerrar() { caja.remove(); document.removeEventListener('keydown', tecla); repinta(); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    caja.onclick = function (e) {
      if (e.target === caja || e.target.closest('[data-cerrar]')) return cerrar();
      var b = e.target.closest('[data-op]'); if (!b) return;
      var id = b.dataset.op;
      if (k === 'tipo') filtro.tipo = filtro.tipo === id ? '' : id;
      else if (k === 'zona') { filtro.zona = filtro.zona === id ? '' : id; if (filtro.zona === 'cerca') { cerrar(); buscarCerca(repinta); return; } }
      else if (k === 'orden') filtro.orden = id;
      else if (k === 'precio') filtro.precio = filtro.precio === +id ? 0 : +id;
      else { var i = filtro.edades.indexOf(id); if (i >= 0) filtro.edades.splice(i, 1); else filtro.edades.push(id); pinta(); return; }
      cerrar();
    };
    pinta();
    document.addEventListener('keydown', tecla);
    document.body.appendChild(caja);
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
      '<h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight mb-space-xs max-w-xs">El ocio de Gran Canaria, sin trucos ni pagos</h1>' +
      '</section>' +
      '<section class="flex flex-col gap-space-sm mb-space-lg">' +
      pilares.map(function (p) {
        return '<div class="pillar-card group cursor-pointer p-space-lg rounded-2xl bg-surface-container-low shadow-sm flex flex-col gap-space-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]">' +
          '<div class="flex items-center justify-between"><div class="w-10 h-10 rounded-xl ' + p[1] + ' flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">' + ic(p[0], 'text-body-lg font-bold') + '</div>' +
          '</div>' +
          '<h3 class="font-label-prominent text-headline-md text-on-surface mt-1">' + p[3] + '</h3></div>';
      }).join('') + '</section>' +
      '<div class="flex flex-col gap-space-sm pt-space-xs sticky bottom-0 bg-gradient-to-t from-surface via-surface to-transparent pb-space-sm">' +
      '<button type="button" class="w-full h-16 bg-primary-container text-on-primary-container font-headline-md text-headline-md rounded-full flex items-center justify-center gap-space-sm shadow-lg hover:brightness-105 active:scale-95 transition-all" id="empezar">' + ic('explore', 'text-[28px]', true) + '<span>Ver dónde salir</span></button>' +
      '<a class="w-full min-h-12 py-space-sm text-center font-body-lg text-body-lg font-bold text-secondary hover:text-primary transition-colors" href="#/como-funciona">Cómo funciona</a></div></div>';

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
      b.innerHTML = ic('sync', 'text-[28px] animate-spin') + '<span>Un momento…</span>';
      document.getElementById('manifiesto').classList.add('page-exit');
      setTimeout(function () { location.hash = '#/explorar'; }, 450);
    };
  };

  var filtro = { tipo: '', zona: '', texto: '', edades: [], precio: 0, orden: '' };

  /* Salir: todo en una pantalla. Buscador, los filtros y una sola lista con todos los sitios, del mejor al peor. */
  P.explorar = function () {
    seccion('Salir');
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile sm:px-gutter gap-space-md pb-6 pt-space-md animate-screen-enter">' +
      /* Banner de Stitch */
      '<section class="relative overflow-hidden rounded-lg bg-gradient-to-br from-secondary via-on-secondary-container to-secondary p-space-lg shadow-xl text-on-secondary">' +
      '<div class="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div><div class="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-tertiary-fixed/15 blur-xl pointer-events-none"></div>' +
      '<h2 class="relative z-10 font-display-hero text-[44px] leading-[50px] font-extrabold tracking-tight text-on-secondary">¿Aquí dónde <span class="text-primary-container">se sale?</span></h2></section>' +
      buscador('busca', 'Buscar un sitio') +
      (destinosConSitios().length > 1 ? '<button type="button" class="h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 w-full" data-destinos>' + ic(S.destino(DESTINO).icono, 'text-[24px]') + esc(DESTINO) + ic('expand_more', 'text-[24px]') + '</button>' : '') +
      botonesFiltro(['tipo', 'zona', 'edad', 'precio', 'orden']) +
      '<p class="font-body-lg text-body-lg font-bold text-on-surface-variant px-1" id="cuantos" aria-live="polite"></p>' +
      '<div class="flex flex-col gap-space-xs" id="lista"></div>' +
      llamadaRecomendar() + '</div>';
    vista.querySelectorAll('[data-destinos]').forEach(function (b) { b.onclick = abrirDestinos; });
    activarFiltros(P.explorar);
    document.getElementById('busca').oninput = function (e) { filtro.texto = e.target.value; pintarLista(); };
    pintarLista();
    ubicar();
  };
  function buscador(id, texto) {
    return '<label class="flex items-center gap-3 h-16 px-5 rounded-full bg-surface-container-lowest shadow-md">' + ic('search', 'text-[28px] text-secondary') +
      '<span class="sr-only">' + texto + '</span><input type="search" id="' + id + '" class="flex-1 min-w-0 bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none" placeholder="' + texto + '" value="' + esc(filtro.texto) + '" autocomplete="off"></label>';
  }

  function sinTildes(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function filtrados(sinTexto) {
    var q = sinTexto ? '' : sinTildes(filtro.texto.trim());
    return LOCALES.filter(function (l) {
      if (filtro.tipo && l.tipo !== filtro.tipo && l.tipo2 !== filtro.tipo && l.tipo3 !== filtro.tipo) return false;
      if (filtro.zona && filtro.zona !== 'cerca' && l.zona !== filtro.zona) return false;
      if (filtro.precio && l.precio !== filtro.precio) return false;
      if (filtro.edades.length && !encajaEdad(mayoria(cifras(l)), filtro.edades)) return false;
      if (q && sinTildes(l.nombre + ' ' + l.municipio + ' ' + (l.barrio || '') + ' ' + tipo(l.tipo).nombre + ' ' + (l.tipo3 ? tipo(l.tipo3).nombre : '') + ' ' + ((zona(l.zona) || {}).nombre || '')).indexOf(q) < 0) return false;
      return true;
    });
  }
  function km(l) { return POS && l.lat != null ? kmEntre(POS.lat, POS.lng, l.lat, l.lng) : null; }
  /* El orden de la lista: más cerca (si se eligió «Cerca de mí»), la nota general o la de una parte.
     Primero los que tienen nota, de mayor a menor; detrás los que aún no, por orden alfabético. */
  function ordenados(base) {
    var cerca = filtro.zona === 'cerca' && POS && !filtro.orden;
    return base.filter(function (l) { return !filtro.orden || S.criteriosDe(l.tipo, l.tipo2, l.tipo3).some(function (c) { return c.id === filtro.orden; }); })
      .map(function (l) {
        var c = cifras(l, filtro.tipo), d = filtro.orden ? c.crit[filtro.orden] : null;
        return { l: l, v: filtro.orden ? (d ? d.media : null) : c.nota, n: filtro.orden ? (d ? d.n : 0) : c.votos, km: km(l) };
      })
      .sort(function (a, b) {
        if (cerca) return (a.km == null ? 1e9 : a.km) - (b.km == null ? 1e9 : b.km);
        if ((a.v == null) !== (b.v == null)) return a.v == null ? 1 : -1;
        return (b.v || 0) - (a.v || 0) || b.n - a.n || a.l.nombre.localeCompare(b.l.nombre, 'es');
      });
  }
  function pintarLista() {
    var caja = document.getElementById('lista'); if (!caja) return;
    var lista = ordenados(filtrados());
    document.getElementById('cuantos').textContent = lista.length + (lista.length === 1 ? ' sitio' : ' sitios');
    var filas = lista.map(function (x) { return filaSalir(x.l, x.v, x.n, x.km); });
    /* Una sola tarjeta de Saneas, a mitad de lista (como mucho detrás del sexto sitio, para que se vea). */
    if (filas.length >= 2) filas.splice(Math.min(6, Math.floor(filas.length / 2)), 0, tarjetaSaneas('¿Sales mucho a comer?', 'Saneas te enseña a comer fuera sin engordar. Asesoría nutricional en Gran Canaria.'));
    caja.innerHTML = lista.length ? filas.join('')
      : '<p class="p-space-md rounded-lg bg-surface-container-low font-body-lg text-body-lg text-on-surface">No hay ninguno así. Quita algún filtro.</p>';
  }
  /* Fila de la lista de Salir: el nombre entero, dónde está, qué es y su nota bien grande. */
  function filaSalir(l, valor, n, dist) {
    var lugar = rotulo(l) + ' • ' + nombreTipos(l) + (l.precio ? ' • ' + euros(l) : '');
    return '<a href="#/local/' + l.id + '" class="flex items-center gap-3 min-h-[76px] p-3 rounded-DEFAULT bg-surface-container-lowest shadow-sm hover:bg-surface-container transition-colors">' +
      '<span class="w-11 flex justify-center flex-shrink-0">' + (mapaIsla(l, 'w-11 h-12') || ic(tipo(l.tipo).icono, 'text-[22px] text-secondary')) + '</span>' +
      '<div class="flex flex-col min-w-0 flex-1 gap-0.5"><span class="font-headline-md text-[20px] leading-[25px] font-bold text-on-surface break-words">' + esc(l.nombre) + '</span>' +
      '<span class="font-body-md text-body-md text-on-surface-variant break-words">' + lugar + '</span>' +
      (dist != null && filtro.zona === 'cerca' ? '<span class="font-body-md text-body-md font-bold text-secondary flex items-center gap-1">' + ic('near_me', 'text-[16px]') + 'A ' + distancia(dist) + '</span>' : '') + '</div>' +
      (valor != null ? '<div class="flex flex-col items-center flex-shrink-0 min-w-[56px]"><span class="px-2.5 py-1 rounded-DEFAULT bg-primary-container text-on-primary-container font-score-display text-[24px] leading-none">' + n1(valor) + '</span>' +
        '<span class="font-label-micro text-label-micro text-on-surface-variant mt-1">' + n + (n === 1 ? ' voto' : ' votos') + '</span></div>'
        : '<span class="px-2.5 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed font-label-badge text-label-badge flex-shrink-0">Sin votos</span>') + '</a>';
  }

  /* Las pestañas de antes (Listas y Zonas) ahora son Salir; los enlaces viejos siguen funcionando. */
  P.top = function () { location.replace('#/explorar'); };
  P.zonas = function () { location.replace('#/explorar'); };

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
    seccion('Sitio');
    var c = cifras(l), m = mayoria(c), notasCat = notasPorCategoria(l, c);
    var mapa = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.nombre + ', ' + (l.direccion || l.barrio || '') + ', ' + l.municipio + ', ' + l.destino);

    var criterios = S.criteriosDe(l.tipo, l.tipo2, l.tipo3).map(function (cr, i) {
      var d = c.crit[cr.id], k = CRIT_COLOR[i % CRIT_COLOR.length];
      return '<div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm"><div class="flex items-center justify-between mb-1.5"><div class="flex items-center gap-2 min-w-0">' +
        '<div class="w-8 h-8 rounded-full ' + k[0] + ' flex items-center justify-center flex-shrink-0">' + ic(cr.icono, 'text-[18px]') + '</div>' +
        '<div class="min-w-0"><h4 class="font-body-lg text-body-lg text-on-surface font-bold">' + esc(cr.nombre) + '</h4></div></div>' +
        '<span class="font-score-display text-score-display ' + (d.media == null ? 'text-on-surface-variant' : k[1]) + ' ml-2">' + (d.media == null ? '–' : n1(d.media)) + '</span></div>' +
        '<div class="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden"><div class="h-full ' + k[2] + ' rounded-full" style="width: ' + (d.media == null ? 0 : d.media * 10) + '%;"></div></div></div>';
    }).join('');

    /* Veredicto: la respuesta más votada de cada pregunta rápida, con su porcentaje. */
    var ICONO_RAPIDA = { volver: 'thumb_up', precio: 'price_check', guagua: 'directions_bus', edad: 'group' };
    var veredicto = S.RAPIDAS.map(function (r) {
      var d = c.rapidas[r.id] || {}, tot = 0, mejor = null;
      r.opciones.forEach(function (o) { tot += d[o[0]] || 0; if (!mejor || (d[o[0]] || 0) > (d[mejor[0]] || 0)) mejor = o; });
      if (!tot) return '';
      var empate = r.opciones.filter(function (o) { return (d[o[0]] || 0) === (d[mejor[0]] || 0); });
      var respuesta = r.id === 'edad' && empate.length > 1
        ? empate.map(function (o, i) { return i ? o[1].toLowerCase() : o[1]; }).join(', ').replace(/, ([^,]*)$/, ' y $1')
        : mejor[1] + ' • ' + Math.round((d[mejor[0]] || 0) / tot * 100) + ' %';
      return '<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-badge text-label-badge shadow-sm">' + ic(ICONO_RAPIDA[r.id], 'text-[16px] text-tertiary') +
        '<span>' + esc(r.pregunta.replace(/[¿?]/g, '')) + ': ' + esc(respuesta) + '</span></div>';
    }).join('');
    var etiquetas = (l.etiquetas || []).map(function (e) {
      return '<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-badge text-label-badge shadow-sm">' + ic('check_circle', 'text-[16px] text-tertiary') + '<span>' + esc(e) + '</span></div>';
    }).join('');
    var dato = function (icono, html) { return '<div class="flex items-start gap-2 bg-surface-container-lowest p-2.5 rounded-DEFAULT">' + ic(icono, 'text-[18px] text-secondary flex-shrink-0') + '<span class="font-body-md text-body-md text-on-surface min-w-0 break-words">' + html + '</span></div>'; };
    var datos = [
      l.direccion ? dato('location_on', esc(l.direccion)) : '',
      /* Para reservar: uno o varios teléfonos separados por «/» (fijo / móvil). */
      l.telefono ? dato('call', l.telefono.split('/').map(function (t) {
        t = t.trim(); return '<a class="font-bold text-secondary" href="tel:+34' + t.replace(/\D/g, '').replace(/^34(?=\d{9}$)/, '') + '">' + esc(t) + '</a>';
      }).join(' · ')) : '',
      /* Contacto en la red: uno o varios enlaces separados por espacios (web, Instagram, Facebook, correo). */
      l.web ? dato('language', l.web.trim().split(/\s+/).map(function (u) {
        var texto = /^mailto:/.test(u) ? u.slice(7) : /instagram\.com/.test(u) ? 'Instagram' : /facebook\.com/.test(u) ? 'Facebook'
          : u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
        return '<a class="font-bold text-secondary" href="' + esc(u) + '"' + (/^mailto:/.test(u) ? '' : ' target="_blank" rel="noopener"') + '>' + esc(texto) + '</a>';
      }).join(' · ')) : '',
      l.precios ? dato('euro', esc(l.precios)) : '',
      l.consejo ? dato('lightbulb', esc(l.consejo)) : ''
    ].join('');
    var guardado = guardados().indexOf(id) >= 0;

    vista.innerHTML = '<div class="flex flex-col w-full animate-screen-enter">' +
      '<div class="px-gutter pt-space-md pb-space-sm flex items-center justify-between gap-2"><div class="flex items-center gap-space-xs min-w-0">' +
      '<button type="button" class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-all flex-shrink-0" id="atras" aria-label="Volver">' + ic('arrow_back_ios_new', 'text-[22px]') + '</button>' +
      '</div>' +
      '<div class="flex items-center gap-space-xs flex-shrink-0">' +
      '<button type="button" class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-transform active:scale-95 shadow-sm" id="btn-share" aria-label="Compartir">' + ic('share', 'text-[20px]') + '</button>' +
      '<button type="button" class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-transform active:scale-95 shadow-sm" id="btn-bookmark" aria-label="Guardar" aria-pressed="' + guardado + '">' +
      '<span class="material-symbols-outlined text-[20px]' + (guardado ? ' text-primary-container' : '') + '" id="bookmark-icon"' + (guardado ? ' style="font-variation-settings: \'FILL\' 1;"' : '') + ' aria-hidden="true">' + (guardado ? 'bookmark' : 'bookmark_border') + '</span></button></div></div>' +
      /* Cabecera con el degradado donde irá la foto */
      '<div class="px-gutter pb-space-md"><div class="relative w-full h-56 rounded-lg overflow-hidden shadow-md group" id="cab-foto">' + lienzo(l, 'h-full') + '</div>' +
      '<div class="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/25 to-transparent"></div>' +
      (l.precio ? '<div class="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-secondary text-on-secondary font-label-prominent text-label-prominent flex items-center gap-1">' + euros(l) + '</div>' : '') +
      '<div class="absolute bottom-3 left-3 right-3 text-surface-container-lowest flex items-end justify-between gap-2"><div class="min-w-0">' +
      '<span class="font-label-badge text-label-badge uppercase tracking-wider text-primary-fixed-dim">' + rotulo(l) + '</span>' +
      '<h2 class="font-headline-lg-mobile text-headline-lg-mobile text-surface-container-lowest leading-tight">' + esc(l.nombre) + '</h2></div>' +
      (m.length ? '<span class="px-2.5 py-1 rounded-full bg-surface-container-lowest/20 backdrop-blur-md font-label-micro text-label-micro text-surface-container-lowest flex-shrink-0">Gente de ' + m.map(function (x) { return x.nombre.replace('De ', '').toLowerCase(); }).join(', de ').replace(/, de ([^,]*)$/, ' y de $1') + '</span>' : '') +
      '</div></div><p class="hidden pt-1.5 font-label-micro text-label-micro text-on-surface-variant text-right" id="credito-google"></p></div>' +
      '<div class="px-gutter pb-space-md flex items-center gap-space-md">' + mapaIsla(l, 'w-20 h-[88px] flex-shrink-0') + '<p class="font-body-md text-body-md text-on-surface-variant flex items-center gap-1.5">' + ic('explore', 'text-[18px] text-secondary flex-shrink-0') +
      '<span>' + nombreTipos(l) + ' • ' + esc(l.municipio) + '</span></p></div>' +
      /* Tarjeta azul de la nota */
      '<div class="px-gutter pb-space-md"><div class="relative overflow-hidden rounded-lg bg-secondary text-on-secondary p-space-lg shadow-xl">' +
      '<div class="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none"></div>' +
      '<div class="flex items-center justify-between gap-space-md relative z-10"><div class="flex items-center gap-space-md">' +
      '<div class="relative flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-lg">' + ic('ecg_heart', 'text-[32px] text-on-secondary', true) +
      '<div class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container shadow">' + ic('check', 'text-[16px] font-bold') + '</div></div>' +
      '<div><div class="flex items-baseline gap-1"><span class="font-display-hero text-display-hero text-on-secondary tracking-tight">' + (c.nota == null ? '–' : n1(c.nota)) + '</span><span class="font-headline-md text-headline-md text-primary-fixed-dim">/ 10</span></div>' +
      '</div></div>' +
      '<p class="font-body-lg text-body-lg font-bold text-on-secondary text-right">' + (c.votos ? c.votos + (c.votos === 1 ? ' voto' : ' votos') : 'Sin votos') + '</p></div></div></div>' +
      (datos ? '<div class="px-gutter pb-space-md"><div class="bg-surface-container p-space-md rounded-lg"><div class="flex items-center gap-2 mb-2">' + ic('directions', 'text-[22px] text-secondary') +
        '<h3 class="font-headline-md text-headline-md text-on-surface">Cómo llegar</h3></div><div class="flex flex-col gap-2">' + datos + '</div></div></div>' : '') +
      tarjetaCheckin(l) +
      (l.nota_oscar ? '<div class="px-gutter pb-space-lg"><div class="rounded-lg bg-surface-container-lowest p-space-lg shadow-sm"><div class="flex items-center gap-2 mb-space-xs">' + ic('format_quote', 'text-[24px] text-primary') + '<h3 class="font-headline-md text-headline-md text-on-surface">Lo que dice Óscar</h3></div>' +
        '<p class="font-body-lg text-body-lg text-on-surface">' + esc(l.nota_oscar) + '</p><p class="font-label-prominent text-label-prominent text-on-surface-variant mt-space-sm">Óscar, de Salimos</p></div></div>' : '') +
      '<div class="px-gutter pb-space-lg" id="fotos"></div>' +
      (l.video ? '<div class="px-gutter pb-space-lg"><h3 class="font-headline-md text-headline-md text-on-surface mb-space-xs">En vídeo</h3><div id="caja-video">' +
        '<button type="button" id="ver-video" class="w-full h-16 rounded-full bg-secondary text-on-secondary font-headline-md text-headline-md flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95">' + ic('play_circle', 'text-[28px]') + ' Ver el vídeo</button></div>' +
        '<p class="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">Vídeo' + (l.video_autor ? ' de @' + esc(l.video_autor) : '') + ' en ' + (/tiktok\.com/.test(l.video) ? 'TikTok' : 'Instagram') + '</p></div>' : '') +
      (etiquetas ? '<div class="px-gutter pb-space-lg"><div class="flex items-center justify-between mb-space-xs"><h3 class="font-headline-md text-headline-md text-on-surface">Lo que tiene</h3></div>' +
        '<div class="flex flex-wrap gap-space-xs mt-space-xs">' + etiquetas + '</div></div>' : '') +
      '<div class="px-gutter pb-space-lg"><div class="flex items-center justify-between mb-space-xs"><h3 class="font-headline-md text-headline-md text-on-surface">Lo que dice la gente</h3></div>' +
      '<div class="flex flex-wrap gap-space-xs mt-space-xs">' + (veredicto || '<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-badge text-label-badge shadow-sm">' + ic('how_to_vote', 'text-[16px] text-primary-container') + '<span>Todavía sin respuestas: sé el primero</span></div>') + '</div></div>' +
      '<div class="px-gutter pb-space-lg"><div class="flex items-center justify-between mb-space-sm"><h3 class="font-headline-md text-headline-md text-on-surface">Notas</h3></div>' +
      '<div class="flex flex-col gap-space-sm">' + criterios + '</div></div>' +
      (notasCat.length ? '<div class="px-gutter pb-space-lg"><h3 class="font-headline-md text-headline-md text-on-surface mb-space-sm">Por categoría</h3><div class="flex flex-col gap-space-xs">' +
        notasCat.map(function (n) {
          return '<div class="flex items-center justify-between gap-3 bg-surface-container p-space-md rounded-lg"><div class="flex items-center gap-2 min-w-0">' + ic(n.icono, 'text-[22px] text-secondary') +
            '<div class="flex flex-col min-w-0"><span class="font-label-prominent text-label-prominent text-on-surface">' + esc(n.nombre) + '</span><span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(n.detalle) + '</span></div></div>' +
            '<span class="font-score-display text-score-display text-primary flex-shrink-0">' + n1(n.nota) + '</span></div>';
        }).join('') + '</div></div>' : '') +
      (l.comentarios ? '<div class="px-gutter pb-space-xl" id="comentarios" aria-busy="true"><div class="flex items-center justify-between mb-space-sm"><h3 class="font-headline-md text-headline-md text-on-surface">Comentarios</h3>' +
        '<span class="font-label-badge text-label-badge text-secondary">' + l.comentarios + (l.comentarios === 1 ? ' comentario' : ' comentarios') + '</span></div><div class="flex flex-col gap-space-sm lista"><p class="font-body-sm text-body-sm text-on-surface-variant">Cargando comentarios…</p></div></div>' : '') +
      ([l.tipo, l.tipo2, l.tipo3].some(function (t) { return t === 'restaurante' || t === 'guachinche'; })
        ? '<div class="px-gutter pb-space-lg">' + tarjetaSaneas('Comer fuera sin salirte de tu plan', 'Saneas, asesoría nutricional en Gran Canaria.') + '</div>' : '') +
      '<div class="sticky bottom-0 inset-x-0 bg-surface-container-lowest/90 backdrop-blur-xl p-space-md shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-40"><div class="flex items-center gap-space-sm max-w-lg mx-auto">' +
      '<a class="flex-1 h-16 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-transform active:scale-95 shadow-sm" href="' + mapa + '" target="_blank" rel="noopener">' + ic('map', 'text-[20px] text-secondary') + '<span>Mapa</span></a>' +
      '<a class="flex-[1.6] h-16 rounded-full bg-primary-container text-on-surface font-headline-md text-[20px] flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 hover:brightness-105" href="#/votar/' + l.id + '">' + ic('how_to_vote', 'text-[20px]') + '<span>' + (c.mio ? 'Cambiar mi voto' : 'Votar') + '</span></a></div></div></div>';

    document.getElementById('atras').onclick = function () { if (history.length > 1) history.back(); else location.hash = '#/explorar'; };
    var bc = document.getElementById('checkin'); if (bc) bc.onclick = function () { hacerCheckin(l, bc); };
    var bv = document.getElementById('ver-video');
    if (bv) bv.onclick = function () {
      /* Instagram o TikTok solo entran si se pulsa. El sandbox sin allow-popups ni allow-top-navigation impide que un toque saque de la app. */
      document.getElementById('caja-video').innerHTML = '<iframe src="' + esc(urlVideo(l.video)) + '" title="Vídeo de ' + esc(l.nombre) + '" class="w-full rounded-lg bg-surface-container" style="height:640px;border:0" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
    };
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
  /* Votar: el mismo buscador y los mismos filtros que Salir, por orden alfabético (o por distancia, con «Cerca de mí»). */
  function elegirParaVotar() {
    seccion('Votar');
    vista.innerHTML = '<div class="px-gutter pt-space-md pb-space-lg flex flex-col gap-space-md animate-screen-enter">' + cabeceraSeccion('¿Dónde has estado?') +
      buscador('busca-voto', 'Buscar un sitio') + botonesFiltro(['tipo', 'zona', 'edad', 'precio']) +
      '<div class="flex flex-col gap-space-xs" id="para-votar"></div>' + llamadaRecomendar() + '</div>';
    activarFiltros(elegirParaVotar);
    function pinta() {
      var cerca = filtro.zona === 'cerca' && POS;
      var l = filtrados().sort(function (a, b) { return cerca ? (km(a) == null ? 1e9 : km(a)) - (km(b) == null ? 1e9 : km(b)) : a.nombre.localeCompare(b.nombre, 'es'); });
      document.getElementById('para-votar').innerHTML = l.map(function (x) { return filaSitio(x).replace('#/local/', '#/votar/'); }).join('') ||
        '<p class="p-space-md rounded-DEFAULT bg-surface-container-low font-body-lg text-body-lg text-on-surface">No está. Añádelo abajo.</p>';
    }
    document.getElementById('busca-voto').oninput = function (e) { filtro.texto = e.target.value; pinta(); };
    pinta();
  }
  function cabeceraVotar(l) {
    return '<div class="flex items-center justify-between gap-space-sm"><h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface min-w-0">' + esc(l.nombre) + '</h1>' +
      '<div class="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-full bg-inverse-surface shadow-md"><span class="font-score-display text-score-display text-primary-fixed-dim" id="global-live-score">–</span></div></div>';
  }

  var TAG_ON = 'tag-pill active-tag min-h-14 px-5 py-2 rounded-full bg-secondary text-on-secondary font-body-lg text-body-lg font-bold transition-all flex items-center gap-2 shadow-xs';
  var TAG_OFF = 'tag-pill min-h-14 px-5 py-2 rounded-full bg-surface-container-highest text-on-surface font-body-lg text-body-lg font-bold hover:bg-surface-variant transition-all flex items-center gap-2';

  P.votar = function (id) {
    if (!id) return elegirParaVotar();
    var l = local(id); if (!l) return P.noExiste();
    if (!usuario() || !YO.perfil) { guardar('vuelta', '#/votar/' + id); location.hash = '#/entrar'; return; }
    seccion('Votar');
    var previo = votosDe()[id] || { crit: {}, rapidas: {} };
    var voto = { crit: Object.assign({}, previo.crit), rapidas: Object.assign({}, previo.rapidas), comentario: previo.comentario, pc: JSON.parse(JSON.stringify(previo.por_categoria || {})) };
    var crits = S.criteriosDe(l.tipo, l.tipo2, l.tipo3);
    /* Cada categoría del local se vota aparte. La primera es la nota general; las otras parten de ella y guardan solo lo que cambia. */
    var cats = [l.tipo, l.tipo3, l.tipo2].filter(Boolean), cat = l.tipo;
    var PALABRA = ['Fatal', 'Fatal', 'Muy mal', 'Mal', 'Flojo', 'Regular', 'Aprobado', 'Bien', 'Muy bien', 'Excelente', 'Perfecto'];

    vista.innerHTML = '<div class="px-gutter pt-space-md pb-space-lg flex flex-col gap-space-md animate-screen-enter">' + cabeceraVotar(l) + avisoVerificado(l, previo) +
      (cats.length > 1 ? '<div class="flex flex-col gap-space-xs" id="categorias"><div class="flex items-center gap-2 flex-wrap" role="group" aria-label="Categoría que votas">' + cats.map(function (t) {
          return '<button type="button" class="' + (t === cat ? TAG_ON : TAG_OFF) + '" data-cat="' + t + '" aria-pressed="' + (t === cat) + '">' + ic(tipo(t).icono, 'text-[24px]') + '<span>' + esc(tipo(t).nombre) + '</span></button>';
        }).join('') + '</div><p class="font-body-lg text-body-lg font-bold text-on-surface px-1" id="cat-ayuda"></p></div>' : '') +
      '<div class="flex flex-col gap-space-sm">' +
      crits.map(function (c) {
        var v = voto.crit[c.id];
        return '<div class="criteria-card rounded-DEFAULT bg-surface-container-lowest p-space-md shadow-sm transition-all flex flex-col gap-3' + (v == null ? ' sin-votar' : '') + '" data-c="' + c.id + '">' +
          '<div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 min-w-0">' + ic(c.icono, 'text-[28px] text-primary flex-shrink-0') +
          '<div class="flex flex-col min-w-0"><label class="font-headline-md text-headline-md text-on-surface" for="r-' + c.id + '">' + esc(c.nombre) + '</label>' +
          '<span class="font-body-md text-body-md text-tertiary font-semibold" id="p-' + c.id + '"></span></div></div>' +
          '<span class="font-display-hero text-display-hero text-primary-container flex-shrink-0" id="o-' + c.id + '"></span></div>' +
          '<input class="rating-slider w-full h-3 rounded-full appearance-none cursor-pointer bg-surface-container-highest accent-primary-container" type="range" id="r-' + c.id + '" min="0" max="10" step="1" value="' + (v == null ? 5 : v) + '">' +
          '<button type="button" class="no-se self-end min-h-12 px-5 rounded-full bg-surface-container-highest text-on-surface font-body-md text-body-md font-bold" data-c="' + c.id + '">No lo sé</button></div>';
      }).join('') + '</div>' +
      (cats.length > 1 ? '<button class="boton-off w-full h-16 rounded-full bg-primary-container text-on-primary-container font-headline-md text-headline-md flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform" id="cat-siguiente" type="button"></button>' : '') +
      '<div class="flex flex-col gap-space-md" id="paso-final"><div class="flex flex-col gap-space-sm pt-space-xs">' +
      S.RAPIDAS.map(function (r) {
        return '<div class="rounded-DEFAULT bg-surface-container-low p-space-md shadow-xs flex flex-col gap-3"><span class="font-body-lg text-body-lg font-bold text-on-surface" id="q-' + r.id + '">' + r.pregunta + (r.id === 'edad' ? ' <span class="font-body-md text-body-md font-normal text-on-surface-variant">(puedes marcar varias)</span>' : '') + '</span>' +
          '<div class="flex items-center gap-2 flex-wrap" role="group" aria-labelledby="q-' + r.id + '">' + r.opciones.map(function (o) {
            var on = marcada(r.id, o[0]);
            return '<button type="button" class="' + (on ? TAG_ON : TAG_OFF) + '" data-r="' + r.id + '" data-v="' + o[0] + '" aria-pressed="' + on + '"><span>' + o[1] + '</span></button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="flex flex-col gap-2 pt-space-xs"><label class="font-body-lg text-body-lg font-bold text-on-surface px-1" for="review-opinion">Comentario (si quieres)</label>' +
      (previo.retirado ? '<p class="font-body-md text-body-md text-error font-semibold px-1">Se retiró por no cumplir las normas. Si lo cambias, se vuelve a publicar.</p>' : '') +
      '<div class="relative rounded-DEFAULT bg-surface-container-lowest p-space-md shadow-sm"><textarea class="w-full bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none resize-none" id="review-opinion" maxlength="300" rows="3" placeholder="Sin insultos ni nombres de trabajadores">' + esc(voto.comentario || '') + '</textarea>' +
      '<div class="flex items-center justify-between mt-2 pt-2 text-on-surface-variant font-body-md text-body-md"><div class="flex items-center gap-1">' + ic('lock', 'text-[20px]') + '<span>Anónimo</span></div>' +
      '<span id="char-count">' + (voto.comentario || '').length + '/300</span></div></div></div>' +
      '<div class="pt-space-sm pb-space-md"><button class="boton-off w-full h-16 rounded-full bg-primary-container text-on-primary-container font-headline-md text-headline-md flex items-center justify-center gap-space-sm shadow-md active:scale-95 transition-transform hover:shadow-lg" id="submit-vote-btn" type="button">' +
      ic('send', 'text-[26px]', true) + '<span>Publicar</span></button></div></div>' +
      '<p class="font-body-lg text-body-lg font-bold text-center text-error" id="falta" role="alert"></p>' +
      '<div class="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-md hidden flex items-center justify-center p-gutter" id="vote-modal-success"><div class="w-full max-w-sm max-h-[88vh] overflow-y-auto rounded-lg bg-surface-container-lowest p-space-lg shadow-xl flex flex-col items-center text-center animate-screen-enter">' +
      '<div class="w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-space-sm shadow-sm">' + ic('how_to_reg', 'text-[36px]', true) + '</div>' +
      '<h3 class="font-headline-md text-headline-md text-on-surface">¡Publicado!</h3>' +
      '<div class="mt-space-md p-space-sm rounded-DEFAULT bg-surface-container flex items-center justify-between w-full"><span class="font-body-lg text-body-lg text-on-surface">Tu nota</span><span class="font-score-display text-score-display text-primary" id="modal-final-score"></span></div>' +
      '<a class="mt-space-lg w-full h-14 rounded-full bg-secondary text-on-secondary font-body-lg text-body-lg font-bold flex items-center justify-center active:scale-95 transition-all" href="#/local/' + id + '">Ver el sitio</a>' +
      '<a class="mt-space-sm w-full h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center active:scale-95 transition-all" href="#/explorar">Seguir</a>' +
      '<div class="mt-space-lg w-full flex flex-col gap-space-sm">' + tarjetaSaneas('¿Sales a comer y no quieres engordar?', 'Saneas te enseña a hacerlo sin dejar de salir.') + botonAppsGrupo() + '</div></div></div></div>';

    function marcada(k, v) { return k === 'edad' ? (voto.rapidas.edad || '').split(',').indexOf(v) >= 0 : voto.rapidas[k] === v; }
    function valor(cid) {
      var o = cat !== l.tipo && voto.pc[cat] ? voto.pc[cat][cid] : null;
      return o != null ? o : voto.crit[cid];
    }
    function media(general) {
      var vs = crits.map(function (c) { return general ? voto.crit[c.id] : valor(c.id); }).filter(function (v) { return v != null; });
      if (!vs.length) return '–';
      return n1(vs.reduce(function (a, b) { return a + b; }, 0) / vs.length);
    }
    function marcar(cid, n) {
      if (cat === l.tipo) { if (n == null) delete voto.crit[cid]; else voto.crit[cid] = n; }
      else {
        voto.pc[cat] = voto.pc[cat] || {};
        if (n == null || n === voto.crit[cid]) delete voto.pc[cat][cid]; else voto.pc[cat][cid] = n;
      }
      pintar(cid);
    }
    function pintar(cid) {
      var v = valor(cid);
      var r = document.getElementById('r-' + cid);
      document.getElementById('o-' + cid).textContent = v == null ? '–' : v;
      document.getElementById('p-' + cid).textContent = v == null ? 'Sin votar' : PALABRA[v];
      r.setAttribute('aria-valuetext', v == null ? 'Sin votar' : v + ', ' + PALABRA[v]);
      r.value = v == null ? 5 : v;
      r.closest('.criteria-card').classList.toggle('sin-votar', v == null);
      document.getElementById('global-live-score').textContent = media();
      revisar();
    }
    function revisar() {
      var n = Object.keys(voto.crit).length, falta = Math.max(0, 3 - n), sig = document.getElementById('cat-siguiente');
      document.getElementById('submit-vote-btn').disabled = falta > 0;
      if (sig) sig.disabled = falta > 0;
      document.getElementById('falta').textContent = falta ? (falta === 1 ? 'Falta 1 nota.' : 'Faltan ' + falta + ' notas.') : '';
    }
    function pintarCategoria() {
      vista.querySelectorAll('[data-cat]').forEach(function (b) { var a = b.dataset.cat === cat; b.className = a ? TAG_ON : TAG_OFF; b.setAttribute('aria-pressed', a); });
      var paso = cats.indexOf(cat), ayuda = document.getElementById('cat-ayuda'), sig = document.getElementById('cat-siguiente'), ultimo = paso === cats.length - 1;
      if (ayuda) ayuda.textContent = 'Paso ' + (paso + 1) + ' de ' + cats.length + ': ' + tipo(cat).nombre;
      if (sig) { sig.classList.toggle('hidden', ultimo); if (!ultimo) sig.innerHTML = '<span>Siguiente: ' + esc(tipo(cats[paso + 1]).nombre) + '</span>' + ic('arrow_forward', 'text-[26px]'); }
      document.getElementById('paso-final').classList.toggle('hidden', !ultimo);
      crits.forEach(function (c) { pintar(c.id); });
    }
    vista.querySelectorAll('[data-cat]').forEach(function (b) { b.onclick = function () { cat = b.dataset.cat; pintarCategoria(); }; });
    var sig = document.getElementById('cat-siguiente');
    if (sig) sig.onclick = function () {
      cat = cats[cats.indexOf(cat) + 1]; pintarCategoria();
      document.getElementById('categorias').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    pintarCategoria();
    vista.querySelectorAll('input[type=range]').forEach(function (r) { r.oninput = function () { marcar(r.id.slice(2), +r.value); }; });
    vista.querySelectorAll('.no-se').forEach(function (b) { b.onclick = function () { marcar(b.dataset.c, null); }; });
    vista.querySelectorAll('[data-r]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.r, v = b.dataset.v;
        if (k === 'edad') {
          /* La edad admite varios tramos a la vez: se guardan juntos, separados por comas, en el orden de la lista. */
          var lista = (voto.rapidas.edad || '').split(',').filter(Boolean), i = lista.indexOf(v);
          if (i >= 0) lista.splice(i, 1); else lista.push(v);
          lista = S.EDADES.map(function (e) { return e.id; }).filter(function (id) { return lista.indexOf(id) >= 0; });
          if (lista.length) voto.rapidas.edad = lista.join(','); else delete voto.rapidas.edad;
        } else if (voto.rapidas[k] === v) delete voto.rapidas[k]; else voto.rapidas[k] = v;
        vista.querySelectorAll('[data-r="' + k + '"]').forEach(function (o) { var a = marcada(k, o.dataset.v); o.className = a ? TAG_ON : TAG_OFF; o.setAttribute('aria-pressed', a); });
      };
    });
    document.getElementById('review-opinion').oninput = function (e) { document.getElementById('char-count').textContent = e.target.value.length + '/300'; };
    document.getElementById('submit-vote-btn').onclick = async function () {
      var b = this, antes = b.innerHTML; b.disabled = true;
      b.innerHTML = ic('sync', 'text-[24px] animate-spin') + '<span>Publicando…</span>';
      var r = await sb.rpc('salimos_votar', { p_local: id, p_crit: voto.crit, p_rapidas: voto.rapidas, p_comentario: document.getElementById('review-opinion').value.trim() });
      if (!r.error && cats.length > 1) {
        /* Lo que acabe igual que la nota general no se guarda. */
        var pc = {};
        cats.slice(1).forEach(function (t) {
          var d = {}; crits.forEach(function (c) { var o = voto.pc[t] && voto.pc[t][c.id]; if (o != null && o !== voto.crit[c.id]) d[c.id] = o; });
          if (Object.keys(d).length) pc[t] = d;
        });
        r = await sb.rpc('salimos_votar_categorias', { p_local: id, p_por_categoria: pc });
      }
      if (r.error) { b.disabled = false; b.innerHTML = antes; document.getElementById('falta').textContent = textoError(r.error); return; }
      document.getElementById('modal-final-score').textContent = media(true);
      await Promise.all([cargarLocales(), cargarYo()]);
      /* Al body: dentro de la pantalla, con su animación, no se centraría en lo que se ve. */
      var hecho = document.getElementById('vote-modal-success');
      document.body.appendChild(hecho); hecho.classList.remove('hidden');
      hecho.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { hecho.remove(); }); });
    };
  };

  /* Formularios con las piezas del de «Recomendar» de Stitch. */
  var INPUT = 'w-full h-16 px-space-lg rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm placeholder:text-outline-variant focus:outline-none focus:bg-surface-container-low transition-all';
  var BOTON = 'boton-off w-full h-16 rounded-full bg-primary-container text-on-primary-container font-headline-md text-headline-md flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform';
  function etiquetaCampo(icono, txt, para, extra) {
    return '<label class="font-body-lg text-body-lg font-bold text-on-surface flex items-center justify-between"' + (para ? ' for="' + para + '"' : '') + '><span class="flex items-center gap-1.5">' + ic(icono, 'text-[24px] text-primary') + txt + '</span>' +
      (extra ? '<span class="font-label-micro text-label-micro text-on-surface-variant">' + extra + '</span>' : '') + '</label>';
  }
  function casilla(id, html) {
    return '<div class="p-space-md rounded-DEFAULT bg-secondary-fixed/50 flex items-start gap-3 shadow-sm"><input class="mt-0.5 w-7 h-7 rounded-md accent-secondary text-secondary cursor-pointer flex-shrink-0" id="' + id + '" type="checkbox">' +
      '<label class="font-body-lg text-body-lg text-on-secondary-fixed cursor-pointer" for="' + id + '">' + html + '</label></div>';
  }
  P.entrar = function () {
    /* Con sesión (por ejemplo, de Trivial) pero sin perfil de Salimos: solo falta confirmar la edad. */
    var soloEdad = !!YO.sesion && !YO.perfil;
    if (YO.sesion && YO.perfil) { location.hash = leer('vuelta', '#/tu'); borrar('vuelta'); return; }
    seccion('Entrar');
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter pt-space-md pb-8 gap-space-lg animate-screen-enter">' +
      cabeceraSeccion(soloEdad ? 'Un paso más' : 'Entrar') +
      '<form class="flex flex-col gap-space-lg" id="f1" novalidate>' +
      (soloEdad ? '' : '<div class="flex flex-col gap-1.5">' + etiquetaCampo('mail', 'Tu correo', 'correo') + '<input class="' + INPUT + '" type="email" id="correo" autocomplete="email" inputmode="email" required></div>') +
      casilla('mayor', 'Tengo 18 años o más') +
      casilla('acepto', 'He leído la <a class="font-bold underline" href="privacidad.html" target="_blank">privacidad</a>') +
      '<div class="flex flex-col gap-2"><button class="' + BOTON + '" type="submit">' + ic(soloEdad ? 'how_to_reg' : 'send', 'text-[22px]') + (soloEdad ? 'Confirmar' : 'Recibir código') + '</button>' +
      '<p class="font-body-lg text-body-lg font-bold text-center text-error" id="err1" role="alert"></p></div></form>' +
      '<form class="flex flex-col gap-space-lg" id="f2" hidden novalidate><div class="flex flex-col gap-1.5">' + etiquetaCampo('pin', 'Código', 'cod') +
      '<span class="font-body-md text-body-md text-on-surface" id="aquien"></span>' +
      '<input class="' + INPUT + ' text-center font-score-display text-score-display tracking-[0.4em]" type="text" id="cod" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="········"></div>' +
      '<div class="flex flex-col gap-2"><button class="' + BOTON + '" type="submit">' + ic('login', 'text-[22px]') + 'Entrar</button>' +
      '<p class="font-body-md text-body-md text-center text-on-surface">¿No llega? Mira en «No deseado».</p>' +
      '<p class="font-body-lg text-body-lg font-bold text-center text-error" id="err2" role="alert"></p></div></form></div>';

    async function terminar() {
      var r = await sb.rpc('salimos_alta_perfil', { p_mayor_edad: true });
      if (r.error) throw r.error;
      await Promise.all([cargarYo(), cargarLocales()]);
      var vuelta = leer('vuelta', '#/tu'); borrar('vuelta'); tostada('Ya estás dentro.'); location.hash = vuelta;
    }
    var correo, quitarAviso = function () {};
    document.getElementById('f1').onsubmit = async function (e) {
      e.preventDefault();
      var err = document.getElementById('err1'), f1 = this, bt = f1.querySelector('button');
      err.textContent = '';
      if (!soloEdad) {
        correo = document.getElementById('correo').value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { err.textContent = 'Revisa el correo.'; return; }
      }
      if (!document.getElementById('mayor').checked) { err.textContent = 'Hay que tener 18 años o más.'; return; }
      if (!document.getElementById('acepto').checked) { err.textContent = 'Marca la casilla de privacidad.'; return; }
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
        quitarAviso = avisoCodigo();
        var r = await sb.auth.signInWithOtp({ email: correo, options: { shouldCreateUser: true, emailRedirectTo: VUELTA } });
        if (r.error) throw r.error;
        f1.hidden = true; document.getElementById('f2').hidden = false;
        document.getElementById('aquien').textContent = 'Enviado a ' + correo;
        document.getElementById('cod').focus();
      } catch (x) { quitarAviso(); err.textContent = /rate|seconds/i.test(textoError(x)) ? 'Espera un minuto y pide otro.' : textoError(x); }
      bt.disabled = false;
    };
    document.getElementById('f2').onsubmit = async function (e) {
      e.preventDefault();
      var err = document.getElementById('err2'), bt = this.querySelector('button'), cod = document.getElementById('cod').value.trim();
      if (!/^\d{6,10}$/.test(cod)) { err.textContent = 'Escribe solo las cifras.'; return; }
      bt.disabled = true; err.textContent = '';
      var r = await sb.auth.verifyOtp({ email: correo, token: cod, type: 'email' });
      if (r.error) { bt.disabled = false; err.textContent = 'Ese código no es.'; return; }
      try { await terminar(); } catch (x) { bt.disabled = false; err.textContent = textoError(x); }
    };
  };

  /* El correo con el código tarda 30–40 segundos: lo avisamos 15 segundos en grande para que nadie piense que no funciona. */
  function avisoCodigo() {
    var caja = document.createElement('div');
    caja.className = 'fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-md flex items-center justify-center p-gutter';
    caja.setAttribute('role', 'alertdialog'); caja.setAttribute('aria-live', 'assertive');
    caja.innerHTML = '<div class="w-full max-w-sm rounded-lg bg-surface-container-lowest p-space-lg shadow-xl flex flex-col items-center text-center gap-space-md animate-screen-enter">' +
      '<div class="w-20 h-20 rounded-full bg-primary-container/30 text-primary flex items-center justify-center">' + ic('hourglass_top', 'text-[44px] animate-pulse', true) + '</div>' +
      '<p class="font-headline-md text-headline-md text-on-surface">El código suele tardar entre 30 y 40 segundos</p>' +
      '<p class="font-body-lg text-body-lg text-on-surface">Enseguida podrás acceder.</p>' +
      '<button type="button" class="w-full h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold active:scale-95 transition-all" data-cerrar>Vale</button></div>';
    var quitar = function () { clearTimeout(t); caja.remove(); };
    var t = setTimeout(quitar, 15000);
    caja.onclick = function (e) { if (e.target === caja || e.target.closest('[data-cerrar]')) quitar(); };
    document.body.appendChild(caja);
    return quitar;
  }

  P.recomendar = function () {
    seccion('Añadir');
    var puede = !!usuario() && YO.perfil;
    if (!puede) {
      guardar('vuelta', '#/recomendar');
      vista.innerHTML = '<div class="flex flex-col w-full px-gutter pt-space-md pb-8 gap-space-lg animate-screen-enter">' + cabeceraSeccion('Añadir un sitio') +
        '<div class="flex flex-col items-center text-center gap-space-md p-space-lg rounded-lg bg-surface-container-lowest shadow-md">' +
        '<div class="w-20 h-20 rounded-full bg-primary-container/30 text-primary flex items-center justify-center">' + ic('add_location_alt', 'text-[44px]', true) + '</div>' +
        '<p class="font-headline-md text-headline-md text-on-surface">Para añadir un sitio, entra con tu correo</p>' +
        '<p class="font-body-lg text-body-lg text-on-surface-variant">Te mandamos un código. Sin contraseña.</p>' +
        '<a class="w-full ' + BOTON + '" href="#/entrar">' + ic('mail', 'text-[26px]') + 'Entrar con mi correo</a></div></div>';
      return;
    }
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter pt-space-md pb-8 gap-space-lg animate-screen-enter">' +
      cabeceraSeccion('Añadir un sitio') +
      (puede ? '' : '<a class="min-h-16 p-space-md rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center gap-3 shadow-sm font-body-lg text-body-lg font-bold" href="#/entrar">' + ic('login', 'text-[26px]') + 'Entrar con tu correo</a>') +
      '<form class="flex flex-col gap-space-lg" id="fr" novalidate>' +
      '<div class="flex flex-col gap-2">' + etiquetaCampo('storefront', 'Nombre', 'rn') +
      '<input class="' + INPUT + '" type="text" id="rn" maxlength="80"></div>' +
      '<div class="flex flex-col gap-2">' + etiquetaCampo('category', 'Qué es') + '<div class="grid grid-cols-2 gap-2">' +
      S.TIPOS.map(function (t) { return '<button type="button" class="category-chip min-h-16 px-3 py-2 rounded-lg font-body-lg text-body-lg font-bold bg-surface-container-high text-on-surface transition-all active:scale-95 flex items-center gap-2 text-left shadow-sm" data-t="' + t.id + '" aria-pressed="false">' + ic(t.icono, 'text-[26px] flex-shrink-0') + '<span class="min-w-0">' + t.nombre + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="flex flex-col gap-2">' + etiquetaCampo('pin_drop', 'Municipio', 'rm') + '<div class="relative"><select class="' + INPUT + ' appearance-none" id="rm"><option value="">Elegir</option>' +
      S.MUNICIPIOS.map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + '</select>' + ic('expand_more', 'absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[28px]') + '</div></div>' +
      '<div class="flex flex-col gap-2">' + etiquetaCampo('link', 'Dirección (si la sabes)', 'rd') + '<input class="' + INPUT + '" type="text" id="rd" maxlength="200"></div>' +
      casilla('rno', 'No trabajo aquí ni gano nada por recomendarlo.') +
      '<div class="flex flex-col gap-2 pt-2"><button class="' + BOTON + '" type="submit"' + (puede ? '' : ' disabled') + '>' + ic('send', 'text-[26px]') + 'Enviar</button>' +
      '<p class="font-body-lg text-body-lg font-bold text-center text-error" id="er" role="alert"></p></div></form></div>';
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
      if (nombre.length < 2) { er.textContent = 'Falta el nombre.'; return; }
      if (!tipoSel) { er.textContent = 'Falta qué es.'; return; }
      if (!mun) { er.textContent = 'Falta el municipio.'; return; }
      if (!document.getElementById('rno').checked) { er.textContent = 'Marca la casilla.'; return; }
      var bt = this.querySelector('button[type=submit]'); bt.disabled = true;
      var r = await sb.rpc('salimos_recomendar', { p_nombre: nombre, p_tipo: tipoSel, p_municipio: mun, p_direccion: document.getElementById('rd').value.trim() });
      if (r.error) { bt.disabled = false; er.textContent = textoError(r.error); return; }
      vista.innerHTML = '<div class="px-gutter pt-space-lg pb-8 animate-screen-enter"><div class="rounded-lg bg-surface-container-lowest p-space-lg shadow-xl flex flex-col items-center text-center">' +
        '<div class="w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-space-sm shadow-sm">' + ic('how_to_reg', 'text-[36px]', true) + '</div>' +
        '<h3 class="font-headline-md text-headline-md text-on-surface">Gracias</h3><p class="font-body-lg text-body-lg text-on-surface mt-1">Lo revisamos y te avisamos por correo.</p>' +
        '<a class="mt-space-lg w-full h-14 rounded-full bg-secondary text-on-secondary font-body-lg text-body-lg font-bold flex items-center justify-center active:scale-95 transition-all" href="#/explorar">Seguir</a>' +
        '<div class="mt-space-sm w-full">' + botonAppsGrupo() + '</div></div></div>';
    };
  };

  P.tu = function () {
    seccion('Tú');
    var u = usuario();
    var envolver = function (html) { vista.innerHTML = '<div class="flex flex-col w-full px-gutter pt-space-md pb-8 gap-space-lg animate-screen-enter">' + html + '</div>'; };
    var g = guardados().map(local).filter(Boolean);
    var bloque = function (icono, titulo, filas) {
      return '<section class="flex flex-col gap-space-xs"><h2 class="font-headline-md text-headline-md text-on-surface flex items-center gap-2 px-1">' + ic(icono, 'text-[28px] text-primary', true) + titulo + '</h2>' + filas + '</section>';
    };
    var vacio = function (txt) { return '<p class="p-space-md rounded-lg bg-surface-container-low font-body-lg text-body-lg text-on-surface">' + txt + '</p>'; };
    var bloqueGuardados = bloque('bookmark', 'Guardados', g.length ? g.map(filaSitio).join('') : vacio('Ninguno.'));
    if (!u) {
      envolver(cabeceraSeccion('Tú') + '<a class="' + BOTON + '" href="#/entrar">' + ic('login', 'text-[26px]') + 'Entrar</a>' + bloqueGuardados);
      return;
    }
    if (!YO.perfil) { location.hash = '#/entrar'; return; }
    var ids = Object.keys(votosDe()).filter(local);
    envolver(cabeceraSeccion('Tú') + '<p class="font-body-lg text-body-lg text-on-surface px-1 break-words -mt-space-sm">' + esc(u.correo) + '</p>' +
      bloque('how_to_vote', 'Tus votos', ids.length ? ids.map(function (id) { return filaSitio(local(id)).replace('#/local/', '#/votar/'); }).join('') : vacio('Ninguno.')) +
      bloqueGuardados +
      (leer('bloqueados', []).length ? '<button type="button" class="min-h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 px-4 active:scale-95 transition-all" id="desbloquear">Ver a las personas bloqueadas (' + leer('bloqueados', []).length + ')</button>' : '') +
      '<button type="button" class="min-h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 px-4 active:scale-95 transition-all" id="salir">' + ic('logout', 'text-[24px]') + 'Salir</button>' +
      '<button type="button" class="min-h-14 rounded-full text-error font-body-lg text-body-lg font-bold underline" id="borrarCuenta">Borrar mi cuenta y mis votos</button>');
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
      ['checklist_rtl', 'bg-primary-fixed text-on-primary-fixed', 'Cómo sale la nota', 'Cada sitio se vota por partes: limpieza, ambiente, servicio, consumiciones, precio, ubicación, parking y guagua, y además lo propio de cada tipo de sitio (la carta, los vinos, la música o las vistas). La nota general es la media de esas partes. La lista de Salir va de la mejor nota a la peor, y también se puede ordenar por cada parte.'],
      ['verified', 'bg-tertiary-container text-on-tertiary-container', 'Voto verificado: «Estuvo allí»', 'Si estás en el local, pulsa «Estoy aquí» en su ficha: comprobamos que estás a menos de 150 m y tu voto sale con el sello «Estuvo allí». Tienes 24 horas para votar, así en una discoteca haces check-in en la puerta y votas al día siguiente. Hasta el 30 de noviembre de 2026 cuentan todos los votos; desde el 1 de diciembre, en la nota y en los rankings solo cuentan los verificados.'],
      ['photo_camera', 'bg-primary-fixed text-on-primary-fixed', 'Fotos', 'Las fotos son de quien ha estado allí (con check-in, hechas con su móvil en el momento) o las cede el propio local. Nunca copiamos fotos de otras webs. Sin personas que se reconozcan: cualquiera puede denunciar una foto y con tres denuncias se retira.'],
      ['money_off', 'bg-error-container text-on-error-container', 'Quién paga', 'Nadie. Ningún local, marca ni anunciante puede pagar por salir, subir o quitar una nota. Salimos es del Grupo Saneas y es gratis.'],
      ['fingerprint', 'bg-secondary-fixed text-on-secondary-fixed', 'Votos falsos', 'Una cuenta solo puede votar una vez cada sitio, y hay un tope de sitios nuevos al día. Vigilamos los votos raros —muchas cuentas nuevas votando el mismo sitio de golpe— y los que sean de mentira no cuentan.'],
      ['forum', 'bg-surface-container-highest text-on-surface', 'Comentarios', 'Se publican al momento. Quitamos los que insultan, señalan a trabajadores con nombre o no tienen que ver con el sitio. Cualquiera puede denunciar un comentario y lo revisamos en menos de 24 horas; con tres denuncias se retira solo hasta que lo miremos. Y si alguien te molesta, puedes bloquearlo y no volverás a ver lo que escribe.']
    ];
    vista.innerHTML = '<div class="flex flex-col w-full px-gutter-mobile pt-space-md pb-8 gap-space-md animate-screen-enter">' + cabeceraSeccion('Cómo funciona') +
      p.map(function (x) {
        return '<div class="p-space-lg rounded-2xl bg-surface-container-low shadow-sm flex flex-col gap-space-xs"><div class="w-10 h-10 rounded-xl ' + x[1] + ' flex items-center justify-center">' + ic(x[0], 'text-body-lg font-bold') + '</div>' +
          '<h3 class="font-label-prominent text-headline-md text-on-surface mt-1">' + x[2] + '</h3><p class="font-body-md text-body-md text-on-surface-variant">' + x[3] + '</p></div>';
      }).join('') + '</div>';
  };

  P.privacidad = function () { location.replace('privacidad.html'); };

  P.noExiste = function () {
    seccion('Salimos');
    vista.innerHTML = '<div class="px-gutter pt-space-lg"><div class="rounded-lg bg-surface-container-lowest p-space-lg shadow-md text-center font-body-lg text-body-lg text-on-surface">Este sitio ya no está.<br><a class="mt-space-md min-h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 px-4 active:scale-95 transition-all" href="#/explorar">Volver</a></div></div>';
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
      }).join('') + '</div></div>';
    function cerrar() { caja.remove(); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    caja.onclick = function (e) {
      if (e.target === caja || e.target.closest('[data-cerrar]')) return cerrar();
      var b = e.target.closest('[data-destino]');
      if (b) { elegirDestino(b.dataset.destino); guardar('destino', DESTINO); cerrar(); ir(); return; }
    };
    document.addEventListener('keydown', tecla);
    document.body.appendChild(caja);
    caja.querySelector('[data-cerrar]').focus();
  }

  /* ───────── cerca de mí ─────────
     La posición se pide al pulsar, se usa en este móvil para ordenar por distancia y no se envía ni se guarda. */
  var POS = null;
  /* Ubicación: se pide al abrir la app y cada vez que se vuelve a ella, para enseñar lo que hay cerca.
     Si se negó, se vuelve a preguntar la próxima vez; si el móvil ya no deja preguntar, se explica dónde activarla. */
  var UBIC = { pedida: false, negada: false, intentos: 0 };
  function dondeActivar() {
    var plat = window.Capacitor && Capacitor.getPlatform ? Capacitor.getPlatform() : 'web';
    return plat === 'ios' ? 'Ajustes › Salimos › Ubicación › «Mientras se usa la app»'
      : plat === 'android' ? 'Ajustes › Aplicaciones › Salimos › Permisos › Ubicación'
      : 'los ajustes del navegador, en el candado junto a la dirección';
  }
  function repintarCerca() { if (document.getElementById('lista')) pintarLista(); }
  /* «Cerca de mí» en el filtro Dónde: pide la ubicación si aún no la hay y ordena por distancia. */
  function buscarCerca(repinta) {
    if (POS) { repinta(); return; }
    tostada('Buscando dónde estás…');
    pedirPosicion().then(function (p) { POS = p; UBIC.negada = false; colocarDestino(); repinta(); },
      function (e) {
        filtro.zona = ''; UBIC.negada = !!e && e.code === 1; repinta();
        tostada(e && e.code === 1 ? 'Sin permiso de ubicación. Actívalo en ' + dondeActivar() + '.' : 'No te encontramos. Enciende la ubicación.');
      });
  }
  /* Si estás en otro destino con sitios, te lo cambiamos. Devuelve true si ha cambiado. */
  function colocarDestino() {
    var masCerca = TODOS.filter(function (l) { return l.lat != null; }).sort(function (a, b) { return kmEntre(POS.lat, POS.lng, a.lat, a.lng) - kmEntre(POS.lat, POS.lng, b.lat, b.lng); })[0];
    if (masCerca && masCerca.destino !== DESTINO && kmEntre(POS.lat, POS.lng, masCerca.lat, masCerca.lng) < 60) { elegirDestino(masCerca.destino); guardar('destino', DESTINO); return true; }
    return false;
  }
  function ubicar(forzar) {
    if (POS || (UBIC.pedida && !forzar)) return Promise.resolve();
    UBIC.pedida = true;
    return pedirPosicion().then(function (p) {
      POS = p; UBIC.negada = false;
      if (colocarDestino() && document.getElementById('lista')) ir();
      else repintarCerca();
    }, function (e) { UBIC.negada = !!e && e.code === 1; repintarCerca(); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !POS) { UBIC.pedida = false; if (document.getElementById('lista')) ubicar(); }
  });
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
  P.cerca = function () { filtro.zona = 'cerca'; location.replace('#/explorar'); if (!POS) buscarCerca(function () { if (document.getElementById('lista')) P.explorar(); }); };

  /* ───────── check-in: «Estoy aquí» ─────────
     Estando en el local (a 150 m o menos) abre el voto verificado 24 horas. El servidor mide la distancia
     con la posición y no la guarda. Hasta el 30/11 cuenta cualquier voto; desde el 1/12, solo los verificados. */
  function checkinVivo(id) { var h = YO.checkins[id]; return !!h && new Date(h) > new Date(); }
  function hora(iso) { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
  function tarjetaCheckin(l) {
    var mio = votosDe()[l.id] || {}, vivo = checkinVivo(l.id);
    if (mio.fijo || mio.verificado) return '';
    var cuerpo = vivo
      ? '<p class="font-body-lg text-body-lg text-on-surface">Check-in hecho. Vota antes de las ' + hora(YO.checkins[l.id]) + ' de mañana.</p>' +
        '<a class="' + BOTON + '" href="#/votar/' + l.id + '">' + ic('how_to_vote', 'text-[24px]') + ' Votar</a>'
      : '<button type="button" class="min-h-14 rounded-full bg-surface-container-high text-on-surface font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 px-4 active:scale-95 transition-all" id="checkin">' + ic('where_to_vote', 'text-[24px] text-secondary') + ' Estoy aquí ahora</button>' +
        '<p class="font-body-md text-body-md text-on-surface-variant text-center">Si estás en el sitio, tu voto sale como «Estuvo allí». No guardamos tu ubicación.</p>';
    return '<div class="px-gutter pb-space-lg"><div class="flex flex-col gap-space-sm">' + cuerpo + '</div></div>';
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
    if (previo.fijo) return '';
    if (checkinVivo(l.id) || previo.verificado)
      return '<div class="flex items-center gap-2 p-space-sm rounded-DEFAULT bg-tertiary-container/30 text-on-surface font-body-md text-body-md font-bold">' + ic('verified', 'text-[24px] text-tertiary', true) + '<span>Voto verificado</span></div>';
    return '<a href="#/local/' + l.id + '" class="flex items-center gap-2 p-space-sm rounded-DEFAULT bg-surface-container-high text-on-surface font-body-md text-body-md">' + ic('where_to_vote', 'text-[24px] text-secondary') +
      '<span>' + (YO.cuentanTodos === false ? 'Sin check-in, tu voto no cuenta.' : 'Desde el 1 de diciembre, sin check-in tu voto no cuenta.') + ' <strong class="text-primary">Hacer check-in</strong></span></a>';
  }

  /* ───────── fotos ─────────
     Las suben quienes han hecho check-in (con la cámara, estando allí) y Óscar las de los locales, con su permiso.
     El móvil la reduce a 1600 px y la vuelve a codificar en JPEG: así no viajan los datos GPS de la foto. */
  /* Mientras un sitio no tiene foto propia, la cabecera de la ficha enseña una de Google Maps por su servicio oficial.
     Normas de Google: no se guarda (se pide cada vez; aquí solo vive mientras dura la visita), va con su autor,
     enlaza a su origen en Google Maps y lleva la marca «Google Maps». */
  var GOOGLE = {};
  async function fotoGoogle(l) {
    if (l.foto) return;
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
  function urlVideo(u) {
    var t = /tiktok\.com\/.*video\/(\d+)/.exec(u);
    return t ? 'https://www.tiktok.com/player/v1/' + t[1] : u.replace(/\/?$/, '/') + 'embed/';
  }
  function puedeSubirFoto(l) { return !!usuario() && YO.perfil && (YO.admin || checkinVivo(l.id)); }
  async function pintarFotos(l) {
    var caja = document.getElementById('fotos'); if (!caja) return;
    var r = await sb.rpc('salimos_fotos', { p_local: l.id });
    var fotos = r.error ? [] : r.data;
    var sube = puedeSubirFoto(l);
    if (!fotos.length && !sube) { caja.innerHTML = ''; return; }
    caja.innerHTML = '<div class="flex items-center justify-between mb-space-xs"><h3 class="font-headline-md text-headline-md text-on-surface">Fotos</h3>' +
      '<span class="font-label-micro text-label-micro text-secondary font-semibold">' + (fotos.length ? (fotos.length === 1 ? '1 foto' : fotos.length + ' fotos') : 'Todavía ninguna') + '</span></div>' +
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
    var tab = { explorar: 'explorar', cerca: 'explorar', local: 'explorar', zonas: 'explorar', top: 'explorar', votar: 'votar', recomendar: 'recomendar' }[nombre];
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
