# Apps instalables: el diseño

Hoy un tercero que quiere extender Cosmos tiene una sola herramienta: llamar a
la API desde su propio servidor, con una API key que le dio un comerciante.

Eso alcanza para automatizar. No alcanza para **aparecer**. Una app no puede
poner nada en la pantalla de un comerciante ni de un comprador, y no hay forma
de que un tercero publique algo que otros instalen.

Este documento propone el modelo mínimo para cerrar ese hueco, construido sobre
lo que ya existe en vez de al lado.

## Lo que ya está resuelto y hay que reusar

**El vocabulario de permisos.** `OrganizationMember.permissions` ya define los
alcances del producto:

```
apiKeysTest | apiKeysLive | webhooks | products | customers | payments
```

Una app pide de esa misma lista. Inventar un set paralelo de permisos para apps
significa que el día que agregues `refunds` haya que agregarlo en dos lugares y
que un auditor tenga que leer dos tablas para saber quién puede tocar qué.

**La entrega de credenciales a un cliente sin secreto.** `WalletRegistration`
ya lo resuelve: firma que prueba control de la cuenta, confirmación por email, y
un token de un solo uso del que sólo se guarda el SHA-256. La instalación de una
app tiene exactamente esa forma, y conviene que use el mismo mecanismo y no uno
nuevo con sus propios errores.

**La organización como unidad.** Una app no se instala en un usuario, se instala
en una `Organization`. Eso ya está bien modelado.

## Los modelos

Tres tablas. No más, porque cada tabla de más es una superficie que auditar.

```prisma
// Una app publicada por un tercero. Existe una vez, no una por instalacion.
model App {
  id            String   @id @default(cuid())
  // El slug es lo que aparece en las URLs y en el manifiesto; no cambia nunca.
  slug          String   @unique
  name          String
  description   String?
  // La organizacion que la publica. Un partner es una organizacion como
  // cualquier otra, y eso deja que un comerciante publique su propia app sin
  // que haya un tipo de cuenta nuevo.
  publisherId   String
  // A donde se manda al comerciante para autorizar la instalacion.
  installUrl    String
  // Donde vive la interfaz, si tiene. Su origen es el unico que el puente
  // acepta, asi que se valida al publicar y no en cada carga.
  appUrl        String?
  // De la misma lista que OrganizationMember.permissions. Lo que la app pide.
  scopes        String[] @default([])
  // draft | review | published | suspended
  status        String   @default("draft")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  publisher     Organization  @relation("AppPublisher", fields: [publisherId], references: [id], onDelete: Cascade)
  installations AppInstall[]

  @@index([publisherId])
  @@index([status])
  @@map("app")
}

// Una app instalada en una organizacion. Es lo que se revoca.
model AppInstall {
  id        String   @id @default(cuid())
  appId     String
  orgId     String
  // Lo que el comerciante efectivamente concedio. Puede ser menos que
  // App.scopes: una app que pide seis cosas y recibe dos tiene que funcionar
  // con dos, o fallar diciendo cual le falta.
  scopes    String[] @default([])
  // Quien apreto instalar. Sirve para saber a quien preguntarle despues.
  installedBy String
  // SHA-256 del secreto de la app para esta instalacion. El secreto crudo se
  // entrega una vez y no se guarda, igual que en WalletRegistration.
  secretHash String
  status    String   @default("active")   // active | suspended | uninstalled
  createdAt DateTime @default(now())
  revokedAt DateTime?

  app       App          @relation(fields: [appId], references: [id], onDelete: Cascade)
  org       Organization @relation("OrgInstalls", fields: [orgId], references: [id], onDelete: Cascade)
  user      User         @relation("AppInstaller", fields: [installedBy], references: [id])

  @@unique([appId, orgId])
  @@index([orgId])
  @@map("app_install")
}

// Donde la app pide aparecer. Una fila por lugar.
model AppSurface {
  id        String   @id @default(cuid())
  appId     String
  // dashboard:page | dashboard:widget | payment:slot
  kind      String
  // La ruta dentro de appUrl que se carga para esta superficie.
  path      String
  // Como se muestra en el menu o en el encabezado del widget.
  label     String
  createdAt DateTime @default(now())

  app       App @relation(fields: [appId], references: [id], onDelete: Cascade)

  @@index([appId])
  @@map("app_surface")
}
```

