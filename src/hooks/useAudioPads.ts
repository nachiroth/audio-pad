/**
 * useAudioPads - core hook for Audio Pad
 * Web Audio API with fade in/out, volume normalization, and IndexedDB persistence.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import {
  saveAudioFile,
  createAudioObjectURL,
  deleteAudioFile,
  revokeStoredAudioURL,
  clearAllAudioFiles,
} from "../utils/audioStorage";

export interface AudioPad {
  id: string;
  name: string;
  audioUrl: string;
  localFile?: boolean;
  downloaded?: boolean;
  volume: number;
  normalized: boolean;
  status: "idle" | "loading" | "ready" | "playing" | "paused" | "error";
  errorMessage?: string;
  currentTime?: number;
  duration?: number;
  fileExtension?: string;
}

export interface AudioSettings {
  defaultVolume: number;
  fadeDuration: number;
  autoFadeOut: boolean;
  normalizeVolume: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  defaultVolume: 0.8,
  fadeDuration: 1.0,
  autoFadeOut: true,
  normalizeVolume: true,
};

export function useAudioPads() {
  const [pads, setPads] = useState<AudioPad[]>([]);
  const padsRef = useRef<AudioPad[]>([]);

  const [settings, setSettings] = useState<AudioSettings>(() => {
    try {
      const saved = localStorage.getItem("audioPadSettings");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isMuted, setIsMuted] = useState(false);
  const [activePadId, setActivePadId] = useState<string | null>(null);

  // Initialize pads from localStorage and restore IndexedDB blob URLs
  useEffect(() => {
    async function loadPads() {
      try {
        const saved = localStorage.getItem("audioPads");
        if (saved) {
          const parsed = JSON.parse(saved);
          const restoredPads = await Promise.all(
            parsed.map(async (pad: AudioPad) => {
              const basePad = {
                ...pad,
                status: "ready" as const,
                currentTime: 0,
              };
              if (pad.localFile && pad.id) {
                const url = await createAudioObjectURL(pad.id);
                if (url) return { ...basePad, audioUrl: url };
              }
              return basePad;
            }),
          );
          setPads(restoredPads);
        }
      } catch (e) {
        console.error("Failed to load pads:", e);
      }
    }
    loadPads();
  }, []);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(console.error);
    }
    return audioContextRef.current;
  }, []);

  const createAudioElement = useCallback(
    (
      padId: string,
      url: string,
    ): { audio: HTMLAudioElement; gainNode: GainNode } => {
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";

      const ctx = getAudioContext();
      const source = ctx.createMediaElementSource(audio);
      const gainNode = ctx.createGain();
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNode.gain.value = 0;

      audioElementsRef.current.set(padId, audio);
      gainNodesRef.current.set(padId, gainNode);

      return { audio, gainNode };
    },
    [getAudioContext],
  );

  // Best-effort volume normalization (heuristic)
  const normalizeVolume = useCallback(
    async (audio: HTMLAudioElement, _padId: string): Promise<void> => {
      return new Promise((resolve) => {
        const apply = () => {
          const targetRMS = 0.125;
          audio.volume = Math.min(
            1.0,
            targetRMS / Math.max(0.01, audio.volume),
          );
          resolve();
        };
        if (audio.readyState >= 3) apply();
        else audio.addEventListener("canplay", apply, { once: true });
      });
    },
    [],
  );

  // Fade in
  const fadeIn = useCallback(
    async (
      padId: string,
      targetVolume: number,
      duration: number = settings.fadeDuration,
    ): Promise<void> => {
      const gainNode = gainNodesRef.current.get(padId);
      if (!gainNode) return;
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(
        isMuted ? 0 : targetVolume,
        now + duration,
      );
      await new Promise<void>((r) => setTimeout(r, duration * 1000));
    },
    [getAudioContext, settings.fadeDuration, isMuted],
  );

  // Fade out
  const fadeOut = useCallback(
    async (
      padId: string,
      duration: number = settings.fadeDuration,
    ): Promise<void> => {
      const gainNode = gainNodesRef.current.get(padId);
      if (!gainNode) return;
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      await new Promise<void>((r) => setTimeout(r, duration * 1000));
    },
    [getAudioContext, settings.fadeDuration],
  );

  // Play pad
  const playPad = useCallback(
    async (padId: string) => {
      const pad = pads.find((p) => p.id === padId);
      if (!pad || pad.status === "error" || pad.status === "loading") return;
      const playbackVolume = pad.volume ?? settings.defaultVolume;

      if (activePadId && activePadId !== padId) {
        const activeAudio = audioElementsRef.current.get(activePadId);
        if (activeAudio) {
          if (settings.autoFadeOut)
            await fadeOut(activePadId, settings.fadeDuration * 0.5);
          activeAudio.pause();
          activeAudio.currentTime = 0;
        }
        setPads((prev) =>
          prev.map((p) =>
            p.id === activePadId ? { ...p, status: "ready" } : p,
          ),
        );
      }

      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);

      if (!audio || !gainNode) {
        const { audio: newAudio } = createAudioElement(padId, pad.audioUrl);

        newAudio.onloadeddata = async () => {
          if (settings.normalizeVolume && !pad.normalized) {
            await normalizeVolume(newAudio, padId);
            setPads((prev) =>
              prev.map((p) =>
                p.id === padId
                  ? { ...p, normalized: true, status: "ready" }
                  : p,
              ),
            );
          }

          setActivePadId(padId);
          setPads((prev) =>
            prev.map((p) => (p.id === padId ? { ...p, status: "playing" } : p)),
          );

          if (progressIntervalRef.current)
            clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = window.setInterval(() => {
            setPads((prev) =>
              prev.map((p) =>
                p.id === padId
                  ? {
                      ...p,
                      currentTime: newAudio.currentTime,
                      duration: newAudio.duration,
                    }
                  : p,
              ),
            );
          }, 100);

          await newAudio.play().catch(console.error);
          await fadeIn(padId, playbackVolume, settings.fadeDuration);
        };

        newAudio.onerror = () => {
          let errorMsg = "Failed to load audio file.";
          const code = newAudio.error?.code;
          if (code === 4)
            errorMsg = "Format not supported by this browser/system.";
          else if (code === 1) errorMsg = "Loading aborted.";
          else if (code === 2) errorMsg = "Network error.";
          else if (code === 3) errorMsg = "File is corrupted or incomplete.";

          console.error(
            "Audio load error:",
            newAudio.error?.message,
            "Pad:",
            padId,
          );
          setPads((prev) =>
            prev.map((p) =>
              p.id === padId
                ? { ...p, status: "error", errorMessage: errorMsg }
                : p,
            ),
          );
        };
        return;
      }

      // Existing audio element — resume
      setActivePadId(padId);
      setPads((prev) =>
        prev.map((p) => (p.id === padId ? { ...p, status: "playing" } : p)),
      );

      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        setPads((prev) =>
          prev.map((p) =>
            p.id === padId
              ? {
                  ...p,
                  currentTime: audio.currentTime,
                  duration: audio.duration || p.duration,
                }
              : p,
          ),
        );
      }, 100);

      audio.ontimeupdate = () => {
        setPads((prev) =>
          prev.map((p) =>
            p.id === padId
              ? {
                  ...p,
                  currentTime: audio.currentTime,
                  duration: audio.duration || p.duration,
                }
              : p,
          ),
        );
      };

      if (audio.ended) audio.currentTime = 0;
      await audio.play().catch(console.error);
      await fadeIn(padId, playbackVolume, settings.fadeDuration);
    },
    [
      pads,
      activePadId,
      settings.autoFadeOut,
      settings.fadeDuration,
      settings.normalizeVolume,
      createAudioElement,
      fadeIn,
      fadeOut,
      normalizeVolume,
    ],
  );

  // Pause (retains position)
  const pausePad = useCallback(
    async (padId: string) => {
      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);
      if (!audio || !gainNode) return;

      await fadeOut(padId, settings.fadeDuration * 0.3);
      audio.pause();

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setPads((prev) =>
        prev.map((p) => (p.id === padId ? { ...p, status: "paused" } : p)),
      );
    },
    [settings.fadeDuration, fadeOut],
  );

  // Stop (resets to beginning)
  const stopPad = useCallback(async (padId: string) => {
    const audio = audioElementsRef.current.get(padId);
    const gainNode = gainNodesRef.current.get(padId);
    if (!audio || !gainNode) return;

    gainNode.gain.value = 0;
    audio.pause();
    audio.currentTime = 0;
    setActivePadId(null);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setPads((prev) =>
      prev.map((p) =>
        p.id === padId ? { ...p, status: "ready", currentTime: 0 } : p,
      ),
    );
  }, []);

  // Stop all
  const stopAllPads = useCallback(() => {
    pads.forEach((pad) => {
      const audio = audioElementsRef.current.get(pad.id);
      const gainNode = gainNodesRef.current.get(pad.id);
      if (audio && gainNode) {
        gainNode.gain.value = 0;
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setPads((prev) =>
      prev.map((p) => ({ ...p, status: "ready", currentTime: 0 })),
    );
    setActivePadId(null);
  }, [pads]);

  // Add pad
  const addPad = useCallback(
    async (
      name: string,
      localFile: boolean = false,
      fileBlob?: Blob,
    ): Promise<void> => {
      const padId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      let finalUrl = "";

      if (localFile && fileBlob) {
        finalUrl = URL.createObjectURL(fileBlob);
        saveAudioFile(padId, name, fileBlob).catch((e) => {
          console.error("Failed to save audio file to IndexedDB:", e);
        });
      }

      const newPad: AudioPad = {
        id: padId,
        name,
        audioUrl: finalUrl,
        localFile,
        downloaded: localFile,
        volume: settings.defaultVolume,
        normalized: false,
        status: "loading",
        currentTime: 0,
        duration: 0,
        fileExtension: fileBlob
          ? `.${(fileBlob as any).name?.split(".").pop()?.toLowerCase() || "unknown"}`
          : "unknown",
      };

      setPads((prev) => [...prev, newPad]);

      const audio = new Audio(finalUrl);
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";

      audio.onloadeddata = () => {
        setPads((prev) =>
          prev.map((p) =>
            p.id === newPad.id
              ? {
                  ...p,
                  status: "ready",
                  duration: audio.duration || 0,
                  currentTime: 0,
                }
              : p,
          ),
        );
        audio.ontimeupdate = () => {
          setPads((prev) =>
            prev.map((p) =>
              p.id === newPad.id
                ? {
                    ...p,
                    currentTime: audio.currentTime,
                    duration: audio.duration || p.duration,
                  }
                : p,
            ),
          );
        };
      };

      audio.onloadedmetadata = () => {
        setPads((prev) =>
          prev.map((p) =>
            p.id === newPad.id ? { ...p, duration: audio.duration || 0 } : p,
          ),
        );
      };

      audio.onended = () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setPads((prev) =>
          prev.map((p) =>
            p.id === newPad.id ? { ...p, status: "ready", currentTime: 0 } : p,
          ),
        );
        setActivePadId(null);
      };

      audio.ontimeupdate = () => {
        setPads((prev) =>
          prev.map((p) =>
            p.id === newPad.id
              ? {
                  ...p,
                  currentTime: audio.currentTime,
                  duration: audio.duration || p.duration,
                }
              : p,
          ),
        );
      };

      audio.onerror = () => {
        console.error(
          "Audio load error — Pad:",
          padId,
          "Type:",
          fileBlob?.type,
        );
        setPads((prev) =>
          prev.map((p) =>
            p.id === newPad.id
              ? {
                  ...p,
                  status: "error",
                  errorMessage:
                    "Failed to load audio file. Format may not be supported.",
                }
              : p,
          ),
        );
      };
    },
    [settings.defaultVolume],
  );

  // Remove pad
  const removePad = useCallback(
    async (padId: string) => {
      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);
      if (audio && gainNode) {
        gainNode.gain.value = 0;
        audio.pause();
        audio.src = "";
        audioElementsRef.current.delete(padId);
        gainNodesRef.current.delete(padId);
      }

      if (activePadId === padId && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const pad = pads.find((p) => p.id === padId);
      if (pad?.localFile) {
        try {
          await deleteAudioFile(padId);
        } catch (e) {
          console.error("Failed to delete audio file from IndexedDB:", e);
        }
      }
      if (pad?.audioUrl) {
        await revokeStoredAudioURL(pad.audioUrl).catch((e) => {
          console.error("Failed to revoke audio URL:", e);
        });
      }

      if (activePadId === padId) setActivePadId(null);
      setPads((prev) => prev.filter((p) => p.id !== padId));
    },
    [activePadId, pads],
  );

  // Update pad name
  const updatePadName = useCallback((padId: string, name: string) => {
    setPads((prev) => prev.map((p) => (p.id === padId ? { ...p, name } : p)));
  }, []);

  // Update pad volume
  const updatePadVolume = useCallback(
    (padId: string, volume: number) => {
      setPads((prev) =>
        prev.map((p) => (p.id === padId ? { ...p, volume } : p)),
      );
      const gainNode = gainNodesRef.current.get(padId);
      const pad = pads.find((p) => p.id === padId);
      if (gainNode && pad?.status === "playing") {
        gainNode.gain.value = isMuted ? 0 : volume;
      }
    },
    [pads, isMuted],
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    gainNodesRef.current.forEach((gainNode, padId) => {
      const pad = pads.find((p) => p.id === padId);
      if (pad?.status === "playing") {
        gainNode.gain.value = newMuted
          ? 0
          : (pad.volume ?? settings.defaultVolume);
      }
    });
  }, [isMuted, pads, settings.defaultVolume]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Reset all pads
  const resetAllPads = useCallback(() => {
    stopAllPads();
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.src = "";
    });
    audioElementsRef.current.clear();
    gainNodesRef.current.clear();
    padsRef.current.forEach((pad) => {
      if (pad.audioUrl) {
        revokeStoredAudioURL(pad.audioUrl).catch((e) => {
          console.error("Failed to revoke audio URL:", e);
        });
      }
    });
    clearAllAudioFiles().catch((e) => {
      console.error("Failed to clear stored audio files:", e);
    });
    setPads([]);
    setSettings(DEFAULT_SETTINGS);
    setIsMuted(false);
    setActivePadId(null);
  }, [stopAllPads]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("audioPads", JSON.stringify(pads));
    } catch (e) {
      console.error("Failed to save pads:", e);
    }
  }, [pads]);

  useEffect(() => {
    padsRef.current = pads;
  }, [pads]);

  useEffect(() => {
    try {
      localStorage.setItem("audioPadSettings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }, [settings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioElementsRef.current.clear();
      gainNodesRef.current.clear();
      padsRef.current.forEach((pad) => {
        if (pad.audioUrl) {
          revokeStoredAudioURL(pad.audioUrl).catch((e) => {
            console.error("Failed to revoke audio URL:", e);
          });
        }
      });
      if (audioContextRef.current) audioContextRef.current.close();
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Reorder (drag and drop)
  const reorderPads = useCallback((fromIndex: number, toIndex: number) => {
    setPads((prev) => arrayMove(prev, fromIndex, toIndex));
  }, []);

  return {
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
    fadeIn,
    fadeOut,
    toggleMute,
    updateSettings,
    resetAllPads,
  };
}
