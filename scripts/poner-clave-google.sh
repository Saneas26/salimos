#!/bin/zsh
# Pone la clave de Google Places en Supabase (secreto GOOGLE_PLACES_KEY del proyecto Gajos) sin que se vea ni se guarde aquí.
# La clave la crea Óscar en Google Cloud (Places API New, restringida a esa API). Uso: zsh ~/Sites/salimos/scripts/poner-clave-google.sh
set -e
for intento in 1 2 3; do
  printf "Pega la clave de Google (Cmd+V; no se verá) y DESPUÉS pulsa Intro: "; read -s CLAVE; echo
  CLAVE=$(print -rn -- "$CLAVE" | tr -d ' \r\n')
  [[ "$CLAVE" == AIza* ]] && break
  echo "Eso no parece una clave de Google (empiezan por AIza). Otra vez."; CLAVE=""
done
[ -n "$CLAVE" ] || { echo "No se ha guardado nada."; exit 1; }
F=$(mktemp); chmod 600 "$F"; print -rn -- "GOOGLE_PLACES_KEY=$CLAVE" > "$F"; unset CLAVE
env -u SUPABASE_ACCESS_TOKEN supabase secrets set --env-file "$F" --project-ref dzddxyrcdznebhxcrxmy >/dev/null && echo "Hecho: la clave está en Supabase. Díselo a Claude para que lo pruebe."
rm -f "$F"
