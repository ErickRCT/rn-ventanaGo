# VentanaGo · App móvil (React Native + Expo)

App Android de VentanaGo para diseñar, cotizar y pedir ventanas de aluminio, con **realidad aumentada** para ver la ventana sobre la pared a tamaño real. Reemplaza al front web (`njs-ventanaGo`) y usa el **mismo backend en Render** (`ms-ventanaGo`) y la misma base de datos en **TiDB Cloud**: no hubo cambios en el servidor.

## Una sola app, tres roles

Al iniciar sesión, la app muestra el menú según el rol de la cuenta (el servidor valida cada permiso):

| Rol | Pantallas |
|---|---|
| **Cliente** | Diseñar ventana (con precio estimado y realidad aumentada), Carrito, Mis cotizaciones |
| **Empresa / proveedor** | Solicitudes: aceptar con precio, modificar medidas o rechazar, y avisar al cliente |
| **Administrador** | Inicio, Crear cotización (con PDF de cotización y orden de trabajo), Cotizaciones, Clientes, Pautas, Tipos de pauta, Perfiles, Tipos de perfil, Quincallería, Vidrios, Colores y Series. También ve las pantallas de Cliente y Empresa. |

Se eligió una sola app (y no tres) porque comparten el login, el catálogo, los servicios y el dibujo de la ventana: un solo APK que mantener, y los permisos los sigue controlando el backend.

> **Venta al público (accesorios)** no se incluyó: el front web llamaba a `/catalogo/...` y `/api/images/upload`, que no existen en el backend actual.

## Realidad aumentada (solo Android)

- Usa **ARCore** a través de [ViroReact](https://github.com/ReactVision/viro) (`@reactvision/react-viro`).
- La ventana se construye en el teléfono con las medidas, el color y el vidrio elegidos (misma geometría que el dibujo de vista previa, en `src/ventana/geometria.ts`), a escala 1:1.
- La cámara detecta paredes; el usuario toca una y la ventana queda pegada en ese punto, derecha. Se puede girar o cambiar de lugar.
- Antes de abrirla, la app revisa el teléfono (`src/ar/soporte.ts`). Si **no** puede usarla, el botón queda bloqueado y se muestra el motivo:
  - no es Android (iPhone u otro),
  - Android anterior a 7.0,
  - el teléfono no es compatible con ARCore (Servicios de Google Play para RA),
  - no se pudo confirmar ARCore (sin conexión o sin los servicios instalados),
  - se negó el permiso de cámara.
- ARCore está declarado como **opcional**, así que la app se instala también en teléfonos sin ARCore (todo lo demás funciona).

## Configuración

`app.json` → `expo.extra`:

- `apiBaseUrl`: backend (por defecto `https://ventanago-api.onrender.com`).
- `imagenBaseUrl`: de dónde se leen las imágenes del catálogo (por defecto el front web en Vercel, carpeta `pautas/`).

## Desarrollo

```bash
npm install
npx expo run:android      # compila e instala una versión de desarrollo en un teléfono o emulador
npm run typecheck
npm run lint
```

> La realidad aumentada usa código nativo, así que **no funciona en Expo Go**: hay que usar `expo run:android` o un APK.

## Generar el APK para descargar e instalar

### Opción A: en la nube con EAS (no necesita Android Studio)

```bash
npm install -g eas-cli
eas login                 # cuenta gratuita de https://expo.dev
eas build -p android --profile preview
```

Al terminar (10 a 20 minutos), EAS entrega un enlace y un código QR para descargar el `.apk`. El perfil `preview` de `eas.json` genera APK; `production` genera el `.aab` para Google Play.

### Opción B: en el computador (Android Studio / Android SDK + JDK 17 o superior)

```bash
npx expo prebuild -p android
cd android
gradlew assembleRelease
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.

> Este APK se firma con la clave de depuración que genera Expo: sirve para instalarlo directamente en los teléfonos, pero para publicarlo en Google Play hay que firmarlo con una clave propia (EAS lo hace automáticamente).

### Instalarlo en el teléfono

1. Copia el `.apk` al teléfono (cable, Drive, WhatsApp o el enlace de EAS).
2. Ábrelo y acepta **Instalar apps de origen desconocido** cuando Android lo pida.
3. Abre **VentanaGo** e inicia sesión con tu usuario.

## Estructura

```
src/
  app/                 Pantallas (Expo Router)
    login.tsx
    realidad-aumentada.tsx
    (app)/             Menú lateral por rol y pantallas de cada módulo
  api/                 Llamadas al backend (catálogo, cotizaciones, solicitudes, sesión)
  ar/                  Realidad aumentada: soporte del teléfono, escena de Viro, botón
  admin/               Mantenedor genérico y formularios del administrador
  empresa/             Respuesta a solicitudes
  ventana/             Geometría, dibujo SVG y reglas del catálogo (forma, hojas, límites)
  ui/                  Componentes compartidos (tema, campos, selector, mensajes)
```
