// ============================================================
// GRUPO SANEAS · componente compartido de publicidad interna
// Este archivo es IGUAL en todas las webs y apps del grupo.
// Si lo cambias aquí, cópialo tal cual en las demás.
//
// Cómo se usa (una línea en cada propiedad):
//   GrupoSaneas.init({ actual:'saneas', logos:'img/' });
//   · actual → cuál de las marcas es esta (se marca «Estás aquí»)
//   · logos  → carpeta donde viven los app-<marca>.png (192px)
//   · barra  → selector de la barra de arriba de esa casa, para que el
//     desplegable no la tape. Por defecto '.appbar,header' (las apps); la
//     web de marketing pasa 'nav'. Ojo: en las apps 'nav' es la barra de
//     pestañas de ABAJO, así que no vale como valor por defecto.
//
// Dos superficies:
//   · GrupoSaneas.abrirMenu()  → desplegable del logo: logotipo + explicación
//   · GrupoSaneas.gridHTML()   → parrilla para el pie; al tocar un icono se
//     despliega su ficha con la explicación y un botón OK.
// ============================================================
var GrupoSaneas = (function(){
  var MARCAS = [
    // Saneas son DOS fichas: la web (icono teal con todas las letras) y la APP
    // (icono teal con la S sola, que lleva a la pagina de instalacion).
    { id:'saneas', nombre:'Saneas', logo:'app-saneas-web.png', url:'https://saneas.es', tipo:'una página web',
      texto:'El método de nutrición con 87% de éxito que ha ayudado a más de 1700 personas, sin pastillas, sin batidos y sin inyecciones. Solo cambiando tus hábitos poco a poco. El GPS de la nutrición que te muestra el camino.' },
    { id:'saneas-app', nombre:'APP Saneas', logo:'app-saneas-s.png', url:'https://saneas.es/instala-app', tipo:'una aplicación',
      play:'https://play.google.com/store/apps/details?id=es.saneas.app',
      ios:'https://apps.apple.com/app/id6809389820',
      texto:'Probablemente la mejor APP de nutrición del mercado.' },
    { id:'trivial', nombre:'Trivial Saneas', logo:'app-trivial.png', url:'https://trivial.saneas.es', tipo:'un juego',
      play:'https://play.google.com/store/apps/details?id=es.saneas.gajos',
      ios:'https://apps.apple.com/app/id6819000618',
      texto:'Preguntas de nutrición para aprender jugando: qué hace tu cuerpo con la comida, cómo leer una etiqueta y cómo montar tu plato. Seis quesitos que ganar.' },
    { id:'loro', nombre:'Loro Habla Inglés', logo:'app-loro.png', url:'https://loro.saneas.es', tipo:'una aplicación',
      play:'https://play.google.com/store/apps/details?id=es.saneas.loro',
      ios:'https://apps.apple.com/app/id6813617562',
      texto:'Tu profe de inglés en el móvil. Media hora al día hablando en voz alta: te escucha, te corrige la pronunciación y te explica cómo se construye cada frase.' },
    { id:'quemedices', nombre:'¿Qué me dices?', logo:'app-quemedices.png', url:'https://quemedices.saneas.es', tipo:'una aplicación',
      texto:'Si viajar era una inseguridad, con esta aplicación dejará de serlo. Traducción simultánea de varios idiomas al español.' },
    { id:'acumula', nombre:'Acumula', logo:'app-acumula.png', url:'https://acumula.es', tipo:'una aplicación',
      play:'https://play.google.com/store/apps/details?id=es.saneas.acumula',
      ios:'https://apps.apple.com/app/id6815290405',
      texto:'Una ayuda para controlar tu economía casera, totalmente gratuita. Todas tus cuentas en un solo sitio.' },
    { id:'pordondevoy', nombre:'Pordondevoy', logo:'app-pordondevoy.png', url:'https://pordondevoy.saneas.es', tipo:'una aplicación',
      play:'https://play.google.com/store/apps/details?id=es.saneas.pordondevoy',
      texto:'En un avión no hay datos ni wifi. Ahora puedes entretenerte y saber por dónde vas, de manera gratuita. Las 20 noticias más importantes del día te acompañan, junto a los principales podcast en español. Con itinerarios a las principales ciudades europeas.' },
    { id:'activala', nombre:'Activala', logo:'app-activala.png', url:'https://activala.es', tipo:'una página web',
      texto:'Alquileres de casas en el sur de Gran Canaria, sin intermediarios.' }
  ];
  var CFG = { actual:'', logos:'img/', extras:[], barra:'.appbar,header' };
  // ¿Estamos DENTRO de una app de iPhone/iPad (Saneas, Loro, Acumula, Academia
  // van envueltas con Capacitor)? Ahí Apple rechaza dos cosas: hablar de otra
  // plataforma (norma 2.3.10: nada de «Android» ni «Google Play») y enlazar a
  // algo que se paga fuera de la App Store (norma 3.1.1: Academia y Asesorías).
  function enAppIOS(){
    try {
      var C = window.Capacitor;
      if(C && typeof C.getPlatform==='function' && C.getPlatform()==='ios') return true;
      if(C && C.platform==='ios') return true;
      if(/AcademiaApp/i.test(navigator.userAgent) && /iPhone|iPad|Macintosh/.test(navigator.userAgent)) return true;
    } catch(e) {}
    return false;
  }
  var CSS_PUESTO = false;

  function esc(s){ return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function todas(){
    var result = MARCAS.slice();
    if(CFG.extras && CFG.extras.length > 0 && !enAppIOS()){
      // Orden del grupo (Óscar, 13/10/2026): Saneas · APP Saneas · Academia ·
      // Asesorías · Trivial · Loro · ¿Qué me dices? · Acumula · Pordondevoy ·
      // Activala
      var ex = CFG.extras[0];
      if(ex && ex.id==='academia'){
        // La Academia y Asesorías van juntas y salen de aquí, no del init de
        // cada casa (el init solo dice si se enseñan): mismo icono, nombre y
        // texto en todas. Donde no se enseña la Academia (la app de la
        // Academia en las tiendas) tampoco sale Asesorías: las dos se pagan
        // fuera y Apple no deja enlazar a eso (norma 3.1.1).
        var c={}; for(var k in ex) c[k]=ex[k];
        c.nombre='Academia Saneas'; c.logo='app-academia.png'; c.tipo='un programa';
        c.texto='Aprende a asesorar en nutrición: clases cortas, media hora al día, con el respaldo del equipo Saneas.';
        result.splice(2, 0, c, {
          id:'asesorias', nombre:'Asesorías Saneas', logo:'app-asesorias.png',
          url:'https://saneas.es/asesorias', tipo:'un programa',
          texto:'Si te gusta el mundo de la nutrición, ahora tú también puedes. Más fácil que nunca.'
        });
      } else {
        result.splice(2, 0, ex);
      }
    }
    return result;
  }
  // ---- códigos QR de cada casa, ya calculados ----
  // Se generan con herramientas/qr_grupo.py (segno) y se pegan aquí: son diez
  // direcciones fijas, así que no hace falta un codificador en la app. Cada uno
  // es la matriz en binario, empaquetada en base64, fila a fila.
  var QRS = {
    'saneas': {t:25, d:'/i+/wSBQboOrt1AV26ci7BS1B/qq/gEpAGIVtDZY2set+b0QeIh26gpE+Y/KFBpSAnj2cfkAV8R/jaowQXErpX+d0Spa6q93BeWw/jSkgA=='},
    'saneas-app': {t:29, d:'/m/D/BGOkG6u0Lt0aUXbqcouwVnZB/qqr+AJmABKit2iQQQcy+17Wpip2L329JTyPtFVqCs6YpfqaJcUvQdt0V5L+1IyccfCn+fl/YB/xF/4t2owT4sZups/ldClCK6Dpw8FbNK/5VaJAA=='},
    'academia': {t:25, d:'/lQ/wRfQbq6Lt1j126kK7BaNB/qq/gGHAL5vPkjQSL7dT2o2XBnn579iQKpqh3drFDGnD/oAaEY/gKrwWRGLqf+l1oN+64wbBMf5/p5/gA=='},
    'asesorias': {t:29, d:'/h/7/BAqkG6yFLt0ZUXbqKouwVfZB/qqr+AOuABK8rWjzekc8pF7OypnyrGkNZTuBnFV7XqifSEyKKpynQWLAT9FxlISG1/AjfEE+IBoxF/4n2owSU8Zur0/ldBUC66fJx8FHN6/5RatAA=='},
    'pordondevoy': {t:29, d:'/kAj/BMT0G6s9rt03HXbr/ouwWQJB/qqr+AHrwBK5k2npXBc1o57G+EhqrGmZZDw5JFUDOwCM5H8qkqhtBeNwx5Bh8oyc3fCHTxl/YBI1F/5n2owSmsZuog/ldIHCK6OLw8FZJa/59TJAA=='},
    'activala': {t:25, d:'/me/wSIQbqaLt0nV26tS7BcVB/qq/gDnAEqmWiZvxoS6dZkoJGm3d35m3kjMRHhzu7brWv4AdUQ/iKoQRpHbq+/t0qee6SuVBdD+/mNjgA=='},
    'acumula': {t:25, d:'/iW/wTFQbrbLt0A126r67BTxB/qq/gDwAErHWhClhpan1Y+qtGOhR3+L3kj45nggkjby8f4Ab0Q/kCoQQJH7rw/t0Nue6JOVBWx+/itjgA=='},
    'quemedices': {t:29, d:'/tcT/BOzUG6kMrt1Y2Xbo6IuwV0pB/qqr+AerQBXo2dqjbRyQrBGhQFjT+p7BTAEEa6he2O4dgt6IGpHPBIk/Hjr5eFmQ7TiuvbY/wBPRE/6AyvQWqkVulUPzdde9G6aljsFqpov52TNAA=='},
    'loro': {t:25, d:'/ls/wU7QbpALt0tl26mS7BGJB/qq/gAtAKpHiX44cFqdEvCRpS5zzlnt5SZpYM6qHNKTtPwAe0b/ketwStG7rq/d0ezy6uwjBBta/trRgA=='},
    'trivial': {t:25, d:'/ks/wVLQbp5rt0p1261y7BEZB/qq/gDZAKpdiR6OEHvkKveT/Cl231glpybZqE7hrhKeTPwAa8b/getwSNGLqG/F00Dy6pEjBLsa/o2RgA=='}
  };

  function qrSVG(id, lado){
    var q = QRS[id]; if(!q) return '';
    var bin = atob(q.d), t = q.t, borde = 4, total = t + borde*2, d = '';
    for(var i=0;i<t*t;i++){
      if(!((bin.charCodeAt(i>>3) >> (7-(i&7))) & 1)) continue;
      d += 'M'+((i%t)+borde)+' '+(((i/t)|0)+borde)+'h1v1h-1z';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+lado+'" height="'+lado+'" '
         + 'viewBox="0 0 '+total+' '+total+'" shape-rendering="crispEdges" role="img" '
         + 'aria-label="Código QR"><rect width="'+total+'" height="'+total+'" fill="#fff"/>'
         + '<path d="'+d+'" fill="#1a2e35"/></svg>';
  }

  function porId(id){ var l=todas(); for(var i=0;i<l.length;i++) if(l[i].id===id) return l[i]; return null; }
  // ?v= en los iconos: al cambiar uno (16/10/2026, iconos a sangre) nadie se queda con el viejo en caché
  var LOGOS_V = '2';
  function src(m){ return m.logo ? (CFG.logos+m.logo+'?v='+LOGOS_V) : ''; }
  // Marcas sin PNG (los sub-productos): baldosa naranja con dos figuras,
  // una detrás de otra — se entiende de un vistazo que son personas.
  var SVG_PERSONAS = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
    + '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  // Saneas no lleva foto: lleva su logotipo corporativo, el nombre entero
  // en QuickSand Bold («Saneas®»), blanco sobre el teal de la marca — para
  // que se reconozca igual aquí que en la cabecera de la web y de la app.
  function icono(m, clase){
    if(m.wordmark){
      var tam = clase.indexOf('ficha')>-1 ? 'gs-word-ficha'
              : clase.indexOf('item')>-1  ? 'gs-word-item' : 'gs-word-fila';
      return '<span class="gs-word '+tam+'">Saneas<sup>&reg;</sup></span>';
    }
    return m.logo
      ? '<img src="'+esc(src(m))+'" alt="" loading="lazy">'
      : '<span class="'+clase+'">'+SVG_PERSONAS+'</span>';
  }

  // ---- estilos propios: el componente no depende del CSS de la casa ----
  function ponerCSS(){
    if(CSS_PUESTO) return; CSS_PUESTO=true;
    var c=document.createElement('style'); c.id='gs-css';
    c.textContent = [
      '.gs-fondo{position:fixed;inset:0;background:rgba(16,40,48,.45);z-index:9998;opacity:0;pointer-events:none;transition:opacity .18s}',
      '.gs-fondo.abierto{opacity:1;pointer-events:auto}',
      '.gs-panel{position:fixed;top:58px;left:50%;transform:translate(-50%,-10px);width:min(430px,calc(100% - 24px));',
        'max-height:78vh;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#fff;border-radius:20px;',
        'box-shadow:0 22px 60px rgba(16,40,48,.35);z-index:9999;opacity:0;pointer-events:none;',
        'transition:opacity .18s,transform .18s;padding:16px 14px 10px;',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
        '-webkit-text-size-adjust:100%}',
      '.gs-panel.abierto{opacity:1;pointer-events:auto;transform:translate(-50%,0)}',
      '.gs-tit{font-size:15px;font-weight:700;color:#22313a;text-align:center;margin:0 0 12px}',
      '.gs-tit b{color:#3890a4;font-weight:800}',
      '.gs-fila{display:flex;align-items:flex-start;gap:12px;padding:11px;border-radius:16px;',
        'border:1px solid #e3edef;margin-bottom:9px;text-decoration:none;background:#fff}',
      '.gs-fila:active{background:#f4fafb}',
      '.gs-fila{flex-wrap:wrap}',
      '.gs-fila-l{display:flex;align-items:flex-start;gap:12px;flex:1 1 100%;min-width:0;text-decoration:none}',
      '.gs-comp{margin:6px 0 0 64px;background:#eef6f8;color:#3890a4;border:0;border-radius:9px;',
        'padding:7px 14px;font-size:13.5px;font-weight:800;cursor:pointer;font-family:inherit}',
      '.gs-comp:active{background:#dcecf0}',
      '.gs-comp-ficha{display:block;width:100%;margin:0 0 9px;padding:13px;font-size:15.5px}',
      '.gs-qr{display:flex;justify-content:center;margin:4px 0 6px}',
      '.gs-qr svg{border-radius:12px;box-shadow:0 4px 14px rgba(16,40,48,.16)}',
      '.gs-qr-pie{font-size:14px;color:#3d4f59;margin:0 6px 16px}',
      '.gs-ir.gs-wa{background:#25D366}',
      '.gs-fila img{width:52px;height:52px;border-radius:14px;object-fit:cover;flex:none;background:#fff;',
        'box-shadow:0 1px 2px rgba(16,40,48,.18),0 4px 12px rgba(16,40,48,.14);outline:1px solid rgba(16,40,48,.10);outline-offset:-1px}',
      '.gs-tx{min-width:0;text-align:left}',
      '.gs-tx b{display:block;font-size:17px;font-weight:800;color:#22313a;line-height:1.25}',
      '.gs-tx span{display:block;font-size:16px;color:#3d4f59;line-height:1.55;margin-top:5px}',
      '.gs-aqui{display:inline-block;font-size:10.5px;font-weight:800;color:#F5862E;',
        'background:#fff1e4;border-radius:8px;padding:1px 7px;margin-left:6px;vertical-align:2px}',
      '.gs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 6px;margin-top:12px}',
      '.gs-item{display:flex;flex-direction:column;align-items:center;gap:7px;background:none;border:0;',
        'padding:0;cursor:pointer;font-family:inherit}',
      '.gs-item img{width:60px;height:60px;border-radius:16px;object-fit:cover;background:#fff;',
        'box-shadow:0 1px 2px rgba(16,40,48,.2),0 5px 14px rgba(16,40,48,.16);outline:1px solid rgba(16,40,48,.10);outline-offset:-1px}',
      '.gs-item b{font-size:14px;font-weight:700;color:#22313a;line-height:1.25;text-align:center}',
      '.gs-ficha{text-align:center;padding:6px 4px 2px}',
      '.gs-ficha img{width:96px;height:96px;border-radius:24px;object-fit:cover;background:#fff;',
        'box-shadow:0 2px 4px rgba(16,40,48,.2),0 10px 24px rgba(16,40,48,.2);outline:1px solid rgba(16,40,48,.10);outline-offset:-1px}',
      '.gs-ficha h3{font-size:24px;font-weight:800;color:#22313a;margin:14px 0 8px}',
      '.gs-ficha p{font-size:17px;color:#3d4f59;line-height:1.55;margin:0 6px 18px}',
      '.gs-ir{display:block;background:#3890a4;color:#fff;border:0;border-radius:14px;padding:14px;',
        'font-size:15.5px;font-weight:800;text-decoration:none;font-family:inherit;cursor:pointer;margin-bottom:9px}',
      '.gs-ok{display:block;width:100%;background:#fff;color:#3890a4;border:2px solid #3890a4;border-radius:14px;',
        'padding:13px;font-size:15.5px;font-weight:800;font-family:inherit;cursor:pointer}',
      '.gs-svg{display:inline-flex;align-items:center;justify-content:center;flex:none;',
        'background:linear-gradient(135deg,#F5862E,#d96b1a);box-shadow:0 3px 10px rgba(16,40,48,.12)}',
      '.gs-svg-fila{width:52px;height:52px;border-radius:14px}',
      '.gs-svg-fila svg{width:26px;height:26px}',
      '.gs-svg-item{width:60px;height:60px;border-radius:16px;box-shadow:0 4px 12px rgba(16,40,48,.16)}',
      '.gs-svg-item svg{width:30px;height:30px}',
      '.gs-svg-ficha{width:96px;height:96px;border-radius:24px;box-shadow:0 8px 22px rgba(16,40,48,.2)}',
      '.gs-svg-ficha svg{width:46px;height:46px}',
      '.gs-word{display:inline-flex;align-items:center;justify-content:center;flex:none;',
        'background:linear-gradient(135deg,#1a2e35,#3890a4);color:#fff;',
        'font-family:\'Quicksand\',sans-serif;font-weight:700;letter-spacing:-.2px;',
        'white-space:nowrap;line-height:1}',
      '.gs-word sup{font-size:.5em;font-weight:700;color:#F5862E;margin-left:1px}',
      '.gs-word-fila{width:52px;height:52px;border-radius:14px;font-size:11.5px;',
        'box-shadow:0 3px 10px rgba(16,40,48,.12)}',
      '.gs-word-item{width:60px;height:60px;border-radius:16px;font-size:13px;',
        'box-shadow:0 4px 12px rgba(16,40,48,.16)}',
      '.gs-word-ficha{width:96px;height:96px;border-radius:24px;font-size:19px;',
        'box-shadow:0 8px 22px rgba(16,40,48,.2)}',
      // Dos columnas de descarga. El teal de los botones es #2f7c8e y no el
      // #3890a4 de la casa porque el claro se queda en 3,7:1 de contraste
      // sobre blanco y no llega al minimo legible; el oscuro da 4,8:1.
      '.gs-dos{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:9px}',
      '.gs-baja{display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'gap:3px;border-radius:14px;padding:12px 8px;text-decoration:none;font-family:inherit;',
        'border:2px solid #2f7c8e}',
      '.gs-baja b{font-size:15.5px;font-weight:800;line-height:1.2}',
      '.gs-baja span{font-size:12.5px;font-weight:700;line-height:1.2}',
      '.gs-baja-web{background:#fff}',
      '.gs-baja-web b{color:#22313a}',
      '.gs-baja-web span{color:#3d4f59}',
      '.gs-baja-web:active{background:#f4fafb}',
      '.gs-baja-play{background:#2f7c8e}',
      '.gs-baja-play b{color:#fff}',
      '.gs-baja-play span{color:#f2fafc}',
      '.gs-baja-play:active{background:#26697a}',
      '.gs-canal{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px auto 4px;max-width:420px;',
        'background:#11753f;color:#fff;border-radius:14px;padding:13px 16px;font:600 16px/1.2 inherit;text-decoration:none;',
        'box-shadow:0 1px 2px rgba(16,40,48,.18),0 4px 12px rgba(16,40,48,.14)}',
      '.gs-canal:hover{background:#0d6233}',
      '.gs-canal:focus-visible{outline:3px solid #13292f;outline-offset:2px}',
      '.gs-sin-scroll,.gs-sin-scroll body{overflow:hidden!important}',
      '.gs-conoce{background:#0f151a;color:#fff;border-radius:22px;padding:22px 18px;text-align:center;max-width:460px;margin:8px auto 0;',
        'box-shadow:0 2px 4px rgba(16,40,48,.2),0 10px 28px rgba(16,40,48,.18)}',
      '.gs-conoce-t{margin:0 0 14px;font:600 19px/1.3 inherit;color:#fff;text-wrap:balance}',
      '.gs-conoce-t b{color:#43eff5;font-weight:800}',
      '.gs-conoce-ic{display:flex;justify-content:center;margin:0 0 16px}',
      '.gs-conoce-ic img,.gs-conoce-ic .gs-svg-mini{width:40px;height:40px;border-radius:11px;object-fit:cover;flex:none;margin:0 -5px;',
        'box-shadow:0 0 0 2px #0f151a,0 2px 6px rgba(0,0,0,.35);background:#fff}',
      '.gs-conoce-ic .gs-word{width:40px;height:40px;border-radius:11px;font-size:8px;flex:none;margin:0 -5px;box-shadow:0 0 0 2px #0f151a}',
      '.gs-conoce-b{appearance:none;border:0;background:#01888f;color:#fff;font:700 17px/1 inherit;padding:15px 26px;border-radius:999px;cursor:pointer}',
      '.gs-conoce-b:hover{background:#017379}',
      '.gs-conoce-b:focus-visible,.gs-gal button:focus-visible,.gs-gal a:focus-visible{outline:3px solid #43eff5;outline-offset:2px}',
      '.gs-gal{position:fixed;inset:0;z-index:10000;background:#0f151a;color:#fff;overflow-y:auto;-webkit-overflow-scrolling:touch;',
        'display:none;padding:calc(18px + var(--zona-arriba, env(safe-area-inset-top,0px))) max(16px,env(safe-area-inset-right,0px)) calc(28px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}',
      '.gs-gal.abierta{display:block}',
      '.gs-gal-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;max-width:560px;margin:0 auto 18px}',
      '.gs-gal-tit{font:800 28px/1.1 inherit;letter-spacing:-.5px}',
      '.gs-gal-tit b{color:#43eff5}',
      '.gs-gal-sub{margin:6px 0 0;font-size:16px;color:#c3d3d6}',
      '.gs-x{appearance:none;border:0;background:#1d2a32;color:#fff;width:44px;height:44px;border-radius:50%;font:700 18px/1 inherit;cursor:pointer;flex:none}',
      '.gs-gal-lista{display:flex;flex-direction:column;gap:10px;max-width:560px;margin:0 auto}',
      '.gs-gal-it{appearance:none;border:1px solid #24343d;background:#17222a;color:#fff;border-radius:18px;padding:14px;display:flex;align-items:center;gap:14px;',
        'text-align:left;cursor:pointer;width:100%;font:inherit}',
      '.gs-gal-it:hover{background:#1c2a33}',
      '.gs-gal-it img,.gs-gal-it .gs-svg-fila{width:56px;height:56px;border-radius:15px;flex:none;object-fit:cover;background:#fff}',
      '.gs-gal-tx{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}',
      '.gs-gal-tx b{font-size:18px}',
      '.gs-gal-et{font-size:13px;font-weight:700;color:#43eff5}',
      '.gs-gal-de{font-size:14px;line-height:1.4;color:#c3d3d6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.gs-gal-play{flex:none;width:38px;height:38px;border-radius:50%;background:#01888f;display:grid;place-items:center;font-size:14px;padding-left:2px}',
      '.gs-gal .gs-canal{margin-top:20px}',
      '.gs-vid{position:fixed;inset:0;background:#000;display:flex;align-items:center;justify-content:center}',
      '.gs-vid video{width:100%;height:100%;object-fit:contain;background:#000}',
      '.gs-vid-sin{background:#0f151a}',
      '.gs-vid-barra{position:absolute;left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));top:calc(10px + var(--zona-arriba, env(safe-area-inset-top,0px)));height:4px;border-radius:4px;background:rgba(255,255,255,.25);z-index:2}',
      '.gs-vid-barra i{display:block;height:100%;width:0;border-radius:4px;background:#fff}',
      '.gs-x-vid{position:absolute;top:calc(24px + var(--zona-arriba, env(safe-area-inset-top,0px)));right:max(16px,env(safe-area-inset-right,0px));z-index:3;background:rgba(15,21,26,.7)}',
      '.gs-saltar{position:absolute;bottom:calc(22px + env(safe-area-inset-bottom,0px));right:max(16px,env(safe-area-inset-right,0px));z-index:3;appearance:none;border:0;',
        'background:rgba(15,21,26,.75);color:#fff;font:700 16px/1 inherit;padding:13px 20px;border-radius:999px;cursor:pointer}',
      '#gs-vid-fin{position:absolute;left:0;right:0;bottom:0;z-index:4;display:none;padding:28px max(16px,env(safe-area-inset-right,0px)) calc(24px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));',
        'background:linear-gradient(to top,#0f151a 72%,rgba(15,21,26,0))}',
      '#gs-vid-fin.abierto{display:block}',
      '.gs-vid-sin #gs-vid-fin{position:static;background:none;max-width:460px;margin:0 auto}',
      '.gs-fin{max-width:460px;margin:0 auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px}',
      '.gs-fin img,.gs-fin .gs-svg-ficha,.gs-fin .gs-word{width:84px;height:84px;border-radius:20px;object-fit:cover;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35)}',
      '.gs-fin h3{margin:0;font:800 24px/1.15 inherit;color:#fff}',
      '.gs-fin p{margin:0;font-size:16px;line-height:1.45;color:#c3d3d6}',
      '.gs-fin .gs-ir{width:100%;box-sizing:border-box}',
      '.gs-fin-aqui{font-size:16px;color:#c3d3d6}',
      '.gs-fin-dos{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}',
      '.gs-fin-b{display:flex;flex-direction:column;align-items:center;gap:3px;background:#fff;color:#0f151a;text-decoration:none;border-radius:16px;padding:12px 8px;font:800 17px/1.1 inherit}',
      '.gs-fin-b small{font-size:13px;font-weight:600;color:#3b4b52}',
      '.gs-fin-dos .gs-fin-b:first-child{background:#01888f;color:#fff}',
      '.gs-fin-dos .gs-fin-b:first-child small{color:#e3f6f7}',
      '.gs-fin-mas{display:flex;gap:10px;width:100%}',
      '.gs-fin-l{flex:1;appearance:none;border:1px solid #3a4b54;background:transparent;color:#fff;font:700 16px/1 inherit;padding:13px;border-radius:14px;cursor:pointer}',
      '@media (prefers-reduced-motion:reduce){.gs-panel,.gs-fondo{transition:none}}'
    ].join('');
    document.head.appendChild(c);
  }

  function panel(){
    ponerCSS();
    var p=document.getElementById('gs-panel');
    if(p) return p;
    var f=document.createElement('div'); f.id='gs-fondo'; f.className='gs-fondo'; f.onclick=cerrar;
    p=document.createElement('div'); p.id='gs-panel'; p.className='gs-panel';
    document.body.appendChild(f); document.body.appendChild(p);
    return p;
  }
  function mostrar(html){
    var p=panel();
    // Debajo de la barra de la casa, sea la que sea: en Saneas son dos filas
    // y con el top fijo el panel tapaba el propio botón.
    var barra=document.querySelector(CFG.barra);
    if(barra){ var abajo=barra.getBoundingClientRect().bottom;
      if(abajo>0) p.style.top=Math.round(abajo+8)+'px'; }
    p.innerHTML=html; p.scrollTop=0;
    p.classList.add('abierto');
    document.getElementById('gs-fondo').classList.add('abierto');
  }
  function cerrar(){
    var p=document.getElementById('gs-panel'); if(p) p.classList.remove('abierto');
    var f=document.getElementById('gs-fondo'); if(f) f.classList.remove('abierto');
  }

  // ---- canal de WhatsApp del Grupo (21/10/2026): seguirlo es voluntario, nunca se escribe a nadie ----
  var CANAL = 'https://whatsapp.com/channel/0029Vaw9zFi0bIdmalcGlr2I';
  function canalHTML(){
    return '<a class="gs-canal" href="'+CANAL+'" target="_blank" rel="noopener">'
      + '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>'
      + '<span>Síguenos en el canal de WhatsApp</span></a>';
  }


  // ---- galería «¿Conoces todas las apps y webs del Grupo Saneas?» (22/10/2026) ----
  // 27/10/2026: el hueco de arriba usa --zona-arriba (lo MIDE la app de Saneas, js/52-zona-segura.js)
  // y, donde no existe, env() de siempre: en las apps instaladas env() puede llegar a 0 y la X
  // quedaba debajo del reloj. En las webs no cambia nada.
  // Menú a pantalla completa -> vídeo de texto animado de cada casa -> al terminar, sus botones.
  // Los vídeos viven en saneas.es y solo se descargan al tocar una casa.
  var VIDEO_BASE = 'https://saneas.es/assets/video/grupo/';
  var VIDEO_V = '1';  // subirlo al cambiar algún vídeo
  var VIDEOS = { saneas:1, 'saneas-app':1, academia:1, asesorias:1, trivial:1, loro:1,
                 quemedices:1, acumula:1, pordondevoy:1, activala:1 };
  var GAL = { abierta:false, foco:null };
  function esApple(){ return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1); }
  function esApp(m){ return !!(m.play || m.ios); }
  function tarjetaHTML(){
    var lista = todas().slice(0,8);
    return '<div class="gs-conoce">'
      + '<p class="gs-conoce-t">¿Conoces todas las apps y webs del <b>Grupo Saneas</b>?</p>'
      + '<div class="gs-conoce-ic" aria-hidden="true">' + lista.map(function(m){ return icono(m,'gs-svg gs-svg-mini'); }).join('') + '</div>'
      + '<button type="button" class="gs-conoce-b" onclick="GrupoSaneas.galeria()">Descúbrelas <span aria-hidden="true">▶</span></button>'
      + '</div>';
  }
  function capa(){
    ponerCSS();
    var c=document.getElementById('gs-gal');
    if(!c){
      c=document.createElement('div'); c.id='gs-gal'; c.className='gs-gal';
      c.setAttribute('role','dialog'); c.setAttribute('aria-modal','true'); c.setAttribute('aria-label','Apps y webs del Grupo Saneas');
      document.body.appendChild(c);
      document.addEventListener('keydown', function(e){ if(GAL.abierta && e.key==='Escape') cerrarGaleria(); });
    }
    return c;
  }
  function galeria(){
    cerrar();
    if(!GAL.abierta){ GAL.foco=document.activeElement; }
    GAL.abierta=true;
    var c=capa();
    document.documentElement.classList.add('gs-sin-scroll');
    c.innerHTML = '<div class="gs-gal-cab"><div><div class="gs-gal-tit">Grupo <b>Saneas</b></div>'
      + '<p class="gs-gal-sub">Toca una para verla en un minuto.</p></div>'
      + '<button type="button" class="gs-x" aria-label="Cerrar" onclick="GrupoSaneas.cerrarGaleria()">✕</button></div>'
      + '<div class="gs-gal-lista">' + todas().map(function(m){
          var aqui=(m.id===CFG.actual);
          return '<button type="button" class="gs-gal-it" onclick="GrupoSaneas.ver(\''+esc(m.id)+'\')">'
            + icono(m,'gs-svg gs-svg-fila')
            + '<span class="gs-gal-tx"><b>'+esc(m.nombre)+'</b>'
            + '<span class="gs-gal-et">'+(esApp(m)?'App':'Web')+(aqui?' · estás aquí':'')+'</span>'
            + '<span class="gs-gal-de">'+esc(m.texto)+'</span></span>'
            + (VIDEOS[m.id] ? '<span class="gs-gal-play" aria-hidden="true">▶</span>' : '')
            + '</button>';
        }).join('') + '</div>' + canalHTML();
    c.scrollTop=0; c.classList.add('abierta');
    var x=c.querySelector('.gs-x'); if(x) x.focus();
  }
  function cerrarGaleria(){
    var c=document.getElementById('gs-gal'); if(!c) return;
    var v=c.querySelector('video'); if(v){ try{ v.pause(); }catch(e){} }
    c.classList.remove('abierta'); c.innerHTML=''; GAL.abierta=false;
    document.documentElement.classList.remove('gs-sin-scroll');
    if(GAL.foco && GAL.foco.focus) { try{ GAL.foco.focus(); }catch(e){} }
  }
  function ver(id){
    var m=porId(id); if(!m) return;
    if(typeof trackEvento==='function') trackEvento('grupo_video',{marca:id});
    if(!VIDEOS[id]) return final(id, false);
    var c=capa();
    c.innerHTML = '<div class="gs-vid">'
      + '<div class="gs-vid-barra"><i id="gs-vid-pr"></i></div>'
      + '<button type="button" class="gs-x gs-x-vid" aria-label="Volver al menú" onclick="GrupoSaneas.galeria()">✕</button>'
      + '<video id="gs-vid-v" playsinline muted autoplay preload="auto" poster="'+VIDEO_BASE+esc(id)+'.jpg?v='+VIDEO_V+'"'
      + ' src="'+VIDEO_BASE+esc(id)+'.mp4?v='+VIDEO_V+'"></video>'
      + '<button type="button" class="gs-saltar" onclick="GrupoSaneas.final(\''+esc(id)+'\', false)">Saltar</button>'
      + '<div id="gs-vid-fin"></div></div>';
    var v=document.getElementById('gs-vid-v'), pr=document.getElementById('gs-vid-pr');
    v.muted=true;
    v.addEventListener('timeupdate', function(){ if(v.duration) pr.style.width=(100*v.currentTime/v.duration)+'%'; });
    v.addEventListener('ended', function(){ final(id, true); });
    v.addEventListener('error', function(){ final(id, false); });
    var p=v.play(); if(p && p.catch) p.catch(function(){ /* sin autoplay: el usuario lo pulsa */ v.controls=true; });
  }
  function botonesFinal(m, aqui){
    if(aqui) return '<p class="gs-fin-aqui">Ya estás en '+esc(m.nombre)+'.</p>';
    if(enAppIOS() || !esApp(m)) return descargas(m, false);
    var ios = '<a class="gs-fin-b" href="'+esc(m.ios||m.url)+'" target="_blank" rel="noopener"><small>iPhone</small>'+(m.ios?'App Store':'Desde la web')+'</a>';
    var and = '<a class="gs-fin-b" href="'+esc(m.play||m.url)+'" target="_blank" rel="noopener"><small>Android</small>'+(m.play?'Google Play':'Desde la web')+'</a>';
    return '<div class="gs-fin-dos">' + (esApple() ? ios+and : and+ios) + '</div>';
  }
  function final(id, conVideo){
    var m=porId(id); if(!m) return;
    var aqui=(m.id===CFG.actual);
    // Con vídeo, el cierre ya enseña icono y nombre en grande: aquí solo los botones.
    var cab = conVideo ? '' : icono(m,'gs-svg gs-svg-ficha').replace(' loading="lazy"','')
      + '<h3>'+esc(m.nombre)+'</h3><p>'+esc(m.texto)+'</p>';
    var html = '<div class="gs-fin">' + cab
      + botonesFinal(m, aqui)
      + '<div class="gs-fin-mas"><button type="button" class="gs-fin-l" onclick="GrupoSaneas.galeria()">Ver otra</button>'
      + '<button type="button" class="gs-fin-l" onclick="GrupoSaneas.compartirDesdeGaleria(\''+esc(m.id)+'\')">Compartir</button></div>'
      + '</div>';
    var f=document.getElementById('gs-vid-fin');
    if(f){ var v=document.getElementById('gs-vid-v'); if(v){ try{ v.pause(); }catch(e){} }
      var s=document.querySelector('.gs-saltar'); if(s) s.hidden=true;
      f.innerHTML=html; f.classList.add('abierto'); return; }
    var c=capa(); c.innerHTML='<div class="gs-vid gs-vid-sin">'
      + '<button type="button" class="gs-x gs-x-vid" aria-label="Volver al menú" onclick="GrupoSaneas.galeria()">✕</button>'
      + '<div id="gs-vid-fin" class="abierto">'+html+'</div></div>';
  }
  function compartirDesdeGaleria(id){ cerrarGaleria(); compartir(id); }

  // ---- desplegable del logo: logotipo + explicación de cada una ----
  function menuHTML(){
    return '<div class="gs-tit">Grupo <b>Saneas</b></div>' + todas().map(function(m){
      var aqui = (m.id===CFG.actual);
      var ico = icono(m,'gs-svg gs-svg-fila');
      var tx = '<span class="gs-tx"><b>'+esc(m.nombre)+(aqui?'<span class="gs-aqui">estás aquí</span>':'')
             + '</b><span>'+esc(m.texto)+'</span></span>';
      var dentro = aqui
        ? '<div class="gs-fila-l">'+ico+tx+'</div>'
        : '<a class="gs-fila-l" href="'+esc(m.url)+'" target="_blank" rel="noopener">'+ico+tx+'</a>';
      return '<div class="gs-fila">' + dentro
        + '<button type="button" class="gs-comp" onclick="GrupoSaneas.compartir(\''+esc(m.id)+'\')">Compartir</button>'
        + '</div>';
    }).join('') + canalHTML();
  }
  function abrirMenu(){
    if(GAL.abierta){ cerrarGaleria(); return; }
    galeria();
  }

  // ---- parrilla del pie: iconos; al tocar, la ficha con su OK ----
  // No incluye la propia casa (ya estas en ella): el desplegable si la lleva.
  // Desde el 22/10/2026 el pie ya no lleva la parrilla: lleva la tarjeta que abre la galería.
  function gridHTML(){
    ponerCSS();
    return tarjetaHTML() + canalHTML();
  }
  // ---- compartir: el QR para que lo escaneen delante, o WhatsApp ----
  function compartir(id){
    var m = porId(id); if(!m) return;
    var lado = QRS[id] ? (QRS[id].t + 8) * 6 : 210;   // 6 px por modulo: bordes nitidos
    var svg = qrSVG(id, lado);
    // El mensaje es el mismo que la clienta ve en el desplegable: nombre y
    // explicacion, que son los textos de Oscar, y debajo el enlace.
    var texto = 'Hola, hoy quiero compartir contigo ' + (m.tipo || 'algo')
              + ' que me parece increíble, ' + m.nombre + ': ' + m.texto
              + '\n\n' + m.url;
    var wa = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(texto);
    mostrar('<div class="gs-ficha">'
      + '<h3>Compartir ' + esc(m.nombre) + '</h3>'
      + (svg ? '<div class="gs-qr">' + svg + '</div>'
             + '<p class="gs-qr-pie">Que lo escaneen con la cámara del móvil</p>' : '')
      + '<a class="gs-ir gs-wa" href="' + esc(wa) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>'
      + '<button type="button" class="gs-ok" onclick="GrupoSaneas.ficha(\'' + esc(m.id) + '\')">Volver</button>'
      + '</div>');
  }

  // ---- como se instala cada app ----
  // iPhone: si la app tiene ficha en la App Store (campo ios), a la tienda; si
  // no, la PWA se anade desde la propia web. Android: ficha de Google Play
  // (campo play). Lo que no tiene ninguna tienda (paginas web del grupo) se
  // queda con el boton de siempre: no hay nada que descargar de dos sitios.
  function descargas(m, aqui){
    if(enAppIOS()){
      // Dentro de una app de iPhone: solo la App Store, o la web. Ni rastro de Android.
      if(aqui) return '';
      return m.ios
        ? '<a class="gs-ir" href="'+esc(m.ios)+'" target="_blank" rel="noopener">Ver en la App Store</a>'
        : '<a class="gs-ir" href="'+esc(m.url)+'" target="_blank" rel="noopener">Ir a '+esc(m.nombre)+'</a>';
    }
    if(!m.play && !m.ios){
      return aqui ? '' : '<a class="gs-ir" href="'+esc(m.url)+'" target="_blank" rel="noopener">Ir a '+esc(m.nombre)+'</a>';
    }
    return '<div class="gs-dos">'
      + '<a class="gs-baja gs-baja-web" href="'+esc(m.ios||m.url)+'" target="_blank" rel="noopener">'
        + '<b>iPhone</b><span>'+(m.ios?'App Store':'Desde la web')+'</span></a>'
      + '<a class="gs-baja gs-baja-play" href="'+esc(m.play||m.url)+'" target="_blank" rel="noopener">'
        + '<b>Android</b><span>'+(m.play?'Google Play':'Desde la web')+'</span></a>'
      + '</div>';
  }

  function ficha(id){
    // La app de Saneas mide qué icono se toca; las demás casas no tienen trackEvento.
    if(typeof trackEvento==='function') trackEvento('grupo_icono_click',{marca:id});
    var m=porId(id); if(!m) return;
    var aqui=(m.id===CFG.actual);
    mostrar('<div class="gs-ficha">'
      + icono(m,'gs-svg gs-svg-ficha')
      + '<h3>'+esc(m.nombre)+'</h3><p>'+esc(m.texto)+'</p>'
      + descargas(m, aqui)
      + '<button type="button" class="gs-comp gs-comp-ficha" onclick="GrupoSaneas.compartir(\''+esc(m.id)+'\')">Compartir</button>'
      + '<button type="button" class="gs-ok" onclick="GrupoSaneas.cerrar()">OK</button></div>');
  }

  function init(o){
    o=o||{};
    if(o.actual!=null) CFG.actual=o.actual;
    if(o.logos!=null)  CFG.logos=o.logos;
    if(o.extras!=null) CFG.extras=o.extras;
    if(o.barra!=null)  CFG.barra=o.barra;
    ponerCSS();
  }
  return { init:init, abrirMenu:abrirMenu, cerrar:cerrar, ficha:ficha, compartir:compartir,
           galeria:galeria, cerrarGaleria:cerrarGaleria, ver:ver, final:final, compartirDesdeGaleria:compartirDesdeGaleria,
           gridHTML:gridHTML, menuHTML:menuHTML, marcas:todas };
})();
