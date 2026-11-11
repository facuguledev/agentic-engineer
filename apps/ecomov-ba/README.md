# ECOMOV BA · app móvil

Versión para celular del prototipo "ECOMOV BA Superficie" (movilidad de superficie, Buenos Aires 2040).
Es una PWA: pantalla completa, instalable en el teléfono y funciona sin conexión. Sin build ni dependencias:
HTML + CSS + JS, con fuentes, íconos y librerías (`qrcode-generator`, `jsQR`) incluidas en la carpeta.

## Probarla

```bash
cd apps/ecomov-ba
python3 -m http.server 8080      # o cualquier servidor estático
```

- En la compu: `http://localhost:8080`.
- En el celular hace falta **HTTPS** (cámara para el QR, service worker e instalación). Opciones: publicar la carpeta
  en cualquier hosting estático, o abrir un túnel HTTPS al puerto local.
- Android (Chrome): menú ⋮ → *Instalar app*. iPhone (Safari): Compartir → *Agregar a inicio*.

## Qué cambió respecto al artefacto

- Sin tablero, marco de teléfono ni barra de estado simulada: la app ocupa toda la pantalla y respeta notch y barra de gestos.
- El color de la barra del sistema acompaña la pantalla (verde / naranja / amarillo mientras pedaleás).
- La pantalla no se apaga durante el viaje (Wake Lock, donde el navegador lo soporte).
- Puntos y pases canjeados se guardan en el dispositivo (`localStorage`).
- Botón **QR de prueba** en el escáner, para recorrer el flujo sin un QR físico.
- La pestaña *Perfil* todavía no existe en el diseño: avisa "llega en la próxima versión".

## Sigue siendo un prototipo

Estaciones, disponibilidad, ubicación y recorrido son datos de ejemplo; el viaje se simula 12 veces más rápido.
Para una app real faltan GPS, backend de estaciones/vehículos y autenticación.
