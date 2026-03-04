# Audio Pad

Audio Pad is an offline-first desktop soundboard for live cues and quick playback.

Built with `Tauri 2 + React + TypeScript + Web Audio API`.

## Features

- Multiple audio pads with drag-and-drop sorting
- Per-pad volume control
- Fade in/out transitions
- Auto fade out when switching pads
- Stop all, mute, fullscreen, and keyboard shortcuts
- English and Spanish UI
- Local persistence (`IndexedDB` for audio files, `localStorage` for metadata/settings)

## Supported File Types

The app accepts these extensions on import:

- `.mp3`, `.mpga`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.webm`, `.flac`, `.wma`, `.opus`

Maximum file size: `50MB` per file.

Note: Audio files are loaded as-is. There is no built-in format conversion.

## Keyboard Shortcuts

- `SPACE`: Play/Pause active pad
- `S`: Stop active pad
- `M`: Mute/Unmute all
- `F`: Toggle fullscreen
- `H`: Toggle settings drawer

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## License

MIT - see [LICENSE](LICENSE)