## Las superficies, y cuál no existe

Cosmos no es Tiendanube y sus superficies no son las mismas. Acá hay tres
lugares posibles y **uno de ellos conviene dejarlo cerrado**.

### `dashboard:page`: una página propia en el panel

La app ocupa una ruta del panel del comerciante y dibuja lo que quiera. Es la
superficie más grande y la más fácil de dar: el panel lo usa una persona
autenticada, en sesión larga, sobre su propia organización.

Va en un iframe. Cuesta un documento anidado y no importa: nadie mide la
conversión de un panel de administración. A cambio la app usa el framework que
quiera.

El puente ya está escrito: [`cosmos-app-bridge`](https://github.com/CosmosPay/cosmos-app-bridge).

### `dashboard:widget`: una tarjeta dentro de una página tuya

Más chica y más útil de lo que parece: una app de contabilidad que quiere
mostrar el estado de la conciliación al lado de los pagos, sin que el
comerciante tenga que ir a otra pantalla.

Mismo iframe, mismo puente, tamaño acotado.

### `payment:slot`: **no, todavía no**

Es tentador y es donde no hay que meterse primero.

La página de pago es el producto. Cualquier cosa que corra ahí puede leer un
monto, puede tapar un botón, y puede tardar. Un iframe de terceros en el camino
del pago suma un origen más al CSP, un punto de falla al render, y una superficie
nueva de la que responder ante quien te audite.

Si algún día hace falta, la forma es la del runtime declarativo: la app describe
y vos dibujás, con una lista blanca de qué puede describir. Eso ya está escrito
en [`cosmos-app-runtime`](https://github.com/CosmosPay/cosmos-app-runtime).
Pero es una decisión posterior, con su propia discusión.

**Recomendación: empezar sólo con las dos del dashboard.** Son el 90% del valor
y el 10% del riesgo.

## El flujo de instalación

Reusa la forma de `WalletRegistration`, que ya está probada:

```
1. El comerciante entra a la app desde el directorio y aprieta instalar.
2. Cosmos le muestra qué permisos pide, en el mismo lenguaje que ya usa para
   los permisos de un colaborador. Puede desmarcar los que no quiera.
3. Al confirmar, se crea el AppInstall y se genera un secreto.
4. El secreto crudo viaja UNA vez al installUrl de la app. Se guarda sólo el
   SHA-256.
5. La app usa ese secreto para pedir tokens acotados a esa instalación.
```

Lo importante del paso 2: **los permisos concedidos pueden ser menos que los
pedidos.** Una app que asume que recibió todo lo que pidió se rompe en
producción con el primer comerciante cauteloso. La API tiene que devolver un
error que diga qué alcance falta, no un 403 mudo.

## Qué NO hay que hacer

**Un tipo de cuenta nuevo para partners.** Un partner es una organización. Si
hacés una entidad aparte, terminás con dos sistemas de login, dos de facturación
y dos de soporte.

**Un set de permisos propio de apps.** Ya existe el vocabulario. Si una app
necesita un alcance que no está, el alcance falta en el producto, no en las apps.

**Revisión manual desde el día uno.** El campo `status` deja lugar para
`review`, pero con cero apps publicadas un proceso de revisión es burocracia
sobre un conjunto vacío. Arrancar en `published` directo para apps de
organizaciones verificadas por KYC, que ya tenés.

## Lo mínimo que se puede probar

1. Las tres tablas y su migración.
2. Una app de ejemplo, publicada por una organización de prueba, con una sola
   superficie `dashboard:page`.
3. La ruta del panel que la carga en un iframe con el puente conectado.
4. Que pida el token de sesión por el puente y liste los productos de esa
   organización con él.

Si eso funciona de punta a punta, el modelo está bien. Todo lo demás es agregar
filas a `AppSurface`.
