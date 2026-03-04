import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Window } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAudioPads, AudioPad } from "./hooks/useAudioPads";
import { PAD_PALETTES } from "./theme/m3-theme";
import "./App.css";

// ─── Accent CSS variable injector ──────────────────────────────────────────────
function useAccentSync(primary: string) {
  useEffect(() => {
    const hex = primary.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    document.documentElement.style.setProperty("--sp-accent", primary);
    document.documentElement.style.setProperty(
      "--sp-accent-rgb",
      `${r}, ${g}, ${b}`,
    );
    document.documentElement.style.setProperty(
      "--sp-accent-dim",
      `rgba(${r}, ${g}, ${b}, 0.15)`,
    );
  }, [primary]);
}

// ─── App ───────────────────────────────────────────────────────────────────────
function App() {
  const {
    pads,
    settings,
    activePadId,
    isMuted,
    addPad,
    removePad,
    updatePadName,
    updatePadVolume,
    reorderPads,
    playPad,
    pausePad,
    stopPad,
    stopAllPads,
    toggleMute,
    updateSettings,
    resetAllPads,
  } = useAudioPads();

  const { t, i18n } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAddPad, setShowAddPad] = useState(false);
  const [editingPadId, setEditingPadId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentPalette = PAD_PALETTES[paletteIndex];
  useAccentSync(currentPalette.primary);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = pads.findIndex((p) => p.id === active.id);
        const newIndex = pads.findIndex((p) => p.id === over.id);
        reorderPads(oldIndex, newIndex);
      }
    },
    [pads, reorderPads],
  );

  // File upload — loads files directly, no conversion
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const validExtensions = [
        ".mp3",
        ".mpga",
        ".wav",
        ".ogg",
        ".m4a",
        ".aac",
        ".webm",
        ".flac",
        ".wma",
        ".opus",
      ];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name}: ${t("messages.fileTooLarge")}`);
          continue;
        }

        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!validExtensions.includes(ext)) {
          alert(`${file.name}: ${t("messages.unsupportedFormat")}`);
          continue;
        }

        const name = file.name.replace(/\.[^/.]+$/, "");
        try {
          await addPad(name, true, file);
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (err) {
          console.error("addPad failed:", err);
        }
      }

      setShowAddPad(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addPad, t],
  );

  // Play/pause
  const handlePlayPause = useCallback(
    (pad: AudioPad, event: React.MouseEvent) => {
      event.stopPropagation();
      if (pad.status === "playing") pausePad(pad.id);
      else if (pad.status === "paused" || pad.status === "ready")
        playPad(pad.id);
    },
    [playPad, pausePad],
  );

  const handleStop = useCallback(
    (padId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      stopPad(padId);
    },
    [stopPad],
  );

  const handleFadeOut = useCallback(
    (padId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      pausePad(padId);
    },
    [pausePad],
  );

  const handleDelete = useCallback(
    (padId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (confirm(t("messages.confirmDelete"))) removePad(padId);
    },
    [removePad, t],
  );

  const handleEditStart = useCallback(
    (pad: AudioPad, event: React.MouseEvent) => {
      event.stopPropagation();
      setEditingPadId(pad.id);
      setEditingName(pad.name);
    },
    [],
  );

  const handleEditSave = useCallback(() => {
    if (editingPadId && editingName.trim())
      updatePadName(editingPadId, editingName.trim());
    setEditingPadId(null);
    setEditingName("");
  }, [editingPadId, editingName, updatePadName]);

  const handleEditCancel = useCallback(() => {
    setEditingPadId(null);
    setEditingName("");
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      const win = Window.getCurrent();
      const fullscreenNow = await win.isFullscreen();
      const nextValue = !fullscreenNow;
      await win.setFullscreen(nextValue);
      setIsFullscreen(nextValue);
    } catch (e) {
      console.error("Failed to toggle fullscreen:", e);
    }
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "es" : "en");
  };

  const handleReset = () => {
    resetAllPads();
    setShowResetConfirm(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          if (activePadId) {
            const pad = pads.find((p) => p.id === activePadId);
            if (pad?.status === "playing") pausePad(activePadId);
            else if (pad) playPad(activePadId);
          }
          break;
        case "s":
          e.preventDefault();
          if (activePadId) stopPad(activePadId);
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "h":
          e.preventDefault();
          setShowSettings((prev) => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activePadId,
    pads,
    pausePad,
    playPad,
    stopPad,
    toggleMute,
    toggleFullscreen,
  ]);

  const playingPad = pads.find(
    (p) => p.id === activePadId && p.status === "playing",
  );

  return (
    <div className="app">
      {/* ── Top Navigation Bar ── */}
      <header className="top-bar">
        <div className="top-bar-brand">
          <div className="top-bar-logo">
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
              <use href="#icon-music-note" />
            </svg>
          </div>
          <span className="top-bar-name">Audio Pad</span>
          <AnimatePresence>
            {playingPad && (
              <motion.div
                key="now-playing"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: 12,
                  padding: "3px 10px 3px 8px",
                  background: "rgba(34,211,160,0.12)",
                  border: "1px solid rgba(34,211,160,0.25)",
                  borderRadius: "var(--r-full)",
                }}
              >
                <WaveformDots active />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--sp-green)",
                    maxWidth: 140,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {playingPad.name}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="top-bar-actions">
          {activePadId && (
            <TopButton
              icon="stop"
              title={t("controls.stopAll")}
              onClick={() => stopAllPads()}
              danger
            />
          )}
          <button
            className="icon-button"
            onClick={toggleLanguage}
            title={t("language.switch")}
            style={{ width: 44, height: 44, position: "relative" }}
          >
            <svg width="22" height="22" fill="currentColor">
              <use href="#icon-language" />
            </svg>
            <span className="lang-badge">
              {i18n.language === "en" ? "EN" : "ES"}
            </span>
          </button>
          <TopButton
            icon={isMuted ? "volume-off" : "volume-on"}
            title={isMuted ? t("controls.unmute") : t("controls.mute")}
            onClick={toggleMute}
            active={isMuted}
          />
          <TopButton
            icon={isFullscreen ? "fullscreen-exit" : "fullscreen"}
            title={
              isFullscreen
                ? t("controls.exitFullscreen")
                : t("controls.fullscreen")
            }
            onClick={toggleFullscreen}
            active={isFullscreen}
          />
          <TopButton
            icon="settings"
            title={t("controls.settings")}
            onClick={() => setShowSettings(!showSettings)}
            active={showSettings}
          />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="pads-container">
          <AnimatePresence mode="wait">
            {pads.length === 0 ? (
              <motion.div
                key="empty"
                className="empty-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="empty-state-icon">
                  <svg width="36" height="36" fill="currentColor">
                    <use href="#icon-music-note" />
                  </svg>
                </div>
                <h2>{t("pads.noPads")}</h2>
                <p>{t("pads.emptyState")}</p>
              </motion.div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <motion.div
                  key="grid"
                  className="pads-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SortableContext
                    items={pads.map((p) => p.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {pads.map((pad, index) => {
                      const palette = PAD_PALETTES[paletteIndex];
                      const padColor =
                        palette.colors?.[
                          index % (palette.colors?.length || 6)
                        ] || palette.primary;
                      return (
                        <SortablePadCard
                          key={pad.id}
                          pad={pad}
                          isActive={activePadId === pad.id}
                          color={padColor}
                          onPlayPause={(e) => handlePlayPause(pad, e)}
                          onStop={(e) => handleStop(pad.id, e)}
                          onDelete={(e) => handleDelete(pad.id, e)}
                          onEditStart={(e) => handleEditStart(pad, e)}
                          editingName={
                            editingPadId === pad.id ? editingName : pad.name
                          }
                          onEditingNameChange={setEditingName}
                          onEditSave={handleEditSave}
                          onEditCancel={handleEditCancel}
                          onFadeOut={(e) => handleFadeOut(pad.id, e)}
                          isEditing={editingPadId === pad.id}
                          onVolumeChange={(v) => updatePadVolume(pad.id, v)}
                        />
                      );
                    })}
                  </SortableContext>
                </motion.div>
              </DndContext>
            )}
          </AnimatePresence>
        </div>

        {/* ── Add Pad FAB ── */}
        <AnimatePresence>
          {!showAddPad && (
            <motion.div
              key="fab"
              className="fab-container"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
            >
              <button
                className="fab"
                onClick={() => setShowAddPad(true)}
                style={{
                  background: currentPalette.primary,
                  color: currentPalette.onPrimary,
                }}
              >
                <svg width="20" height="20" fill="currentColor">
                  <use href="#icon-add" />
                </svg>
                {t("pads.addPad")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Add Pad Modal ── */}
      <AnimatePresence>
        {showAddPad && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddPad(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>{t("pads.addPad")}</h2>
              <div className="modal-content">
                <div className="drop-zone">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileUpload}
                  />
                  <div className="drop-zone-icon">
                    <svg width="40" height="40" fill="currentColor">
                      <use href="#icon-upload" />
                    </svg>
                  </div>
                  <div className="drop-zone-title">{t("pads.dropFiles")}</div>
                  <div className="drop-zone-subtitle">
                    {t("pads.supportedFormats")} · {t("pads.multipleFiles")}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-ghost btn-md"
                  onClick={() => setShowAddPad(false)}
                >
                  {t("controls.cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Drawer ── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              style={{ position: "fixed", inset: 0, zIndex: 199 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />
            <motion.aside
              className="settings-drawer"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="drawer-header">
                <h2>{t("settings.title")}</h2>
                <button
                  className="close-button"
                  onClick={() => setShowSettings(false)}
                  aria-label={t("settings.close")}
                >
                  <svg width="20" height="20" fill="currentColor">
                    <use href="#icon-close" />
                  </svg>
                </button>
              </div>

              <div className="drawer-content">
                {/* Audio */}
                <section className="settings-section">
                  <div className="settings-section-title">
                    {t("settings.audio")}
                  </div>

                  <div className="setting-item">
                    <span className="setting-label">
                      {t("settings.defaultVolume")}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.defaultVolume}
                      onChange={(e) =>
                        updateSettings({
                          defaultVolume: parseFloat(e.target.value),
                        })
                      }
                    />
                    <span className="setting-value">
                      {Math.round(settings.defaultVolume * 100)}%
                    </span>
                  </div>

                  <div className="setting-item">
                    <span className="setting-label">
                      {t("settings.fadeDuration")}
                    </span>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={settings.fadeDuration}
                      onChange={(e) =>
                        updateSettings({
                          fadeDuration: parseFloat(e.target.value),
                        })
                      }
                    />
                    <span className="setting-value">
                      {settings.fadeDuration.toFixed(1)}s
                    </span>
                  </div>

                  <div className="setting-item">
                    <span className="setting-label">
                      {t("settings.autoFadeOut")}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.autoFadeOut}
                      onChange={(e) =>
                        updateSettings({ autoFadeOut: e.target.checked })
                      }
                    />
                  </div>

                  <div className="setting-item">
                    <span className="setting-label">
                      {t("settings.normalizeVolume")}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.normalizeVolume}
                      onChange={(e) =>
                        updateSettings({ normalizeVolume: e.target.checked })
                      }
                    />
                  </div>
                </section>

                {/* Appearance */}
                <section className="settings-section">
                  <div className="settings-section-title">
                    {t("settings.appearance")}
                  </div>
                  <div className="palette-chips">
                    {PAD_PALETTES.map((palette, index) => (
                      <button
                        key={index}
                        className={`palette-chip ${paletteIndex === index ? "selected" : ""}`}
                        onClick={() => setPaletteIndex(index)}
                        title={palette.name || `Palette ${index + 1}`}
                        style={{ background: palette.primary }}
                      />
                    ))}
                  </div>
                </section>

                {/* General */}
                <section className="settings-section">
                  <div className="settings-section-title">
                    {t("settings.general")}
                  </div>
                  <div className="setting-item" style={{ marginTop: 4 }}>
                    <span
                      className="setting-label"
                      style={{ color: "var(--sp-red)", opacity: 0.8 }}
                    >
                      {t("controls.reset")}
                    </span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setShowResetConfirm(true)}
                    >
                      <svg width="14" height="14" fill="currentColor">
                        <use href="#icon-reset" />
                      </svg>
                      Reset
                    </button>
                  </div>
                </section>

                {/* Keyboard Shortcuts */}
                <section className="settings-section">
                  <div className="settings-section-title">
                    {t("shortcuts.title")}
                  </div>
                  <div className="shortcuts-list">
                    {[
                      {
                        key: t("shortcuts.spaceKey"),
                        desc: t("shortcuts.playPause"),
                      },
                      { key: "S", desc: t("shortcuts.stop") },
                      { key: "M", desc: t("shortcuts.mute") },
                      { key: "F", desc: t("shortcuts.fullscreen") },
                      { key: "H", desc: t("shortcuts.settings") },
                    ].map(({ key, desc }) => (
                      <div key={key} className="shortcut-item">
                        <kbd>{key}</kbd>
                        <span className="shortcut-desc">{desc}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Reset Confirm Modal ── */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            className="modal-overlay"
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <svg width="28" height="28" fill="var(--sp-red)">
                  <use href="#icon-warning" />
                </svg>
                <h2 style={{ fontSize: "1.1rem" }}>
                  {t("controls.confirmReset")}
                </h2>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-ghost btn-md"
                  onClick={() => setShowResetConfirm(false)}
                >
                  {t("controls.cancel")}
                </button>
                <button className="btn btn-danger btn-md" onClick={handleReset}>
                  {t("controls.delete")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Waveform Dots ─────────────────────────────────────────────────────────────
function WaveformDots({ active }: { active?: boolean }) {
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 12 }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={active ? "waveform-bar active" : "waveform-bar"}
          style={{
            width: 3,
            borderRadius: 2,
            background: "var(--sp-green)",
            minHeight: 4,
            animationDelay: active ? `${i * 0.15}s` : undefined,
            animationDuration: active ? "0.7s" : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ─── TopButton ─────────────────────────────────────────────────────────────────
function TopButton({
  icon,
  title,
  onClick,
  active,
  danger,
}: {
  icon: string;
  title?: string;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      className={`icon-button${active ? " active" : ""}`}
      onClick={onClick}
      title={title}
      style={{
        width: 44,
        height: 44,
        color: danger ? "var(--sp-red)" : undefined,
        background: danger ? "rgba(248,113,113,0.1)" : undefined,
      }}
    >
      <svg width="20" height="20" fill="currentColor">
        <use href={`#icon-${icon}`} />
      </svg>
    </button>
  );
}

