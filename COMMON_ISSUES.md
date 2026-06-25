# Common Issues — Guía de troubleshooting (producción)

Guía paso a paso de los problemas que aparecieron al desplegar la Developer Platform
en producción (`dev.cosmospay.lat`) y cómo resolverlos. El orden refleja la cadena
real de errores: cada uno destapaba el siguiente.

**Stack de referencia**
- App (este repo) → host, con **PM2** (`devplat`), Astro + `@astrojs/node`, puerto `4321`.
- Auth → **Authentik** en Docker (`auth.cosmospay.lat`), detrás de Cloudflare.
- Gateway → **APISIX** en Docker (`apisix-quickstart`), admin `9180` / gateway `9080`.
- Cosmos API (upstream) → host, con **PM2** (NestJS), puerto `3000`.
- **Cloudflare** delante de todos los dominios `*.cosmospay.lat`.
- nginx en el host termina TLS (puertos `80`/`443`).

---

## 0. Variables de entorno: build-time vs runtime (leé esto primero)

La app usa dos sistemas de variables y se comportan distinto:

- **`astro:env/server`** (secrets: `DATABASE_URL`, `BETTER_AUTH_*`, `AUTHENTIK_*`, `APISIX_*`,
  `COSMOS_API_*`…) → se leen de **`process.env` en runtime**.
- **`astro:env/client`** (`PUBLIC_*`, ej. `PUBLIC_BETTER_AUTH_URL`) → se **incrustan en el
  bundle del navegador en BUILD time**.
- **Prisma** → su motor lee `DATABASE_URL` de **`process.env`** (no del `.env`).

