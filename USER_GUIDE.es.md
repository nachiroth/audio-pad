# Audio Pad - Guía de Usuario

## Primeros pasos

1. Abrí la app.
2. Hacé clic en **Agregar Pad** (botón `+` abajo a la derecha).
3. Seleccioná uno o más archivos de audio.

Extensiones aceptadas: `mp3`, `mpeg`, `mpga`, `wav`, `ogg`, `m4a`, `aac`, `webm`, `flac`, `wma`, `opus`  
Tamaño máximo: `50MB` por archivo.

## Controles de reproducción

- **Reproducir/Pausar**: alterna reproducción del pad.
- **Detener**: detiene y vuelve a `00:00`.
- **Fade Out**: baja el volumen gradualmente y pausa.
- **Detener Todo**: detiene todos los pads desde la barra superior.

Solo un pad reproduce a la vez. Si **Auto Fade Out al Cambiar** está activo, al iniciar otro pad se desvanece el anterior.

## Gestión de pads

- **Renombrar**: doble clic en el nombre o botón de editar.
- **Reordenar**: arrastrar y soltar.
- **Eliminar**: botón de papelera + confirmación.
- **Volumen por pad**: slider individual en cada pad.

## Barra superior

- **Idioma**: cambiar entre inglés/español.
- **Silencio**: silenciar/activar todo el audio en reproducción.
- **Pantalla completa**: entrar/salir.
- **Configuración**: abrir panel lateral.

## Configuración

### Audio
- **Volumen Predeterminado**
- **Duración del Fade**
- **Auto Fade Out al Cambiar**
- **Normalización de Volumen**

### Apariencia
- Elegí una de las paletas de color disponibles.

### General
- **Reset**: borra todos los pads y restaura la configuración por defecto.

## Atajos de teclado

- `ESPACIO`: Reproducir/Pausar pad activo
- `S`: Detener pad activo
- `M`: Silenciar/Activar todo
- `F`: Alternar pantalla completa
- `H`: Alternar panel de configuración

## Persistencia de datos

- Los archivos de audio se guardan en `IndexedDB`.
- Metadatos y configuración se guardan en `localStorage`.
- La app funciona offline.
- Si un archivo local ya no está disponible en almacenamiento, el pad pasa a error y debe volver a importarse.

## Solución de problemas

### El archivo no carga
- Verificá que la extensión esté soportada.
- Revisá si el archivo está dañado probándolo en otro reproductor.

### No se escucha audio
- Verificá volumen/silencio del sistema.
- Hacé clic en la app para asegurar la activación del contexto de audio.
