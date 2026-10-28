/* Salimos · la app.
   Rutas por almohadilla: #/explorar, #/zonas, #/local/ID, #/votar/ID, #/entrar, #/recomendar, #/tu…
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

  var LOCALES = [];                                  // de salimos_locales()
  var YO = { sesion: null, perfil: false, admin: false, votos: {} };

  async function cargarLocales() {
    var r = await sb.rpc('salimos_locales');
    if (r.error) throw r.error;
    LOCALES = r.data.map(function (l) { l.zona = S.zonaDe(l.municipio); return l; });
  }
  async function cargarYo() {
    var s = await sb.auth.getSession();
    YO.sesion = s.data.session;
    if (!YO.sesion) { YO.perfil = false; YO.admin = false; YO.votos = {}; return; }
    var r = await sb.rpc('salimos_mi_estado');
    if (r.error) throw r.error;
    YO.perfil = r.data.perfil; YO.admin = r.data.admin; YO.votos = r.data.votos || {};
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
  function local(id) { return LOCALES.filter(function (l) { return l.id === id; })[0]; }
  function zona(id) { return S.ZONAS.filter(function (z) { return z.id === id; })[0]; }
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
    S.criteriosDe(l.tipo).forEach(function (c) {
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

  function claseNota(nota, votos) {
    if (nota == null || votos < S.MIN_VOTOS_RANKING) return 'nueva';
    return nota >= 8 ? 'alta' : nota >= 6 ? 'media' : 'baja';
  }
  function colorBarra(v) { return v >= 8 ? '#059669' : v >= 6 ? '#F59E0B' : '#DC2626'; }

  function notaHTML(c) {
    var cl = claseNota(c.nota, c.votos);
    if (cl === 'nueva') return '<span class="nota nueva" aria-label="Todavía con pocos votos"><b>' + (c.nota == null ? '–' : num(c.nota)) + '</b><small>pocos votos</small></span>';
    return '<span class="nota ' + cl + '" aria-label="Nota ' + num(c.nota) + ' sobre 10"><b>' + num(c.nota) + '</b><small>de 10</small></span>';
  }

  function tarjetaLocal(l, puesto) {
    var t = tipo(l.tipo), c = cifras(l);
    return '<a class="local" href="#/local/' + l.id + '">' +
      (puesto ? '<span class="puesto' + (puesto === 1 ? ' p1' : '') + '">' + puesto + '</span>'
              : '<span class="local-icono" style="background:' + t.color + '" aria-hidden="true">' + t.emoji + '</span>') +
      '<span><h3>' + esc(l.nombre) + '</h3>' +
      '<div class="donde">' + esc(t.nombre) + ' · ' + esc(l.barrio ? l.barrio + ', ' : '') + esc(l.municipio) + '</div>' +
      (mayoria(c) ? '<div class="edad">👥 Mayoría de ' + mayoria(c).nombre.replace('De ', '') + ' años</div>' : '') +
      '<div class="votos">' + c.votos + (c.votos === 1 ? ' voto' : ' votos') + (c.mio ? ' · incluye el tuyo' : '') + '</div></span>' +
      notaHTML(c) + '</a>';
  }

  function ordenarPorNota(lista, criterio) {
    return lista
      .map(function (l) { var c = cifras(l); return { l: l, v: criterio ? (c.crit[criterio] && c.crit[criterio].media) : c.nota, votos: criterio ? (c.crit[criterio] ? c.crit[criterio].n : 0) : c.votos }; })
      .filter(function (x) { return x.v != null && x.votos >= S.MIN_VOTOS_RANKING; })
      .sort(function (a, b) { return b.v - a.v; })
      .map(function (x) { return x.l; });
  }

  /* ───────── pantallas ───────── */
  var P = {};

  P.bienvenida = function () {
    vista.innerHTML =
      '<section class="bienvenida">' +
      '<h1>¿Salimos<span>?</span></h1>' +
      '<p class="entrada">Dónde comer, tomar algo, bailar o ligar en Gran Canaria, según la gente que sale.</p>' +
      '<div class="promesas">' +
      promesa('🚫', 'Aquí nadie paga', 'Ni locales, ni marcas, ni anuncios. Ningún sitio puede comprar su puesto.') +
      promesa('🙋', 'Una persona, un voto por local', 'Entras con tu correo. Puedes cambiar tu voto cuando quieras, pero no votar dos veces.') +
      promesa('📊', 'Notas por partes', 'Limpieza, ambiente, servicio, consumiciones, precio, parking, guagua… Cada uno mira lo que le importa.') +
      promesa('🏝️', 'Solo Gran Canaria', 'De momento, solo nuestra isla.') +
      '</div>' +
      '<button class="boton boton-ambar boton-ancho" id="empezar">Vamos</button>' +
      '</section>';
    document.getElementById('empezar').onclick = function () { guardar('visto', 1); location.hash = '#/explorar'; };
  };
  function promesa(ico, t, p) { return '<div class="promesa tarjeta"><span class="ico" aria-hidden="true">' + ico + '</span><div><h3>' + t + '</h3><p>' + p + '</p></div></div>'; }

  var filtro = { tipo: '', zona: '', texto: '', criterio: 'limpieza', edades: [] };

  P.explorar = function () {
    var criteriosRanking = S.BASE.concat(S.EXTRAS);
    vista.innerHTML =
      '<label class="buscador"><span class="oculto">Buscar un local</span>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="search" id="busca" placeholder="Busca un bar, restaurante o zona" value="' + esc(filtro.texto) + '" autocomplete="off"></label>' +
      '<div class="bloque" style="margin-top:16px"><div class="chips" role="group" aria-label="Tipo de sitio">' +
      chip('tipo', '', 'Todo') + S.TIPOS.map(function (t) { return chip('tipo', t.id, t.emoji + ' ' + t.plural); }).join('') + '</div>' +
      '<div class="chips" role="group" aria-label="Zona" style="margin-top:6px">' +
      chip('zona', '', '📍 Toda la isla') + S.ZONAS.map(function (z) { return chip('zona', z.id, z.nombre); }).join('') + '</div>' +
      '<p class="rot-filtro" id="edad-l">👥 Con gente de… <span>puedes marcar varios</span></p>' +
      '<div class="chips" role="group" aria-labelledby="edad-l">' +
      S.EDADES.map(function (e) { return '<button type="button" class="chip" data-edad="' + e.id + '" aria-pressed="' + (filtro.edades.indexOf(e.id) >= 0) + '">' + e.nombre + ' años</button>'; }).join('') + '</div></div>' +
      '<section class="bloque"><h2>Los mejor votados</h2><p class="sub">Solo entran los que tienen ' + S.MIN_VOTOS_RANKING + ' votos o más.</p><div class="lista" id="resultados"></div></section>' +
      '<section class="bloque"><h2>Lo mejor en…</h2><p class="sub">Elige lo que más te importa hoy.</p>' +
      '<div class="chips" role="group" aria-label="Criterio">' + criteriosRanking.map(function (c) { return chip('criterio', c.id, c.emoji + ' ' + c.nombre); }).join('') + '</div>' +
      '<div class="podio" id="podio" style="margin-top:10px"></div></section>' +
      '<section class="bloque"><h2>Recién llegados</h2><p class="sub">Todavía con pocos votos. Si has ido, vota.</p><div class="lista" id="nuevos"></div></section>';

    vista.querySelectorAll('.chip[data-f]').forEach(function (b) {
      b.onclick = function () {
        filtro[b.dataset.f] = b.dataset.v;
        vista.querySelectorAll('.chip[data-f="' + b.dataset.f + '"]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        pintarResultados();
      };
    });
    vista.querySelectorAll('.chip[data-edad]').forEach(function (b) {
      b.onclick = function () {
        var i = filtro.edades.indexOf(b.dataset.edad);
        if (i >= 0) filtro.edades.splice(i, 1); else filtro.edades.push(b.dataset.edad);
        b.setAttribute('aria-pressed', i < 0 ? 'true' : 'false');
        pintarResultados();
      };
    });
    document.getElementById('busca').oninput = function (e) { filtro.texto = e.target.value; pintarResultados(); };
    pintarResultados();
  };
  function chip(f, v, txt) { return '<button type="button" class="chip" data-f="' + f + '" data-v="' + v + '" aria-pressed="' + (filtro[f] === v) + '">' + txt + '</button>'; }

  function sinTildes(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function filtrados() {
    var q = sinTildes(filtro.texto.trim());
    return LOCALES.filter(function (l) {
      if (filtro.tipo && l.tipo !== filtro.tipo) return false;
      if (filtro.zona && l.zona !== filtro.zona) return false;
      if (filtro.edades.length && !encajaEdad(mayoria(cifras(l)), filtro.edades)) return false;
      if (q && sinTildes(l.nombre + ' ' + l.municipio + ' ' + (l.barrio || '') + ' ' + tipo(l.tipo).nombre).indexOf(q) < 0) return false;
      return true;
    });
  }
  function pintarResultados() {
    var base = filtrados(), top = ordenarPorNota(base);
    if (!LOCALES.length) {
      document.getElementById('resultados').innerHTML = '<p class="vacio">Estamos dando de alta los primeros sitios.<br><a href="#/recomendar">¿Conoces uno? Recomiéndalo</a></p>';
      document.getElementById('podio').parentNode.style.display = 'none';
      document.getElementById('nuevos').parentNode.style.display = 'none';
      return;
    }
    document.getElementById('resultados').innerHTML = top.length ? top.map(function (l) { return tarjetaLocal(l); }).join('')
      : '<p class="vacio">No hay ningún sitio con estos filtros todavía.<br><a href="#/recomendar">¿Conoces uno? Recomiéndalo</a></p>';
    var aplica = base.filter(function (l) { return S.criteriosDe(l.tipo).some(function (c) { return c.id === filtro.criterio; }); });
    var pod = ordenarPorNota(aplica, filtro.criterio).slice(0, 3);
    document.getElementById('podio').innerHTML = pod.length ? pod.map(function (l, i) { return tarjetaLocal(l, i + 1); }).join('')
      : '<p class="vacio">Aún no hay votos suficientes en esto.</p>';
    var nuevos = base.filter(function (l) { return cifras(l).votos < S.MIN_VOTOS_RANKING; });
    var bloqueNuevos = document.getElementById('nuevos');
    bloqueNuevos.parentNode.style.display = nuevos.length ? '' : 'none';
    bloqueNuevos.innerHTML = nuevos.map(function (l) { return tarjetaLocal(l); }).join('');
  }

  P.zonas = function () {
    vista.innerHTML = '<h1 style="font-size:28px;font-weight:800">Por zonas</h1><p class="sub" style="color:var(--tinta-2);margin:6px 0 0">El número 1 de cada zona, en cada tipo de sitio.</p>' +
      S.ZONAS.map(function (z) {
        var enZona = LOCALES.filter(function (l) { return l.zona === z.id; });
        var filas = S.TIPOS.map(function (t) { var top = ordenarPorNota(enZona.filter(function (l) { return l.tipo === t.id; }))[0]; return top ? tarjetaLocal(top, 1) : ''; }).join('');
        return '<section class="bloque"><h2>' + esc(z.nombre) + '</h2><p class="sub">' + esc(z.municipios.join(' · ')) + '</p>' +
          '<div class="podio">' + (filas || '<p class="vacio">Todavía no hay locales con votos suficientes aquí.</p>') + '</div></section>';
      }).join('');
  };

  P.local = function (id) {
    var l = local(id); if (!l) return P.noExiste();
    var t = tipo(l.tipo), c = cifras(l);
    var criterios = S.criteriosDe(l.tipo).map(function (cr) {
      var d = c.crit[cr.id];
      return '<div class="criterio"><span class="em" aria-hidden="true">' + cr.emoji + '</span><span class="nom">' + esc(cr.nombre) + '</span>' +
        (d.media == null ? '<span class="val sin">sin votos</span><span class="barra"><i style="width:0"></i></span>'
          : '<span class="val">' + num(d.media) + '</span><span class="barra" aria-hidden="true"><i style="width:' + (d.media * 10) + '%;background:' + colorBarra(d.media) + '"></i></span>') +
        '</div>';
    }).join('');
    var COLORES = { si: '#059669', depende: '#F59E0B', no: '#DC2626', justo: '#059669', caro: '#F59E0B', abusivo: '#DC2626', coche: '#64748B',
      '18-24': '#DB2777', '25-35': '#7C3AED', '25-50': '#2563EB', '35-60': '#0D9488' };
    var rapidas = S.RAPIDAS.map(function (r) {
      var d = c.rapidas[r.id] || {}, tot = r.opciones.reduce(function (a, o) { return a + (d[o[0]] || 0); }, 0);
      if (!tot) return '';
      return '<div class="rapida"><h3>' + r.pregunta + '</h3><div class="reparto" aria-hidden="true">' +
        r.opciones.map(function (o) { return '<i style="width:' + ((d[o[0]] || 0) / tot * 100) + '%;background:' + COLORES[o[0]] + '"></i>'; }).join('') + '</div>' +
        '<div class="leyenda">' + r.opciones.map(function (o) { return '<span style="--c:' + COLORES[o[0]] + '">' + o[1] + ' ' + Math.round((d[o[0]] || 0) / tot * 100) + ' %</span>'; }).join('') + '</div></div>';
    }).join('');
    var mapa = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.nombre + ', ' + (l.barrio ? l.barrio + ', ' : '') + l.municipio + ', Gran Canaria');

    vista.innerHTML =
      '<a class="volver" href="#/explorar">← Volver</a>' +
      '<div class="ficha-cab"><div><h1>' + esc(l.nombre) + '</h1>' +
      '<div class="donde">' + t.emoji + ' ' + esc(t.nombre) + ' · ' + esc(l.barrio ? l.barrio + ', ' : '') + esc(l.municipio) + '</div>' +
      (mayoria(c) ? '<div class="donde">👥 La mayoría de la gente, ' + mayoria(c).nombre.toLowerCase() + ' años</div>' : '') +
      '<span class="sello">✓ ' + c.votos + (c.votos === 1 ? ' voto' : ' votos') + ' de personas con cuenta</span></div>' + notaHTML(c) + '</div>' +
      (c.votos < S.MIN_VOTOS_RANKING ? '<p class="tarjeta" style="margin-top:16px;font-weight:700">Este sitio tiene todavía muy pocos votos: no entra en los rankings hasta llegar a ' + S.MIN_VOTOS_RANKING + '.</p>' : '') +
      '<div class="acciones-ficha"><a class="boton boton-ambar" href="#/votar/' + l.id + '">' + (c.mio ? 'Cambiar mi voto' : 'Votar este sitio') + '</a>' +
      '<a class="boton boton-borde" href="' + mapa + '" target="_blank" rel="noopener">Cómo llegar</a></div>' +
      '<section class="bloque"><h2>Nota por partes</h2><p class="sub">La media de lo que ha votado la gente, de 0 a 10.</p><div class="tarjeta">' + criterios + '</div></section>' +
      (rapidas ? '<section class="bloque"><h2>En una palabra</h2><div class="tarjeta">' + rapidas + '</div></section>' : '') +
      comentariosHTML(l);
    pintarComentarios(l);
  };

  function comentariosHTML(l) {
    return l.comentarios ? '<section class="bloque" id="comentarios" aria-busy="true"><h2>Lo que dice la gente</h2><div class="lista"><p class="vacio">Cargando comentarios…</p></div></section>' : '';
  }
  function haceCuanto(iso) {
    var d = (Date.now() - new Date(iso).getTime()) / 864e5;
    if (d < 1) return 'hoy'; if (d < 2) return 'ayer'; if (d < 7) return 'hace ' + Math.floor(d) + ' días';
    if (d < 14) return 'hace 1 semana'; if (d < 60) return 'hace ' + Math.floor(d / 7) + ' semanas';
    return new Date(iso).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  async function pintarComentarios(l) {
    var caja = document.getElementById('comentarios'); if (!caja) return;
    var r = await sb.rpc('salimos_comentarios', { p_local: l.id });
    if (!document.body.contains(caja)) return;
    caja.removeAttribute('aria-busy');
    var lista = r.error ? [] : r.data;
    caja.querySelector('.lista').innerHTML = lista.length ? lista.map(function (k) {
      return '<blockquote class="comentario tarjeta' + (k.mio ? ' mio' : '') + '"><p>«' + esc(k.texto) + '»</p><footer>' + (k.mio ? 'Tu comentario · ' : '') + haceCuanto(k.fecha) + '</footer></blockquote>';
    }).join('') : '<p class="vacio">No se han podido cargar.</p>';
  }

  P.votar = function (id) {
    var l = local(id); if (!l) return P.noExiste();
    if (!usuario() || !YO.perfil) { guardar('vuelta', '#/votar/' + id); location.hash = '#/entrar'; return; }
    var previo = votosDe()[id] || { crit: {}, rapidas: {} };
    var voto = { crit: Object.assign({}, previo.crit), rapidas: Object.assign({}, previo.rapidas), comentario: previo.comentario };
    var crits = S.criteriosDe(l.tipo);
    var PALABRA = ['Fatal', 'Fatal', 'Muy mal', 'Mal', 'Flojo', 'Regular', 'Aprobado', 'Bien', 'Muy bien', 'Excelente', 'Perfecto'];

    vista.innerHTML =
      '<a class="volver" href="#/local/' + id + '">← Volver a la ficha</a>' +
      '<div class="votar-cab"><h1>' + (votosDe()[id] ? 'Cambia tu voto' : '¿Qué tal en ' + esc(l.nombre) + '?') + '</h1>' +
      '<p>Mueve cada barra de 0 a 10. Si algo no lo sabes, déjalo en «No lo sé».</p></div>' +
      '<section class="bloque"><div class="tarjeta">' + crits.map(function (c) {
        var v = voto.crit[c.id];
        return '<div class="desliza' + (v == null ? ' sin-votar' : '') + '" data-c="' + c.id + '"><div class="desliza-cab"><span class="em" aria-hidden="true">' + c.emoji + '</span>' +
          '<label class="nom" for="r-' + c.id + '">' + esc(c.nombre) + '</label><output id="o-' + c.id + '" class="' + (v == null ? 'sin' : '') + '">' + (v == null ? 'No lo sé' : v) + '</output>' +
          '<span class="ayuda">' + esc(c.ayuda) + '</span></div>' +
          '<input type="range" id="r-' + c.id + '" min="0" max="10" step="1" value="' + (v == null ? 5 : v) + '" aria-valuetext="' + (v == null ? 'Sin votar' : v + ', ' + PALABRA[v]) + '">' +
          '<div class="pie-desliza"><span id="p-' + c.id + '">' + (v == null ? 'Sin votar' : PALABRA[v]) + '</span><button type="button" class="no-se" data-c="' + c.id + '">No lo sé</button></div></div>';
      }).join('') + '</div></section>' +
      '<section class="bloque"><h2>Y en una palabra</h2><div class="tarjeta">' + S.RAPIDAS.map(function (r) {
        return '<div class="rapida"><h3 id="q-' + r.id + '">' + r.pregunta + '</h3><div class="opciones" role="group" aria-labelledby="q-' + r.id + '">' +
          r.opciones.map(function (o) { return '<button type="button" class="chip" data-r="' + r.id + '" data-v="' + o[0] + '" aria-pressed="' + (voto.rapidas[r.id] === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
      }).join('') + '</div></section>' +
      '<section class="bloque"><div class="tarjeta campo" style="margin:0"><label for="coment">Tu comentario <span class="ayuda">(opcional)</span></label>' +
      '<span class="ayuda">Lo que le dirías a un amigo: si lo recomiendas y para quién. Sin insultos ni nombres de trabajadores. Se publica al momento; si no respeta estas normas, lo quitamos.</span>' +
      (previo.retirado ? '<span class="ayuda" style="color:var(--rojo)">Este comentario se retiró por no cumplir las normas. Si lo cambias, se vuelve a publicar.</span>' : '') +
      '<textarea id="coment" maxlength="300" rows="4" placeholder="Ej.: buen ambiente, pero casi todo gente muy joven">' + esc(voto.comentario || '') + '</textarea>' +
      '<span class="ayuda" id="cuenta" style="text-align:right">' + (voto.comentario || '').length + ' / 300</span></div></section>' +
      '<div class="bloque"><button class="boton boton-ambar boton-ancho" id="publicar">Publicar mi voto</button>' +
      '<p class="nota-legal" id="falta"></p>' +
      '<p class="nota-legal">Tu voto cuenta una sola vez por sitio. Puedes cambiarlo cuando quieras. Nadie ve tu nombre ni tu correo.</p></div>';

    function marcar(cid, v) {
      if (v == null) delete voto.crit[cid]; else voto.crit[cid] = v;
      var o = document.getElementById('o-' + cid), p = document.getElementById('p-' + cid), r = document.getElementById('r-' + cid);
      o.textContent = v == null ? 'No lo sé' : v; o.className = v == null ? 'sin' : '';
      p.textContent = v == null ? 'Sin votar' : PALABRA[v];
      r.setAttribute('aria-valuetext', v == null ? 'Sin votar' : v + ', ' + PALABRA[v]);
      if (v == null) r.value = 5;
      r.parentNode.classList.toggle('sin-votar', v == null);
      revisar();
    }
    function revisar() {
      var n = Object.keys(voto.crit).length, falta = Math.max(0, 3 - n);
      document.getElementById('publicar').disabled = falta > 0;
      document.getElementById('falta').textContent = falta ? 'Vota al menos 3 cosas para publicar (te ' + (falta === 1 ? 'falta 1' : 'faltan ' + falta) + ').' : '';
    }
    vista.querySelectorAll('input[type=range]').forEach(function (r) { r.oninput = function () { marcar(r.id.slice(2), +r.value); }; });
    vista.querySelectorAll('.no-se').forEach(function (b) { b.onclick = function () { marcar(b.dataset.c, null); }; });
    vista.querySelectorAll('.chip[data-r]').forEach(function (b) {
      b.onclick = function () {
        var on = voto.rapidas[b.dataset.r] === b.dataset.v;
        if (on) delete voto.rapidas[b.dataset.r]; else voto.rapidas[b.dataset.r] = b.dataset.v;
        vista.querySelectorAll('.chip[data-r="' + b.dataset.r + '"]').forEach(function (o) { o.setAttribute('aria-pressed', !on && o === b ? 'true' : 'false'); });
      };
    });
    document.getElementById('coment').oninput = function (e) { document.getElementById('cuenta').textContent = e.target.value.length + ' / 300'; };
    document.getElementById('publicar').onclick = async function () {
      var b = this; b.disabled = true; b.textContent = 'Publicando…';
      var r = await sb.rpc('salimos_votar', { p_local: id, p_crit: voto.crit, p_rapidas: voto.rapidas, p_comentario: document.getElementById('coment').value.trim() });
      if (r.error) { b.disabled = false; b.textContent = 'Publicar mi voto'; document.getElementById('falta').textContent = textoError(r.error); return; }
      await Promise.all([cargarLocales(), cargarYo()]);
      tostada('Voto publicado. Gracias.'); location.hash = '#/local/' + id;
    };
    revisar();
  };

  P.entrar = function () {
    /* Con sesión (por ejemplo, de Trivial) pero sin perfil de Salimos: solo falta confirmar la edad. */
    var soloEdad = !!YO.sesion && !YO.perfil;
    if (YO.sesion && YO.perfil) { location.hash = leer('vuelta', '#/tu'); borrar('vuelta'); return; }
    vista.innerHTML =
      '<h1 style="font-size:28px;font-weight:800">' + (soloEdad ? 'Un paso más' : 'Entra para votar') + '</h1>' +
      '<p style="color:var(--tinta-2);font-weight:600">' + (soloEdad ? 'Ya has entrado con ' + esc(YO.sesion.user.email) + '. Para votar en Salimos, confirma esto:'
        : 'Sin contraseña: te mandamos un código de 6 cifras a tu correo. Así cada persona vota una sola vez por sitio.') + '</p>' +
      '<form class="tarjeta" id="f1" novalidate>' +
      (soloEdad ? '' : '<div class="campo"><label for="correo">Tu correo</label><input type="email" id="correo" autocomplete="email" inputmode="email" placeholder="nombre@correo.com" required></div>') +
      '<label class="casilla"><input type="checkbox" id="mayor"> <span>Tengo 18 años o más.</span></label>' +
      '<label class="casilla"><input type="checkbox" id="acepto"> <span>He leído la <a href="privacidad.html" target="_blank">política de privacidad</a>.</span></label>' +
      '<button class="boton boton-ambar boton-ancho" type="submit">' + (soloEdad ? 'Confirmar' : 'Mandarme el código') + '</button><p class="nota-legal" id="err1" role="alert"></p></form>' +
      '<form class="tarjeta" id="f2" hidden novalidate><div class="campo"><label for="cod">Código que te ha llegado</label>' +
      '<span class="ayuda" id="aquien"></span><input type="text" id="cod" class="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······"></div>' +
      '<button class="boton boton-ambar boton-ancho" type="submit">Entrar</button>' +
      '<p class="nota-legal">¿No llega? Mira en «Correo no deseado» o espera un minuto.</p><p class="nota-legal" id="err2" role="alert"></p></form>';

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
      if (!/^\d{6}$/.test(cod)) { err.textContent = 'El código son 6 cifras.'; return; }
      bt.disabled = true; err.textContent = '';
      var r = await sb.auth.verifyOtp({ email: correo, token: cod, type: 'email' });
      if (r.error) { bt.disabled = false; err.textContent = 'Ese código no es. Mira el correo otra vez.'; return; }
      try { await terminar(); } catch (x) { bt.disabled = false; err.textContent = textoError(x); }
    };
  };

  P.recomendar = function () {
    var puede = !!usuario() && YO.perfil;
    if (!puede) { guardar('vuelta', '#/recomendar'); }
    vista.innerHTML =
      '<h1 style="font-size:28px;font-weight:800">Recomienda un sitio</h1>' +
      '<p style="color:var(--tinta-2);font-weight:600">¿Conoces un sitio de Gran Canaria que debería estar aquí? Lo revisamos y lo damos de alta. Darlo de alta es gratis y nadie puede pagar por entrar.</p>' +
      (puede ? '' : '<p class="tarjeta" style="font-weight:700">Para recomendar hace falta entrar con tu correo. <a href="#/entrar">Entrar</a></p>') +
      '<form class="tarjeta" id="fr" novalidate>' +
      '<div class="campo"><label for="rn">Nombre del sitio</label><input type="text" id="rn" placeholder="Ej.: Bar Avenida" maxlength="80"></div>' +
      '<div class="campo"><span class="etq" id="rt-l">¿Qué es?</span><div class="opciones" role="group" aria-labelledby="rt-l">' +
      S.TIPOS.map(function (t) { return '<button type="button" class="chip" data-t="' + t.id + '" aria-pressed="false">' + t.emoji + ' ' + t.nombre + '</button>'; }).join('') + '</div></div>' +
      '<div class="campo"><label for="rm">Municipio</label><select id="rm"><option value="">Elige el municipio…</option>' +
      S.MUNICIPIOS.map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label for="rd">Dirección o enlace del mapa</label><span class="ayuda">Para encontrarlo sin dudas. Opcional.</span><input type="text" id="rd" placeholder="Calle, número o enlace" maxlength="200"></div>' +
      '<label class="casilla"><input type="checkbox" id="rno"> <span>No trabajo en este sitio ni gano nada por recomendarlo.</span></label>' +
      '<button class="boton boton-ambar boton-ancho" type="submit"' + (puede ? '' : ' disabled') + '>Enviar recomendación</button>' +
      '<p class="nota-legal" id="er" role="alert"></p></form>';
    var tipoSel = '';
    vista.querySelectorAll('.chip[data-t]').forEach(function (b) {
      b.onclick = function () { tipoSel = b.dataset.t; vista.querySelectorAll('.chip[data-t]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); };
    });
    document.getElementById('fr').onsubmit = async function (e) {
      e.preventDefault();
      var er = document.getElementById('er'), nombre = document.getElementById('rn').value.trim(), mun = document.getElementById('rm').value;
      if (nombre.length < 2) { er.textContent = 'Falta el nombre del sitio.'; return; }
      if (!tipoSel) { er.textContent = 'Elige qué tipo de sitio es.'; return; }
      if (!mun) { er.textContent = 'Elige el municipio.'; return; }
      if (!document.getElementById('rno').checked) { er.textContent = 'Marca la casilla: aquí no se recomienda el sitio propio.'; return; }
      var bt = this.querySelector('button[type=submit]'); bt.disabled = true;
      var r = await sb.rpc('salimos_recomendar', { p_nombre: nombre, p_tipo: tipoSel, p_municipio: mun, p_direccion: document.getElementById('rd').value.trim() });
      if (r.error) { bt.disabled = false; er.textContent = textoError(r.error); return; }
      vista.innerHTML = '<div class="tarjeta" style="text-align:center;padding:32px 20px"><div style="font-size:48px" aria-hidden="true">🙌</div>' +
        '<h1 style="font-size:26px;font-weight:800;margin-top:8px">Gracias</h1><p style="font-size:17px;color:var(--tinta-2);font-weight:600">Revisamos «' + esc(nombre) + '» y, si es un sitio de Gran Canaria abierto al público, lo damos de alta. Te avisamos por correo.</p>' +
        '<a class="boton boton-ambar" href="#/explorar">Volver a explorar</a></div>';
    };
  };

  P.tu = function () {
    var u = usuario();
    if (!u) {
      vista.innerHTML = '<h1 style="font-size:28px;font-weight:800">Tu cuenta</h1><p style="color:var(--tinta-2);font-weight:600">Para ver la gente que sale no hace falta cuenta. Para votar y recomendar, sí: así nadie vota dos veces.</p>' +
        '<a class="boton boton-ambar boton-ancho" href="#/entrar">Entrar con mi correo</a>';
      return;
    }
    if (!YO.perfil) { location.hash = '#/entrar'; return; }
    var v = votosDe(), ids = Object.keys(v);
    vista.innerHTML = '<h1 style="font-size:28px;font-weight:800">Tu cuenta</h1><p style="color:var(--tinta-2);font-weight:600">Has entrado como <b style="color:var(--tinta)">' + esc(u.correo) + '</b>.</p>' +
      '<section class="bloque"><h2>Tus votos</h2><p class="sub">Toca un sitio para cambiar tu voto.</p><div class="lista">' +
      (ids.length ? ids.map(function (id) { return local(id) ? tarjetaLocal(local(id)) : ''; }).join('') : '<p class="vacio">Todavía no has votado ningún sitio.</p>') + '</div></section>' +
      '<section class="bloque"><button class="boton boton-borde boton-ancho" id="salir">Cerrar sesión</button>' +
      '<p class="nota-legal" style="text-align:center"><button type="button" class="no-se" id="borrarCuenta">Borrar mi cuenta y mis votos</button></p></section>';
    document.getElementById('salir').onclick = async function () { await sb.auth.signOut(); await cargarYo(); tostada('Sesión cerrada.'); P.tu(); };
    document.getElementById('borrarCuenta').onclick = async function () {
      if (!confirm('¿Borrar tu cuenta y todos tus votos y comentarios? No se puede deshacer.')) return;
      var r = await sb.rpc('salimos_borrar_mis_datos');
      if (r.error) { tostada(textoError(r.error)); return; }
      try { await sb.auth.signOut({ scope: 'local' }); } catch (x) { /* la cuenta ya no está */ }
      await Promise.all([cargarYo(), cargarLocales()]); tostada('Borrado.'); P.tu();
    };
  };

  P['como-funciona'] = function () {
    /* Lo que dice aquí tiene que ser verdad en sql/01-salimos.sql. */
    vista.innerHTML = '<article class="texto"><h1>Cómo funciona</h1>' +
      '<h2>Quién vota</h2><p>Personas con cuenta. Se entra con el correo y un código, sin contraseña. Cada persona tiene un voto por sitio, que puede cambiar cuando quiera.</p>' +
      '<h2>Cómo sale la nota</h2><p>Cada sitio se vota por partes: limpieza, ambiente, servicio, consumiciones, precio, ubicación, parking y guagua, y además lo propio de cada tipo de sitio (la carta, los vinos, la música o las vistas). La nota general es la media de esas partes.</p>' +
      '<p>Un sitio no entra en los rankings hasta tener ' + S.MIN_VOTOS_RANKING + ' votos.</p>' +
      '<h2>Quién paga</h2><p>Nadie. Ningún local, marca ni anunciante puede pagar por salir, subir o quitar una nota. Salimos es del Grupo Saneas y es gratis.</p>' +
      '<h2>Votos falsos</h2><p>Una cuenta solo puede votar una vez cada sitio, y hay un tope de sitios nuevos al día. Vigilamos los votos raros —muchas cuentas nuevas votando el mismo sitio de golpe— y los que sean de mentira no cuentan.</p>' +
      '<h2>Comentarios</h2><p>Se publican al momento. Quitamos los que insultan, señalan a trabajadores con nombre o no tienen que ver con el sitio.</p></article>';
  };

  P.privacidad = function () { location.replace('privacidad.html'); };

  P.noExiste = function () { vista.innerHTML = '<p class="vacio">Este sitio no existe o ya no está.<br><a href="#/explorar">Volver a explorar</a></p>'; };

  /* ───────── enrutador ───────── */
  function ir() {
    var h = location.hash.replace(/^#\/?/, '');
    if (!h) h = leer('visto', 0) ? 'explorar' : 'bienvenida';
    var partes = h.split('/'), nombre = partes[0], arg = partes[1];
    (P[nombre] || P.noExiste)(arg);
    var tab = { explorar: 'explorar', local: 'explorar', votar: 'explorar', zonas: 'zonas', recomendar: 'recomendar', tu: 'tu', entrar: 'tu' }[nombre];
    document.querySelectorAll('.pestanas a').forEach(function (a) { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    window.scrollTo(0, 0); vista.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', ir);

  async function arrancar() {
    vista.innerHTML = '<p class="vacio" aria-busy="true">Cargando…</p>';
    try { await Promise.all([cargarLocales(), cargarYo()]); }
    catch (e) { vista.innerHTML = '<p class="vacio">No se ha podido cargar. Mira tu conexión y <a href="">vuelve a intentarlo</a>.</p>'; return; }
    ir();
  }
  sb.auth.onAuthStateChange(function (evento) { if (evento === 'SIGNED_OUT') { YO = { sesion: null, perfil: false, admin: false, votos: {} }; } });
  arrancar();
})();
