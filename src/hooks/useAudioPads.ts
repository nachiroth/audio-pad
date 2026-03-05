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
  normalizationGain?: number;
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

type PersistedAudioPad = Pick<
  AudioPad,
  | "id"
  | "name"
  | "audioUrl"
  | "localFile"
  | "downloaded"
  | "volume"
  | "normalized"
  | "normalizationGain"
  | "duration"
  | "fileExtension"
>;

const MISSING_STORED_FILE_ERROR =
  "Stored audio file is missing. Please re-import this pad.";
const GENERIC_AUDIO_LOAD_ERROR =
  "The system could not decode this audio stream.";

const DEFAULT_SETTINGS: AudioSettings = {
  defaultVolume: 0.8,
  fadeDuration: 1.0,
  autoFadeOut: true,
  normalizeVolume: true,
};

export function useAudioPads() {
  const [pads, setPads] = useState<AudioPad[]>([]);
  const padsRef = useRef<AudioPad[]>([]);
  const deletedPadIdsRef = useRef<Set<string>>(new Set());

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
          const parsed = JSON.parse(saved) as PersistedAudioPad[];
          if (!Array.isArray(parsed)) return;
          const restoredPads = await Promise.all(
            parsed.map(async (pad) => {
              const basePad = {
                ...pad,
                status: "ready" as const,
                currentTime: 0,
                errorMessage: undefined,
                normalizationGain: pad.normalizationGain ?? 1,
              };
              if (pad.localFile && pad.id) {
                const url = await createAudioObjectURL(pad.id);
                if (url) return { ...basePad, audioUrl: url };
                return {
                  ...basePad,
                  audioUrl: "",
                  status: "error" as const,
                  errorMessage: MISSING_STORED_FILE_ERROR,
                };
              }
              if (
                typeof pad.audioUrl === "string" &&
                pad.audioUrl.startsWith("blob:")
              ) {
                return {
                  ...basePad,
                  audioUrl: "",
                  status: "error" as const,
                  errorMessage: MISSING_STORED_FILE_ERROR,
                };
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
  const preloadAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(
    new Map(),
  );
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupQueueRef = useRef<Array<{ padId: string; pad?: AudioPad }>>([]);
  const cleanupScheduledRef = useRef(false);
  const playRequestRef = useRef(0);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const updatePadProgress = useCallback(
    (padId: string, currentTime: number, duration?: number) => {
      setPads((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          if (p.id !== padId) return p;
          const nextDuration = duration || p.duration;
          if (
            Math.abs((p.currentTime || 0) - currentTime) < 0.05 &&
            (p.duration || 0) === (nextDuration || 0)
          ) {
            return p;
          }
          changed = true;
          return {
            ...p,
            currentTime,
            duration: nextDuration,
          };
        });
        return changed ? next : prev;
      });
    },
    [],
  );

  const cleanupPreloadAudio = useCallback((padId: string) => {
    const probeAudio = preloadAudioElementsRef.current.get(padId);
    if (!probeAudio) return;
    probeAudio.onloadeddata = null;
    probeAudio.onloadedmetadata = null;
    probeAudio.onended = null;
    probeAudio.ontimeupdate = null;
    probeAudio.onerror = null;
    probeAudio.pause();
    probeAudio.src = "";
    preloadAudioElementsRef.current.delete(padId);
  }, []);

  const runCleanupQueue = useCallback(async () => {
    if (cleanupScheduledRef.current) return;
    cleanupScheduledRef.current = true;

    while (cleanupQueueRef.current.length > 0) {
      const item = cleanupQueueRef.current.shift();
      if (!item) continue;
      const { padId, pad } = item;

      cleanupPreloadAudio(padId);
      await Promise.resolve();

      if (pad?.localFile) {
        try {
          await deleteAudioFile(padId);
        } catch (e) {
          console.error("Failed to delete audio file from IndexedDB:", e);
        }
      }
      await Promise.resolve();

      if (pad?.audioUrl) {
        await revokeStoredAudioURL(pad.audioUrl).catch((e) => {
          console.error("Failed to revoke audio URL:", e);
        });
      }

      // Yield to UI between cleanup tasks.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }

    cleanupScheduledRef.current = false;
  }, [cleanupPreloadAudio]);

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

  // Analyze RMS + peak and compute safe gain so tracks play at a closer perceived level.
  const normalizeVolume = useCallback(
    async (audioUrl: string): Promise<number> => {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) return 1;
        const arrayBuffer = await response.arrayBuffer();
        const ctx = getAudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

        const channelCount = decoded.numberOfChannels;
        const length = decoded.length;
        if (channelCount === 0 || length === 0) return 1;

        let squareSum = 0;
        let sampleCount = 0;
        let peak = 0;

        // Sample stride keeps analysis fast on long files while remaining stable.
        const stride = Math.max(1, Math.floor(decoded.sampleRate / 12000));

        for (let ch = 0; ch < channelCount; ch++) {
          const channelData = decoded.getChannelData(ch);
          for (let i = 0; i < channelData.length; i += stride) {
            const sample = channelData[i];
            const abs = Math.abs(sample);
            if (abs > peak) peak = abs;
            squareSum += sample * sample;
            sampleCount++;
          }
        }

        if (sampleCount === 0) return 1;
        const rms = Math.sqrt(squareSum / sampleCount);
        const targetRms = 0.12;
        const desiredGain = targetRms / Math.max(0.0001, rms);
        const peakHeadroom = 0.891; // ~ -1 dBFS
        const peakLimitedGain = peak > 0 ? peakHeadroom / peak : desiredGain;
        const computed = Math.min(desiredGain, peakLimitedGain, 4);
        return Math.max(0.25, computed);
      } catch (error) {
        console.error("Failed to normalize audio:", error);
        return 1;
      }
    },
    [getAudioContext],
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
      const requestId = ++playRequestRef.current;
      if (deletedPadIdsRef.current.has(padId)) return;
      const pad = pads.find((p) => p.id === padId);
      if (!pad || pad.status === "error" || pad.status === "loading") return;
      if (!pad.audioUrl) {
        setPads((prev) =>
          prev.map((p) =>
            p.id === padId
              ? {
                  ...p,
                  status: "error",
                  errorMessage: MISSING_STORED_FILE_ERROR,
                }
              : p,
          ),
        );
        return;
      }
      const playbackVolume = pad.volume ?? settings.defaultVolume;
      let normalizationGain = pad.normalizationGain ?? 1;

      // Enforce single-audio playback by inspecting real audio elements, not only activePadId.
      const otherPlayingIds = Array.from(audioElementsRef.current.entries())
        .filter(([id, audio]) => id !== padId && !audio.paused)
        .map(([id]) => id);

      if (otherPlayingIds.length > 0) {
        if (settings.autoFadeOut) {
          await Promise.all(
            otherPlayingIds.map((id) =>
              fadeOut(id, settings.fadeDuration * 0.5).catch(console.error),
            ),
          );
          if (requestId !== playRequestRef.current) return;
        }

        otherPlayingIds.forEach((id) => {
          const otherAudio = audioElementsRef.current.get(id);
          const otherGain = gainNodesRef.current.get(id);
          if (otherGain) otherGain.gain.value = 0;
          if (otherAudio) {
            otherAudio.pause();
            otherAudio.currentTime = 0;
          }
        });

        const otherIdsSet = new Set(otherPlayingIds);
        setPads((prev) =>
          prev.map((p) =>
            otherIdsSet.has(p.id)
              ? { ...p, status: "ready", currentTime: 0 }
              : p,
          ),
        );
      }

      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);

      if (!audio || !gainNode) {
        const { audio: newAudio } = createAudioElement(padId, pad.audioUrl);

        newAudio.onloadeddata = async () => {
          if (requestId !== playRequestRef.current) return;
          if (deletedPadIdsRef.current.has(padId)) return;
          if (settings.normalizeVolume && !pad.normalized) {
            normalizationGain = await normalizeVolume(pad.audioUrl);
            if (requestId !== playRequestRef.current) return;
            setPads((prev) =>
              prev.map((p) =>
                p.id === padId
                  ? {
                      ...p,
                      normalized: true,
                      normalizationGain,
                      status: "ready",
                    }
                  : p,
              ),
            );
          }

          setActivePadId(padId);
          setPads((prev) =>
            prev.map((p) => (p.id === padId ? { ...p, status: "playing" } : p)),
          );

          clearProgressInterval();
          progressIntervalRef.current = window.setInterval(() => {
            updatePadProgress(padId, newAudio.currentTime, newAudio.duration);
          }, 250);

          await newAudio.play().catch(console.error);
          if (requestId !== playRequestRef.current) return;
          const targetVolume = Math.min(
            1,
            playbackVolume * (settings.normalizeVolume ? normalizationGain : 1),
          );
          await fadeIn(padId, targetVolume, settings.fadeDuration);
        };

        newAudio.onended = () => {
          if (deletedPadIdsRef.current.has(padId)) return;
          clearProgressInterval();
          setPads((prev) =>
            prev.map((p) =>
              p.id === padId ? { ...p, status: "ready", currentTime: 0 } : p,
            ),
          );
          setActivePadId((current) => (current === padId ? null : current));
        };

        newAudio.onerror = () => {
          if (deletedPadIdsRef.current.has(padId)) return;
          let errorMsg = "Failed to load audio file.";
          const code = newAudio.error?.code;
          if (code === 4) errorMsg = GENERIC_AUDIO_LOAD_ERROR;
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

      clearProgressInterval();
      progressIntervalRef.current = setInterval(() => {
        updatePadProgress(padId, audio.currentTime, audio.duration);
      }, 250);

      audio.onended = () => {
        if (deletedPadIdsRef.current.has(padId)) return;
        clearProgressInterval();
        setPads((prev) =>
          prev.map((p) =>
            p.id === padId ? { ...p, status: "ready", currentTime: 0 } : p,
          ),
        );
        setActivePadId((current) => (current === padId ? null : current));
      };

      if (audio.ended) audio.currentTime = 0;
      await audio.play().catch(console.error);
      if (requestId !== playRequestRef.current) return;
      const targetVolume = Math.min(
        1,
        playbackVolume * (settings.normalizeVolume ? normalizationGain : 1),
      );
      await fadeIn(padId, targetVolume, settings.fadeDuration);
    },
    [
      pads,
      settings.autoFadeOut,
      settings.fadeDuration,
      settings.normalizeVolume,
      createAudioElement,
      clearProgressInterval,
      fadeIn,
      fadeOut,
      normalizeVolume,
    ],
  );

  // Pause (retains position)
  const pausePad = useCallback(
    async (padId: string) => {
      playRequestRef.current += 1;
      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);
      if (!audio || !gainNode) return;

      await fadeOut(padId, settings.fadeDuration * 0.3);
      audio.pause();

      clearProgressInterval();
      setPads((prev) =>
        prev.map((p) => (p.id === padId ? { ...p, status: "paused" } : p)),
      );
    },
    [settings.fadeDuration, fadeOut, clearProgressInterval],
  );

  // Stop (resets to beginning)
  const stopPad = useCallback(
    async (padId: string) => {
      playRequestRef.current += 1;
      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);
      if (!audio || !gainNode) return;

      gainNode.gain.value = 0;
      audio.pause();
      audio.currentTime = 0;
      setActivePadId(null);

      clearProgressInterval();
      setPads((prev) =>
        prev.map((p) =>
          p.id === padId ? { ...p, status: "ready", currentTime: 0 } : p,
        ),
      );
    },
    [clearProgressInterval],
  );

  // Stop all
  const stopAllPads = useCallback(() => {
    playRequestRef.current += 1;
    pads.forEach((pad) => {
      const audio = audioElementsRef.current.get(pad.id);
      const gainNode = gainNodesRef.current.get(pad.id);
      if (audio && gainNode) {
        gainNode.gain.value = 0;
        audio.pause();
        audio.currentTime = 0;
      }
    });

    clearProgressInterval();
    setPads((prev) =>
      prev.map((p) => ({ ...p, status: "ready", currentTime: 0 })),
    );
    setActivePadId(null);
  }, [pads, clearProgressInterval]);

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
      let persistedLocally = false;

      if (localFile && fileBlob) {
        finalUrl = URL.createObjectURL(fileBlob);
        try {
          await saveAudioFile(padId, name, fileBlob);
          persistedLocally = true;
        } catch (e) {
          console.error("Failed to save audio file to IndexedDB:", e);
        }
      }

      const newPad: AudioPad = {
        id: padId,
        name,
        audioUrl: finalUrl,
        localFile: persistedLocally,
        downloaded: persistedLocally,
        volume: settings.defaultVolume,
        normalized: false,
        normalizationGain: 1,
        status: "loading",
        currentTime: 0,
        duration: 0,
        fileExtension: fileBlob
          ? `.${(fileBlob as any).name?.split(".").pop()?.toLowerCase() || "unknown"}`
          : "unknown",
      };

      deletedPadIdsRef.current.delete(newPad.id);
      setPads((prev) => [...prev, newPad]);

      const audio = new Audio(finalUrl);
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      preloadAudioElementsRef.current.set(newPad.id, audio);

      audio.onloadeddata = () => {
        if (deletedPadIdsRef.current.has(newPad.id)) return;
        cleanupPreloadAudio(newPad.id);
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
      };

      audio.onloadedmetadata = () => {
        if (deletedPadIdsRef.current.has(newPad.id)) return;
        updatePadProgress(newPad.id, 0, audio.duration || 0);
      };

      audio.onended = () => {
        if (deletedPadIdsRef.current.has(newPad.id)) return;
        clearProgressInterval();
        setPads((prev) =>
          prev.map((p) =>
            p.id === newPad.id ? { ...p, status: "ready", currentTime: 0 } : p,
          ),
        );
        setActivePadId(null);
      };

      audio.onerror = () => {
        if (deletedPadIdsRef.current.has(newPad.id)) return;
        cleanupPreloadAudio(newPad.id);
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
                  errorMessage: GENERIC_AUDIO_LOAD_ERROR,
                }
              : p,
          ),
        );
      };
    },
    [
      settings.defaultVolume,
      clearProgressInterval,
      cleanupPreloadAudio,
      updatePadProgress,
    ],
  );

  // Remove pad
  const removePad = useCallback(
    (padId: string) => {
      playRequestRef.current += 1;
      deletedPadIdsRef.current.add(padId);
      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);
      if (audio && gainNode) {
        audio.onloadeddata = null;
        audio.onerror = null;
        audio.onended = null;
        audio.ontimeupdate = null;
        gainNode.gain.value = 0;
        audio.pause();
        audio.src = "";
        audioElementsRef.current.delete(padId);
        gainNodesRef.current.delete(padId);
      }

      if (activePadId === padId) clearProgressInterval();

      const pad = padsRef.current.find((p) => p.id === padId);
      if (activePadId === padId) setActivePadId(null);
      setPads((prev) => prev.filter((p) => p.id !== padId));

      // Queue heavy cleanup away from the click path to keep UI responsive.
      cleanupQueueRef.current.push({ padId, pad });
      void runCleanupQueue();
    },
    [activePadId, clearProgressInterval, runCleanupQueue],
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
        const norm = settings.normalizeVolume
          ? (pad.normalizationGain ?? 1)
          : 1;
        gainNode.gain.value = isMuted ? 0 : Math.min(1, volume * norm);
      }
    },
    [pads, isMuted, settings.normalizeVolume],
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    gainNodesRef.current.forEach((gainNode, padId) => {
      const pad = pads.find((p) => p.id === padId);
      if (pad?.status === "playing") {
        const norm = settings.normalizeVolume
          ? (pad.normalizationGain ?? 1)
          : 1;
        gainNode.gain.value = newMuted
          ? 0
          : Math.min(1, (pad.volume ?? settings.defaultVolume) * norm);
      }
    });
  }, [isMuted, pads, settings.defaultVolume, settings.normalizeVolume]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Reset all pads
  const resetAllPads = useCallback(() => {
    playRequestRef.current += 1;
    padsRef.current.forEach((pad) => deletedPadIdsRef.current.add(pad.id));
    stopAllPads();
    audioElementsRef.current.forEach((audio) => {
      audio.onloadeddata = null;
      audio.onerror = null;
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.pause();
      audio.src = "";
    });
    audioElementsRef.current.clear();
    Array.from(preloadAudioElementsRef.current.keys()).forEach((padId) => {
      cleanupPreloadAudio(padId);
    });
    cleanupQueueRef.current = [];
    cleanupScheduledRef.current = false;
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
  }, [stopAllPads, cleanupPreloadAudio]);

  // Persist to localStorage
  useEffect(() => {
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = window.setTimeout(() => {
      // Persist only stable metadata. Avoid frequent writes for transient UI state.
      const persistedPads: PersistedAudioPad[] = pads.map((pad) => ({
        id: pad.id,
        name: pad.name,
        audioUrl:
          pad.localFile || pad.audioUrl.startsWith("blob:") ? "" : pad.audioUrl,
        localFile: pad.localFile,
        downloaded: pad.downloaded,
        volume: pad.volume,
        normalized: pad.normalized,
        normalizationGain: pad.normalizationGain,
        duration: pad.duration,
        fileExtension: pad.fileExtension,
      }));
      try {
        localStorage.setItem("audioPads", JSON.stringify(persistedPads));
      } catch (e) {
        console.error("Failed to save pads:", e);
      }
    }, 250);
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

  useEffect(() => {
    gainNodesRef.current.forEach((gainNode, padId) => {
      const pad = padsRef.current.find((p) => p.id === padId);
      if (!pad || pad.status !== "playing") return;
      const norm = settings.normalizeVolume ? (pad.normalizationGain ?? 1) : 1;
      gainNode.gain.value = isMuted ? 0 : Math.min(1, pad.volume * norm);
    });
  }, [settings.normalizeVolume, isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioElementsRef.current.clear();
      Array.from(preloadAudioElementsRef.current.keys()).forEach((padId) => {
        cleanupPreloadAudio(padId);
      });
      cleanupQueueRef.current = [];
      cleanupScheduledRef.current = false;
      gainNodesRef.current.clear();
      padsRef.current.forEach((pad) => {
        if (pad.audioUrl) {
          revokeStoredAudioURL(pad.audioUrl).catch((e) => {
            console.error("Failed to revoke audio URL:", e);
          });
        }
      });
      if (audioContextRef.current) audioContextRef.current.close();
      clearProgressInterval();
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, [clearProgressInterval, cleanupPreloadAudio]);

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
