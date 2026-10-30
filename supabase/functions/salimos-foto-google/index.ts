// Salimos · una foto de Google Maps para la ficha de un sitio, por el servicio oficial (Places API New).
// GET ?local=<uuid>  →  { uri, autor, autorUri, mapsUri }  o  { uri: null }
// La clave de Google vive en el secreto GOOGLE_PLACES_KEY (la pone Óscar con scripts/poner-clave-google.sh).
// Nada se guarda salvo el place_id, que Google permite guardar. La foto se pide cada vez (sus normas)
// y hay un tope diario (salimos_google_gastar) para no salir nunca del cupo gratis.
const CLAVE = Deno.env.get("GOOGLE_PLACES_KEY") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGENES = ["https://salimos.saneas.es", "capacitor://localhost", "https://localhost"];

function cabeceras(origen: string | null) {
  const vale = origen && (ORIGENES.includes(origen) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen));
  return {
    "Access-Control-Allow-Origin": vale ? origen! : ORIGENES[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Content-Type": "application/json",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}

async function rpc(nombre: string, args: Record<string, unknown>) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: { apikey: SB_SERVICIO, Authorization: `Bearer ${SB_SERVICIO}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${nombre}: ${r.status}`);
  return r.status === 204 ? null : r.json();
}

// Buscar el sitio solo pidiendo el id es gratis («Text Search Essentials IDs Only»).
async function buscarPlace(l: any): Promise<string | null> {
  const cuerpo: any = { textQuery: [l.nombre, l.direccion, l.municipio, l.destino].filter(Boolean).join(", "), languageCode: "es" };
  if (l.lat != null && l.lng != null) cuerpo.locationBias = { circle: { center: { latitude: l.lat, longitude: l.lng }, radius: 500 } };
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "X-Goog-Api-Key": CLAVE, "X-Goog-FieldMask": "places.id", "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.places?.[0]?.id ?? null;
}

Deno.serve(async (req) => {
  const h = cabeceras(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const nada = new Response(JSON.stringify({ uri: null }), { headers: h });
  try {
    const local = new URL(req.url).searchParams.get("local") ?? "";
    if (!CLAVE || !/^[0-9a-f-]{36}$/i.test(local)) return nada;
    const l = await rpc("salimos_google_local", { p_local: local });
    if (!l || l.propia) return nada;

    let place = l.place as string | null;
    if (!place) {
      place = await buscarPlace(l);
      if (!place) return nada;
      await rpc("salimos_google_guardar_place", { p_local: local, p_place: place });
    }

    // La lista de fotos (solo el campo photos) también es gratis («Place Details Essentials IDs Only»).
    const det = await fetch(`https://places.googleapis.com/v1/places/${place}?languageCode=es`, {
      headers: { "X-Goog-Api-Key": CLAVE, "X-Goog-FieldMask": "photos" },
    });
    if (!det.ok) return nada;
    const foto = (await det.json()).photos?.[0];
    if (!foto?.name) return nada;

    // Esto sí cuenta: 1.000 gratis al mes. Si hoy ya se ha llegado al tope, no se pide.
    if (!(await rpc("salimos_google_gastar", { p_tope: 30 }))) return nada;
    const med = await fetch(`https://places.googleapis.com/v1/${foto.name}/media?maxWidthPx=1200&skipHttpRedirect=true`, {
      headers: { "X-Goog-Api-Key": CLAVE },
    });
    if (!med.ok) return nada;
    const { photoUri } = await med.json();
    const a = foto.authorAttributions?.[0] ?? {};
    return new Response(JSON.stringify({
      uri: photoUri ?? null,
      autor: a.displayName ?? null,
      autorUri: a.uri ?? null,
      mapsUri: foto.googleMapsUri ?? null,
    }), { headers: h });
  } catch (_e) {
    return nada;
  }
});
