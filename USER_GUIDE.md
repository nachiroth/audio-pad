# Audio Pad - User Guide

## Getting Started

1. Open the app.
2. Click **Add Pad** (`+` button in the bottom-right).
3. Select one or more audio files.

Accepted extensions: `mp3`, `mpeg`, `mpga`, `wav`, `ogg`, `m4a`, `aac`, `webm`, `flac`, `wma`, `opus`  
Max size: `50MB` per file.

## Playback Controls

- **Play/Pause**: Toggle playback on the pad.
- **Stop**: Stops and resets the pad to `00:00`.
- **Fade Out**: Fades down then pauses.
- **Stop All**: Stops all pads from the top bar.

Only one pad plays at a time. If **Auto Fade Out on Switch** is enabled, switching pads fades out the previous one.

## Pad Management

- **Rename**: Double-click the pad name or use the edit button.
- **Reorder**: Drag and drop pads.
- **Delete**: Use the trash button and confirm.
- **Per-pad volume**: Use the slider on each pad.

## Top Bar

- **Language**: Switch between English/Spanish.
- **Mute**: Mute/unmute all currently playing audio.
- **Fullscreen**: Enter/exit fullscreen.
- **Settings**: Open the settings drawer.

## Settings

### Audio
- **Default Volume**
- **Fade Duration**
- **Auto Fade Out on Switch**
- **Volume Normalization**

### Appearance
- Select one of the built-in color palettes.

### General
- **Reset**: Clears all pads and restores default settings.

## Keyboard Shortcuts

- `SPACE`: Play/Pause active pad
- `S`: Stop active pad
- `M`: Mute/Unmute all
- `F`: Toggle fullscreen
- `H`: Toggle settings drawer

## Data Persistence

- Audio files are stored locally in `IndexedDB`.
- Pad metadata and settings are stored in `localStorage`.
- The app works offline.
- If a local file is no longer available in storage, the pad is marked as error and should be re-imported.

## Troubleshooting

### Audio file fails to load
- Verify the file extension is supported.
- Check if the file is corrupted by opening it in another player.

### No sound
- Check system volume/mute.
- Click the app once to ensure the browser audio context is activated.
