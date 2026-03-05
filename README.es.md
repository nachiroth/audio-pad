# Audio Pad

Audio Pad es una mesa de sonido de escritorio, offline-first, para disparar cues y reproducir audio rápidamente.

Construido con `Tauri 2 + React + TypeScript + Web Audio API`.

## Funcionalidades

- Múltiples pads de audio con ordenamiento drag-and-drop
- Volumen independiente por pad
- Transiciones de fade in/out
- Auto fade out al cambiar de pad
- Normalización de volumen basada en RMS+pico (con límite de headroom)
- Detener todo, silenciar, pantalla completa y atajos de teclado
- Interfaz en inglés y español
- Persistencia local (`IndexedDB` para audio, `localStorage` para metadatos/configuración)

## Tipos de archivo soportados

La app acepta estas extensiones al importar:

- `.mp3`, `.mpeg`, `.mpga`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.webm`, `.flac`, `.wma`, `.opus`

Tamaño máximo: `50MB` por archivo.

Nota: Los audios se cargan tal cual. No hay conversión de formato integrada.
Si un archivo local previamente guardado no está disponible, el pad queda en error y puede reimportarse.

## Atajos de teclado

- `ESPACIO`: Reproducir/Pausar pad activo
- `S`: Detener pad activo
- `M`: Silenciar/Activar todo
- `F`: Alternar pantalla completa
- `H`: Alternar panel de configuración

## Desarrollo

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## Releases en GitHub (Windows/macOS/Linux)

Este repo incluye un workflow de GitHub Actions en `.github/workflows/tauri-build.yml`.

- Disparador: push de un tag como `v1.0.0`
- Resultado: GitHub Release en borrador con artefactos desktop para Windows, macOS y Linux

Ejemplo:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Licencia

MIT - ver [LICENSE](LICENSE)