Consecuencias clave:
- Cambiar una `PUBLIC_*` exige **rebuild** (`npm run build`), no alcanza con reiniciar.
- En producción, las variables tienen que estar en el **`process.env`** del proceso PM2
  (ver Issue #5).

---

## 1. En producción el auth apunta a `localhost`

**Síntoma:** el botón de login dispara una request a `http://localhost:4321/...` en vez del
dominio de producción.

**Causa:** el cliente de Better Auth tenía el `baseURL` hardcodeado a `http://localhost:4321`.

**Fix:** `src/lib/auth-client.ts` usa `PUBLIC_BETTER_AUTH_URL` (variable de cliente declarada
en `astro.config.mjs`). Seteá en el `.env` **ambas** al dominio público:

```bash
BETTER_AUTH_URL=https://dev.cosmospay.lat
PUBLIC_BETTER_AUTH_URL=https://dev.cosmospay.lat
```

> `PUBLIC_BETTER_AUTH_URL` se incrusta en build → después de cambiarla, **rebuild**.

También se agregó `dev.cosmospay.lat` a `vite.server.allowedHosts` en `astro.config.mjs`
(solo aplica si corrés `astro dev` detrás del dominio).

---

## 2. Error de red al loguear — dominio equivocado

**Síntoma:** la request va a `https://dev.cosmosapp.lat/...` pero el sitio es
`https://dev.cosmospay.lat/`.

**Causa:** typo en la env de producción: `cosmosapp` en vez de `cosmospay`.

**Fix:** corregí el dominio en `BETTER_AUTH_URL` / `PUBLIC_BETTER_AUTH_URL` y **rebuild**.

---

## 3. `INVALID_OAUTH_CONFIGURATION` (HTTP 400 en `/sign-in/oauth2`)

**Síntoma:** al loguear, 400 con `{ code: "INVALID_OAUTH_CONFIGURATION" }`.

**Causa:** Better Auth no pudo resolver el discovery de Authentik. En prod `AUTHENTIK_DISCOVERY_URL`
apuntaba a `localhost` y/o usaba el slug viejo (`cosmos` en vez de `cosmos-pay`).

**Fix:** en el `.env` de producción:

```bash
AUTHENTIK_DISCOVERY_URL=https://auth.cosmospay.lat/application/o/cosmos-pay/.well-known/openid-configuration
```

Verificá que responda con `authorization_endpoint`:

```bash
curl -s https://auth.cosmospay.lat/application/o/cosmos-pay/.well-known/openid-configuration | head -c 300
```

Confirmá también que el **Redirect URI** del provider en Authentik incluya:
`https://dev.cosmospay.lat/api/auth/oauth2/callback/ak`

---

## 4. Cloudflare bloquea las llamadas server-to-server a Authentik

**Síntoma:** `[Better Auth] ... { status: 403 }` o `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
(o pantalla "Just a moment..." de Cloudflare) al resolver discovery/token.

**Causa:** Cloudflare le tira un **Managed Challenge** a la request del servidor (no es un
navegador, no puede resolver el JS). En plan **Free** no se puede exceptuar por regla WAF.

**Fix aplicado (mantiene Cloudflare delante de Authentik):** que el servidor hable con
Authentik **local**, salteando Cloudflare, vía `/etc/hosts`:

```bash
echo "127.0.0.1   auth.cosmospay.lat" | sudo tee -a /etc/hosts
```

nginx local sirve un **Cloudflare Origin Certificate** que Node no confía → agregá el root CA
de Cloudflare (sin desactivar TLS):

```bash
sudo curl -fsSL https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem -o /etc/ssl/certs/cloudflare_origin_root.pem
sudo curl -fsSL https://developers.cloudflare.com/ssl/static/origin_ca_ecc_root.pem | sudo tee -a /etc/ssl/certs/cloudflare_origin_root.pem >/dev/null
```

El `ecosystem.config.cjs` ya setea `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/cloudflare_origin_root.pem`.
Probá:

```bash
curl --cacert /etc/ssl/certs/cloudflare_origin_root.pem -i https://auth.cosmospay.lat/application/o/cosmos-pay/.well-known/openid-configuration
```

**Alternativa (más limpia):** poné `auth.cosmospay.lat` en **DNS only (nube gris)** en
Cloudflare + cert Let's Encrypt (`sudo certbot --nginx -d auth.cosmospay.lat`). Sin `/etc/hosts`
ni `NODE_EXTRA_CA_CERTS`. Trade-off: ese subdominio pierde el escudo de Cloudflare.

> ⚠️ Nunca uses `NODE_TLS_REJECT_UNAUTHORIZED=0`: desactiva la verificación TLS para **todas**
> las conexiones salientes de la app.

---

## 5. Prisma: `Environment variable not found: DATABASE_URL` (HTTP 500)

**Síntoma:** 500 en `/api/auth/sign-in/oauth2`; en `pm2 logs devplat --err`:
`Environment variable not found: DATABASE_URL`.

**Causa:** PM2 no carga el `.env` en `process.env`. Astro lee sus vars del archivo, pero el
motor de Prisma lee `process.env` → no encuentra `DATABASE_URL`.

**Fix:** arrancar con **`ecosystem.config.cjs`** (en el repo), que carga el `.env` con dotenv y
lo inyecta al proceso:

```bash
npm install            # asegura dotenv
pm2 delete devplat
pm2 start ecosystem.config.cjs --only devplat
pm2 save
```

Verificá:

```bash
pm2 env 0 | grep DATABASE_URL    # cambiá 0 por el id de devplat
```

> El ecosystem toma una **foto** del `.env` al arrancar. Si cambiás el `.env`, hacé
> `pm2 delete` + `pm2 start` (un `pm2 restart` no re-lee el archivo).

---

## 6. Dev vs Producción (build)

`ecosystem.config.cjs` define **dos apps** que comparten el `.env`:

```bash
# Producción (build compilado)
npm run build
pm2 start ecosystem.config.cjs --only devplat

# Desarrollo (astro dev + hot reload)
pm2 start ecosystem.config.cjs --only devplat-dev
```

⚠️ Las dos usan el puerto `4321` → **no corras ambas a la vez**. Siempre con `--only`.
Sin `--only`, PM2 levanta las dos y se pisan.

---

## 7. `Database cosmos_devplatform does not exist`

**Síntoma:** Prisma conecta pero la base no existe. (`psql` puede decir que "ya existe" si
mirás **otro** Postgres distinto al que usa la app.)

**Causa:** la base/tablas no se inicializaron en el Postgres al que apunta `DATABASE_URL`.

**Fix:** aplicá el schema con la **misma** `DATABASE_URL` de la app (crea base + tablas):

```bash
cd /home/ubuntu/CosmosPay-Developer-Platform
npm run db:push
```

Verificá:

```bash
# si Postgres es local en TCP
psql "postgresql://USER:PASS@localhost:5432/cosmos_devplatform" -c "\dt"
```

> Tip: si `psql` por socket dice "existe" pero Prisma dice "no existe", estás mirando dos
> instancias distintas. `npm run db:push` siempre usa la conexión real de la app.

---

## 8. APISIX: `Failed to sync route "cosmos-api-keys"` al arrancar

**Síntoma:** warning al boot; o **error interno** al usar la sección de API Keys.

**Causa:** `APISIX_URL` apuntaba al **Admin API por el dominio público**
(`https://api.cosmospay.lat/apisix/admin`) → Cloudflare lo challengea. El Admin API no debe
pasar por Cloudflare ni estar expuesto.

**Fix:** apuntá el Admin API al **APISIX local**:

```bash
APISIX_URL=http://127.0.0.1:9180/apisix/admin
```

Probá:

```bash
curl -i -H "X-API-KEY: <APISIX_ADMIN_KEY>" http://127.0.0.1:9180/apisix/admin/routes
```

Reiniciá re-leyendo el `.env` (`pm2 delete devplat && pm2 start ecosystem.config.cjs --only devplat`).
En logs debería decir `Route "cosmos-api-keys" created/updated`.

> Seguridad: dejá colgando de `api.cosmospay.lat` **solo el gateway (data plane, 9080)**, nunca
> el `/apisix/admin` (9180).

---

## 9. Cloudflare challengea la API pública (clientes no pueden llamar)

**Síntoma:** `HTTP/2 403` + `cf-mitigated: challenge` + "Just a moment..." al llamar
`https://api.cosmospay.lat/cosmos-api/...` con curl/SDK. Desde el navegador "funciona"
(resuelve el challenge solo).

**Causa:** una API programática **no puede** estar detrás de un Managed Challenge /
Bot Fight Mode: los clientes no ejecutan JavaScript.

**Fix (elegir uno):**
- **A — mantener Cloudflare:** Security → Bots → **Bot Fight Mode = Off**; Security → Settings →
  **Security Level = Essentially Off**.
- **B — recomendado para API:** poné `api.cosmospay.lat` en **DNS only (nube gris)** + cert
  Let's Encrypt. Sin challenge nunca. Trade-off: perdés el escudo de Cloudflare en ese host.

> Tener challenge activo **y** API funcionando en simultáneo requiere plan **Pro/Business**
> (Super Bot Fight Mode / API Shield con excepciones).

---

## 10. APISIX: "missing API key" — soportar `apikey`, `Authorization` y `Bearer`

**Síntoma:** APISIX responde "missing API key" aunque mandás la credencial.

**Causa:** el plugin `key-auth` lee por defecto el header **`apikey`**; el cliente mandaba la key
en `Authorization`.

**Fix:** la ruta (`src/utils/apisix.ts` → `createRoute`) ahora tiene una `serverless-pre-function`
(fase `rewrite`, corre antes de `key-auth`) que normaliza la credencial. Acepta las tres formas:

```
apikey: <key>
Authorization: <key>
Authorization: Bearer <key>
```

Después de cambiar el código: **rebuild + restart**. La ruta se re-crea sola con un `PUT` al
arrancar. Probá las tres:

```bash
KEY=<tu_api_key>
URL=https://api.cosmospay.lat/cosmos-api/v1/payment-intents/pay
curl -i -H "apikey: $KEY" "$URL"
curl -i -H "Authorization: $KEY" "$URL"
curl -i -H "Authorization: Bearer $KEY" "$URL"
```

> El upstream nunca ve la credencial: `key-auth` con `hide_credentials: true` + `proxy-rewrite`
> que remueve `Authorization`/`apikey`/`X-API-KEY`.

---

## 11. APISIX devuelve `502 Bad Gateway` (no llega al upstream)

**Síntoma:** con key correcta, **502**. (Con key incorrecta, el auth rechaza bien → el problema
es el upstream, no el auth.)

**Causa:** **APISIX está en Docker** y el upstream era `http://127.0.0.1:3000`. Dentro del
contenedor, `127.0.0.1` es el **propio contenedor**, no el host donde corre el Cosmos API.

**Diagnóstico:**

```bash
# Red y gateway del contenedor de APISIX (IP del host vista desde adentro)
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} -> {{$v.Gateway}}{{println}}{{end}}' apisix-quickstart
# → ej: apisix_apisix -> 172.20.0.1

# El Cosmos API debe escuchar en 0.0.0.0 (NestJS lo anuncia si lista varias IPs de red)
sudo ss -tlnp | grep 3000

# Test de conectividad contenedor→host SIN wget (la imagen no lo trae):
docker exec apisix-quickstart bash -c 'timeout 3 bash -c "echo > /dev/tcp/172.20.0.1/3000" && echo OPEN || echo "CLOSED/TIMEOUT"'
```

**Causa final del timeout:** `ufw` dropeaba el tráfico de la subred Docker hacia el `3000` del
host (TIMEOUT, no "refused").

**Fix:**

```bash
# subred exacta de la red de APISIX
docker network inspect apisix_apisix -f '{{range .IPAM.Config}}{{.Subnet}}{{end}}'

# abrir el firewall para esa subred (ajustá a la real)
sudo ufw allow from 172.20.0.0/16 to any port 3000 proto tcp
sudo ufw reload
```

Apuntá el upstream a la gateway y re-sincronizá la ruta:

```bash
# .env
COSMOS_API_URL=http://172.20.0.1:3000

cd /home/ubuntu/CosmosPay-Developer-Platform
pm2 delete devplat && pm2 start ecosystem.config.cjs --only devplat && pm2 save
```

Verificá el upstream de la ruta:

```bash
curl -s -H "X-API-KEY: <admin-key>" http://127.0.0.1:9180/apisix/admin/routes/cosmos-api-keys | grep -o '"nodes":{[^}]*}'
```

**Notas:**
- Path: `COSMOS_API_ENTRY=/cosmos-api/*` reescribe a `/$1`, así
  `…/cosmos-api/v1/payment-intents/pay` → `/v1/payment-intents/pay` en el upstream. ✅
- Opción estable (no depende de la IP del bridge): en el compose de APISIX agregá
  `extra_hosts: ["host.docker.internal:host-gateway"]` y usá
  `COSMOS_API_URL=http://host.docker.internal:3000`.
- **Seguridad:** el `3000` debe estar abierto **solo** para la subred Docker, nunca al público.

---

## Checklist rápido de un deploy sano

```bash
# 1. Código y deps
git pull && npm install

# 2. .env de producción con dominios públicos y URLs internas correctas:
#    BETTER_AUTH_URL / PUBLIC_BETTER_AUTH_URL = https://dev.cosmospay.lat
#    AUTHENTIK_DISCOVERY_URL = https://auth.cosmospay.lat/application/o/cosmos-pay/.well-known/...
#    APISIX_URL  = http://127.0.0.1:9180/apisix/admin
#    COSMOS_API_URL = http://<gateway-docker>:3000   (o host.docker.internal)
#    DATABASE_URL = ...

# 3. DB
npm run db:push

# 4. Build (incrusta las PUBLIC_*) y arranque
npm run build
pm2 delete devplat && pm2 start ecosystem.config.cjs --only devplat && pm2 save

# 5. Verificación
pm2 logs devplat --lines 30          # sin errores; route created
# login en https://dev.cosmospay.lat  → OK
# curl -H "apikey: <key>" https://api.cosmospay.lat/cosmos-api/v1/...  → respuesta del API
```

### Pre-requisitos de infra (una sola vez)
- `/etc/hosts`: `127.0.0.1 auth.cosmospay.lat` (bypass Cloudflare server-to-server).
- `/etc/ssl/certs/cloudflare_origin_root.pem` (root CA de Cloudflare Origin).
- `ufw`: permitir la subred Docker → `3000`.
- Cosmos API escuchando en `0.0.0.0:3000`.
- Cloudflare: `api.cosmospay.lat` sin Managed Challenge (nube gris o Bot Fight Mode off).
- Authentik: Redirect URI `https://dev.cosmospay.lat/api/auth/oauth2/callback/ak`.
