#!/usr/bin/env bash
# Construye www/, que es lo que Capacitor mete dentro del binario de Android e iPhone.
#
# Dentro de la app no se usa el Tailwind del CDN (compila los estilos en el móvil a cada
# arranque y la pantalla parpadea sin estilo): aquí se compilan una vez, con la misma
# configuración de Stitch que lleva index.html, a css/stitch.css. Los datos siguen
# viniendo de Supabase, así que la app necesita conexión, igual que la web.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf www
mkdir -p www/css
cp index.html privacidad.html manifest.json www/
cp -R js img vendor www/

# La configuración de Tailwind sale de index.html: una sola fuente para la web y la app.
python3 - <<'PY'
import re
html = open('index.html', encoding='utf-8').read()
conf = re.search(r'<script id="tailwind-config">\s*tailwind\.config\s*=\s*(\{.*?\});?\s*</script>', html, re.S).group(1)
open('www/tailwind.config.cjs', 'w', encoding='utf-8').write(
    'module.exports = Object.assign(' + conf + ', { content: ["./index.html", "./js/app.js"] });\n')
open('www/entrada.css', 'w').write('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n')
PY
(cd www && npx --yes tailwindcss@3.4.17 -c tailwind.config.cjs -i entrada.css -o css/stitch.css --minify)
rm www/tailwind.config.cjs www/entrada.css

# Cambia el CDN por la hoja compilada en la copia de la app.
python3 - <<'PY'
import re
p = 'www/index.html'
html = open(p, encoding='utf-8').read()
html = re.sub(r'<script src="https://cdn\.tailwindcss\.com[^"]*"></script>\s*', '', html)
html = re.sub(r'<script id="tailwind-config">.*?</script>\s*', '<link rel="stylesheet" href="css/stitch.css">\n', html, flags=re.S)
assert 'cdn.tailwindcss.com' not in html and 'css/stitch.css' in html
open(p, 'w', encoding='utf-8').write(html)
PY

test -s www/css/stitch.css
test -f www/index.html
test -f www/privacidad.html
echo "www/ listo: $(find www -type f | wc -l | tr -d ' ') ficheros, stitch.css $(wc -c < www/css/stitch.css | tr -d ' ') bytes"