// ─── Sortable Pad Card ─────────────────────────────────────────────────────────
interface SortablePadCardProps {
  pad: AudioPad;
  isActive: boolean;
  color: string;
  onPlayPause: (e: React.MouseEvent) => void;
  onStop: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onEditStart: (e: React.MouseEvent) => void;
  onFadeOut: (e: React.MouseEvent) => void;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  isEditing: boolean;
  onVolumeChange: (v: number) => void;
}

function SortablePadCard(props: SortablePadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.pad.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    touchAction: "none",
    zIndex: isDragging ? 1000 : ("auto" as any),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PadCard {...props} isDragging={isDragging} />
    </div>
  );
}

// ─── Pad Card ──────────────────────────────────────────────────────────────────
interface PadCardProps extends SortablePadCardProps {
  isDragging?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function PadCard({
  pad,
  isActive,
  color,
  onPlayPause,
  onStop,
  onDelete,
  onEditStart,
  onFadeOut,
  editingName,
  onEditingNameChange,
  onEditSave,
  onEditCancel,
  isEditing,
  onVolumeChange,
  isDragging = false,
}: PadCardProps) {
  const bg = isActive
    ? `linear-gradient(135deg, ${color}dd, ${color}99)`
    : "linear-gradient(135deg, rgba(28,28,46,0.95), rgba(20,20,34,0.98))";

  const borderColor = isActive ? `${color}66` : "rgba(255,255,255,0.07)";

  const statusText = {
    playing: "playing",
    paused: "paused",
    ready: "ready",
    loading: "loading",
    error: "error",
    idle: "ready",
  }[pad.status] as string;

  return (
    <motion.div
      className={`pad-card${isActive ? " active" : ""}${pad.status === "error" ? " error" : ""}${isDragging ? " dragging" : ""}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{
        background: bg,
        color: "rgba(255,255,255,0.9)",
        borderColor,
        boxShadow: isActive
          ? `0 8px 32px rgba(0,0,0,.6), 0 0 24px ${color}44, inset 0 1px 0 rgba(255,255,255,0.1)`
          : "0 2px 8px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Status dot */}
      <div
        className="pad-status"
        style={{
          background:
            pad.status === "playing"
              ? "var(--sp-green)"
              : pad.status === "paused"
                ? "var(--sp-yellow)"
                : pad.status === "loading"
                  ? "var(--sp-blue)"
                  : pad.status === "error"
                    ? "var(--sp-red)"
                    : "transparent",
        }}
      />

      {/* Status pill */}
      <div className={`pad-status-pill ${statusText}`}>
        {statusText === "playing" && <WaveformDots active />}
        {statusText}
      </div>

      {/* Pad name */}
      <div className="pad-name">
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={onEditSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSave();
              if (e.key === "Escape") onEditCancel();
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span onDoubleClick={onEditStart}>{pad.name}</span>
        )}
      </div>

      {/* Error message */}
      {pad.status === "error" && pad.errorMessage && (
        <div className="pad-error-message">{pad.errorMessage}</div>
      )}

      {/* Controls */}
      <div className="pad-controls">
        <button
          className="pad-control-btn pad-play-btn"
          onClick={onPlayPause}
          title={pad.status === "playing" ? "Pause" : "Play"}
        >
          <svg width="20" height="20" fill="currentColor">
            <use
              href={pad.status === "playing" ? "#icon-pause" : "#icon-play"}
            />
          </svg>
        </button>
        <button
          className="pad-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            onStop(e);
          }}
          title="Stop"
        >
          <svg width="20" height="20" fill="currentColor">
            <use href="#icon-stop" />
          </svg>
        </button>
        <button
          className="pad-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            onFadeOut(e);
          }}
          title="Fade Out"
        >
          <svg width="20" height="20" fill="currentColor">
            <use href="#icon-volume-down" />
          </svg>
        </button>
        <button
          className="pad-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEditStart(e);
          }}
          title="Rename"
        >
          <svg width="20" height="20" fill="currentColor">
            <use href="#icon-edit" />
          </svg>
        </button>
        <button
          className="pad-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          title="Delete"
        >
          <svg width="20" height="20" fill="currentColor">
            <use href="#icon-delete" />
          </svg>
        </button>
      </div>

      {/* Per-pad volume */}
      <div className="pad-volume-row" onClick={(e) => e.stopPropagation()}>
        <span className="pad-volume-label">VOL</span>
        <input
          type="range"
          className="pad-volume-slider"
          min="0"
          max="1"
          step="0.02"
          value={pad.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          style={{ accentColor: isActive ? "#fff" : color }}
        />
        <span className="pad-volume-value">
          {Math.round(pad.volume * 100)}%
        </span>
      </div>

      {/* Progress bar */}
      {pad.duration && pad.duration > 0 && (
        <div className="pad-progress-container">
          <div className="pad-progress-bar">
            <div
              className="pad-progress-fill"
              style={{
                width: `${Math.min(100, ((pad.currentTime || 0) / pad.duration) * 100)}%`,
                background: isActive ? "rgba(255,255,255,0.8)" : color,
              }}
            />
          </div>
          <div className="pad-progress-times">
            <span>{formatTime(pad.currentTime || 0)}</span>
            <span>{formatTime(pad.duration)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default App;
