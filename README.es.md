# Audio Pad

Audio Pad es una mesa de sonido de escritorio, offline-first, para disparar cues y reproducir audio rápidamente.

Construido con `Tauri 2 + React + TypeScript + Web Audio API`.

## Funcionalidades

- Múltiples pads de audio con ordenamiento drag-and-drop
- Volumen independiente por pad
- Transiciones de fade in/out
- Auto fade out al cambiar de pad
- Detener todo, silenciar, pantalla completa y atajos de teclado
- Interfaz en inglés y español
- Persistencia local (`IndexedDB` para audio, `localStorage` para metadatos/configuración)

## Tipos de archivo soportados

La app acepta estas extensiones al importar:

- `.mp3`, `.mpga`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.webm`, `.flac`, `.wma`, `.opus`

Tamaño máximo: `50MB` por archivo.

Nota: Los audios se cargan tal cual. No hay conversión de formato integrada.

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

## Licencia

MIT - ver [LICENSE](LICENSE)
