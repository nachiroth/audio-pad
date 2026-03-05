/**
 * useAudioPads - core hook for Audio Pad
 * Web Audio API with fade in/out, normalization, IndexedDB persistence, and banks.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
  bankId: string;
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

export interface AudioBank {
  id: string;
  name: string;
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
  | "bankId"
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
const DEFAULT_BANK_ID = "default-bank";
const DEFAULT_SETTINGS: AudioSettings = {
  defaultVolume: 0.8,
  fadeDuration: 1.0,
  autoFadeOut: true,
  normalizeVolume: true,
};

const createDefaultBank = (): AudioBank => ({
  id: DEFAULT_BANK_ID,
  name: "Default",
});

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useAudioPads() {
  const [allPads, setAllPads] = useState<AudioPad[]>([]);
  const allPadsRef = useRef<AudioPad[]>([]);
  const deletedPadIdsRef = useRef<Set<string>>(new Set());
  const [banks, setBanks] = useState<AudioBank[]>(() => {
    try {
      const saved = localStorage.getItem("audioPadBanks");
      if (!saved) return [createDefaultBank()];
      const parsed = JSON.parse(saved) as AudioBank[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [createDefaultBank()];
      }
      return parsed.map((b, index) => ({
        id: b.id || `bank-${index}`,
        name: (b.name || `Bank ${index + 1}`).trim(),
      }));
    } catch {
      return [createDefaultBank()];
    }
  });
  const [activeBankId, setActiveBankId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("audioPadActiveBankId");
      return saved || DEFAULT_BANK_ID;
    } catch {
      return DEFAULT_BANK_ID;
    }
  });

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
        if (!saved) return;
        const parsed = JSON.parse(saved) as PersistedAudioPad[];
        if (!Array.isArray(parsed)) return;

        const restoredPads = await Promise.all(
          parsed.map(async (pad) => {
            const bankId = pad.bankId || DEFAULT_BANK_ID;
            const basePad: AudioPad = {
              ...pad,
              bankId,
              status: "ready",
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

        setAllPads(restoredPads);
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
  const decodeRetryRef = useRef<Set<string>>(new Set());

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const updatePadProgress = useCallback(
    (padId: string, currentTime: number, duration?: number) => {
      setAllPads((prev) => {
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

      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }

    cleanupScheduledRef.current = false;
  }, [cleanupPreloadAudio]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
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

  const computeNormalizationGainFromBuffer = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<number> => {
      try {
        const ctx = getAudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

        const channelCount = decoded.numberOfChannels;
        if (channelCount === 0 || decoded.length === 0) return 1;

        let squareSum = 0;
        let sampleCount = 0;
        let peak = 0;
        const targetSamples = 180000;

        for (let ch = 0; ch < channelCount; ch++) {
          const channelData = decoded.getChannelData(ch);
          const stride = Math.max(
            1,
            Math.floor(channelData.length / targetSamples),
          );
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

  const normalizeVolumeFromUrl = useCallback(
    async (audioUrl: string): Promise<number> => {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) return 1;
        const arrayBuffer = await response.arrayBuffer();
        return computeNormalizationGainFromBuffer(arrayBuffer);
      } catch (error) {
        console.error("Failed to normalize audio from URL:", error);
        return 1;
      }
    },
    [computeNormalizationGainFromBuffer],
  );

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
      const safeDuration = Math.max(0.02, duration);
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(
        isMuted ? 0 : targetVolume,
        now + safeDuration,
      );
      await new Promise<void>((r) => setTimeout(r, safeDuration * 1000));
    },
    [getAudioContext, settings.fadeDuration, isMuted],
  );

  const fadeOut = useCallback(
    async (
      padId: string,
      duration: number = settings.fadeDuration,
    ): Promise<void> => {
      const gainNode = gainNodesRef.current.get(padId);
      if (!gainNode) return;
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const safeDuration = Math.max(0.02, duration);
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + safeDuration);
      await new Promise<void>((r) => setTimeout(r, safeDuration * 1000));
    },
    [getAudioContext, settings.fadeDuration],
  );

  const playPad = useCallback(
    async (padId: string) => {
      const requestId = ++playRequestRef.current;
      if (deletedPadIdsRef.current.has(padId)) return;
      const pad = allPadsRef.current.find((p) => p.id === padId);
      if (!pad || pad.status === "error" || pad.status === "loading") return;
      if (!pad.audioUrl) {
        setAllPads((prev) =>
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
        setAllPads((prev) =>
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
          setActivePadId(padId);
          setAllPads((prev) =>
            prev.map((p) => (p.id === padId ? { ...p, status: "playing" } : p)),
          );

          clearProgressInterval();
          progressIntervalRef.current = window.setInterval(() => {
            updatePadProgress(padId, newAudio.currentTime, newAudio.duration);
          }, 250);

          await newAudio.play().catch(console.error);
          if (requestId !== playRequestRef.current) return;
          decodeRetryRef.current.delete(padId);
          const targetVolume = Math.min(
            1,
            playbackVolume * (settings.normalizeVolume ? normalizationGain : 1),
          );
          await fadeIn(padId, targetVolume, settings.fadeDuration);

          if (settings.normalizeVolume && !pad.normalized) {
            void normalizeVolumeFromUrl(pad.audioUrl)
              .then((gain) => {
                if (deletedPadIdsRef.current.has(padId)) return;
                normalizationGain = gain;
                setAllPads((prev) =>
                  prev.map((p) =>
                    p.id === padId
                      ? { ...p, normalized: true, normalizationGain: gain }
                      : p,
                  ),
                );
                const liveGainNode = gainNodesRef.current.get(padId);
                const livePad = allPadsRef.current.find((p) => p.id === padId);
                if (!liveGainNode || !livePad || livePad.status !== "playing")
                  return;
                const nextGain = Math.min(
                  1,
                  (livePad.volume ?? settings.defaultVolume) * gain,
                );
                const ctx = getAudioContext();
                const now = ctx.currentTime;
                liveGainNode.gain.cancelScheduledValues(now);
                liveGainNode.gain.setValueAtTime(liveGainNode.gain.value, now);
                liveGainNode.gain.linearRampToValueAtTime(
                  isMuted ? 0 : nextGain,
                  now + 0.14,
                );
              })
              .catch((error) => {
                console.error("Background normalization failed:", error);
              });
          }
        };

        newAudio.onended = () => {
          if (deletedPadIdsRef.current.has(padId)) return;
          clearProgressInterval();
          setAllPads((prev) =>
            prev.map((p) =>
              p.id === padId ? { ...p, status: "ready", currentTime: 0 } : p,
            ),
          );
          setActivePadId((current) => (current === padId ? null : current));
        };

        newAudio.onerror = () => {
          if (deletedPadIdsRef.current.has(padId)) return;
          const code = newAudio.error?.code;
          const alreadyRetried = decodeRetryRef.current.has(padId);

          if (code === 4 && !alreadyRetried) {
            decodeRetryRef.current.add(padId);
            const brokenAudio = audioElementsRef.current.get(padId);
            if (brokenAudio) {
              brokenAudio.onloadeddata = null;
              brokenAudio.onerror = null;
              brokenAudio.onended = null;
              brokenAudio.ontimeupdate = null;
              brokenAudio.pause();
              brokenAudio.src = "";
            }
            audioElementsRef.current.delete(padId);
            gainNodesRef.current.delete(padId);

            void (async () => {
              if (pad.localFile) {
                const refreshedUrl = await createAudioObjectURL(padId);
                if (refreshedUrl) {
                  setAllPads((prev) =>
                    prev.map((p) =>
                      p.id === padId
                        ? {
                            ...p,
                            audioUrl: refreshedUrl,
                            status: "ready",
                            errorMessage: undefined,
                          }
                        : p,
                    ),
                  );
                }
              }

              // Retry once in next tick; if it fails again, user gets real error.
              window.setTimeout(() => {
                void playPad(padId);
              }, 40);
            })();
            return;
          }

          let errorMsg = "Failed to load audio file.";
          if (code === 4) errorMsg = GENERIC_AUDIO_LOAD_ERROR;
          else if (code === 1) errorMsg = "Loading aborted.";
          else if (code === 2) errorMsg = "Network error.";
          else if (code === 3) errorMsg = "File is corrupted or incomplete.";

          setAllPads((prev) =>
            prev.map((p) =>
              p.id === padId
                ? { ...p, status: "error", errorMessage: errorMsg }
                : p,
            ),
          );
        };
        return;
      }

      setActivePadId(padId);
      setAllPads((prev) =>
        prev.map((p) => (p.id === padId ? { ...p, status: "playing" } : p)),
      );

      clearProgressInterval();
      progressIntervalRef.current = setInterval(() => {
        updatePadProgress(padId, audio.currentTime, audio.duration);
      }, 250);

      audio.onended = () => {
        if (deletedPadIdsRef.current.has(padId)) return;
        clearProgressInterval();
        setAllPads((prev) =>
          prev.map((p) =>
            p.id === padId ? { ...p, status: "ready", currentTime: 0 } : p,
          ),
        );
        setActivePadId((current) => (current === padId ? null : current));
      };

      if (audio.ended) audio.currentTime = 0;
      await audio.play().catch(console.error);
      if (requestId !== playRequestRef.current) return;
      decodeRetryRef.current.delete(padId);
      const targetVolume = Math.min(
        1,
        playbackVolume * (settings.normalizeVolume ? normalizationGain : 1),
      );
      await fadeIn(padId, targetVolume, settings.fadeDuration);

      if (settings.normalizeVolume && !pad.normalized) {
        void normalizeVolumeFromUrl(pad.audioUrl)
          .then((gain) => {
            if (deletedPadIdsRef.current.has(padId)) return;
            setAllPads((prev) =>
              prev.map((p) =>
                p.id === padId
                  ? { ...p, normalized: true, normalizationGain: gain }
                  : p,
              ),
            );
            const liveGainNode = gainNodesRef.current.get(padId);
            const livePad = allPadsRef.current.find((p) => p.id === padId);
            if (!liveGainNode || !livePad || livePad.status !== "playing")
              return;
            const nextGain = Math.min(
              1,
              (livePad.volume ?? settings.defaultVolume) * gain,
            );
            const ctx = getAudioContext();
            const now = ctx.currentTime;
            liveGainNode.gain.cancelScheduledValues(now);
            liveGainNode.gain.setValueAtTime(liveGainNode.gain.value, now);
            liveGainNode.gain.linearRampToValueAtTime(
              isMuted ? 0 : nextGain,
              now + 0.14,
            );
          })
          .catch((error) => {
            console.error("Background normalization failed:", error);
          });
      }
    },
    [
      settings.defaultVolume,
      settings.autoFadeOut,
      settings.fadeDuration,
      settings.normalizeVolume,
      createAudioElement,
      clearProgressInterval,
      fadeIn,
      fadeOut,
      normalizeVolumeFromUrl,
      updatePadProgress,
    ],
  );

  const pausePad = useCallback(
    async (padId: string) => {
      playRequestRef.current += 1;
      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);
      if (!audio || !gainNode) return;

      await fadeOut(padId, Math.min(0.22, settings.fadeDuration * 0.3));
      audio.pause();

      clearProgressInterval();
      setAllPads((prev) =>
        prev.map((p) => (p.id === padId ? { ...p, status: "paused" } : p)),
      );
    },
    [settings.fadeDuration, fadeOut, clearProgressInterval],
  );

  const stopPad = useCallback(
    async (padId: string) => {
      playRequestRef.current += 1;
      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);
      if (!audio || !gainNode) return;

      if (!audio.paused) {
        await fadeOut(padId, Math.min(0.18, settings.fadeDuration * 0.25));
      } else {
        gainNode.gain.value = 0;
      }

      audio.pause();
      audio.currentTime = 0;
      setActivePadId((current) => (current === padId ? null : current));

      clearProgressInterval();
      setAllPads((prev) =>
        prev.map((p) =>
          p.id === padId ? { ...p, status: "ready", currentTime: 0 } : p,
        ),
      );
    },
    [settings.fadeDuration, clearProgressInterval, fadeOut],
  );

  const stopAllPads = useCallback(async () => {
    playRequestRef.current += 1;
    const playingIds = Array.from(audioElementsRef.current.entries())
      .filter(([, audio]) => !audio.paused)
      .map(([id]) => id);

    if (playingIds.length > 0) {
      await Promise.all(
        playingIds.map((id) =>
          fadeOut(id, Math.min(0.14, settings.fadeDuration * 0.2)).catch(
            console.error,
          ),
        ),
      );
    }

    allPadsRef.current.forEach((pad) => {
      const audio = audioElementsRef.current.get(pad.id);
      const gainNode = gainNodesRef.current.get(pad.id);
      if (audio && gainNode) {
        gainNode.gain.value = 0;
        audio.pause();
        audio.currentTime = 0;
      }
    });

    clearProgressInterval();
    setAllPads((prev) =>
      prev.map((p) => ({ ...p, status: "ready", currentTime: 0 })),
    );
    setActivePadId(null);
  }, [fadeOut, settings.fadeDuration, clearProgressInterval]);

  const addPad = useCallback(
    async (
      name: string,
      localFile: boolean = false,
      fileBlob?: Blob,
    ): Promise<void> => {
      const padId = createId();
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
        bankId: activeBankId,
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
          ? `.${(fileBlob as File).name?.split(".").pop()?.toLowerCase() || "unknown"}`
          : "unknown",
      };

      deletedPadIdsRef.current.delete(newPad.id);
      setAllPads((prev) => [...prev, newPad]);

      const audio = new Audio(finalUrl);
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      preloadAudioElementsRef.current.set(newPad.id, audio);

      audio.onloadeddata = () => {
        if (deletedPadIdsRef.current.has(newPad.id)) return;
        setAllPads((prev) =>
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
        setAllPads((prev) =>
          prev.map((p) =>
            p.id === newPad.id
              ? {
                  ...p,
                  status: "ready",
                  duration: audio.duration || p.duration || 0,
                  currentTime: 0,
                }
              : p,
          ),
        );
        updatePadProgress(newPad.id, 0, audio.duration || 0);
        cleanupPreloadAudio(newPad.id);
      };

      audio.onended = () => {
        if (deletedPadIdsRef.current.has(newPad.id)) return;
        clearProgressInterval();
        setAllPads((prev) =>
          prev.map((p) =>
            p.id === newPad.id ? { ...p, status: "ready", currentTime: 0 } : p,
          ),
        );
        setActivePadId(null);
      };

      audio.onerror = () => {
        if (deletedPadIdsRef.current.has(newPad.id)) return;
        cleanupPreloadAudio(newPad.id);
        setAllPads((prev) =>
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
      activeBankId,
      settings.defaultVolume,
      settings.normalizeVolume,
      clearProgressInterval,
      cleanupPreloadAudio,
      updatePadProgress,
    ],
  );

  const removePad = useCallback(
    (padId: string) => {
      playRequestRef.current += 1;
      deletedPadIdsRef.current.add(padId);
      const audio = audioElementsRef.current.get(padId);
      const gainNode = gainNodesRef.current.get(padId);
      if (audio && gainNode) {
        decodeRetryRef.current.delete(padId);
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

      const pad = allPadsRef.current.find((p) => p.id === padId);
      if (activePadId === padId) setActivePadId(null);
      setAllPads((prev) => prev.filter((p) => p.id !== padId));

      cleanupQueueRef.current.push({ padId, pad });
      void runCleanupQueue();
    },
    [activePadId, clearProgressInterval, runCleanupQueue],
  );

  const updatePadName = useCallback((padId: string, name: string) => {
    setAllPads((prev) =>
      prev.map((p) => (p.id === padId ? { ...p, name } : p)),
    );
  }, []);

  const updatePadVolume = useCallback(
    (padId: string, volume: number) => {
      setAllPads((prev) =>
        prev.map((p) => (p.id === padId ? { ...p, volume } : p)),
      );
      const gainNode = gainNodesRef.current.get(padId);
      const pad = allPadsRef.current.find((p) => p.id === padId);
      if (gainNode && pad?.status === "playing") {
        const norm = settings.normalizeVolume
          ? (pad.normalizationGain ?? 1)
          : 1;
        gainNode.gain.value = isMuted ? 0 : Math.min(1, volume * norm);
      }
    },
    [isMuted, settings.normalizeVolume],
  );

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    gainNodesRef.current.forEach((gainNode, padId) => {
      const pad = allPadsRef.current.find((p) => p.id === padId);
      if (pad?.status === "playing") {
        const norm = settings.normalizeVolume
          ? (pad.normalizationGain ?? 1)
          : 1;
        gainNode.gain.value = newMuted
          ? 0
          : Math.min(1, (pad.volume ?? settings.defaultVolume) * norm);
      }
    });
  }, [isMuted, settings.defaultVolume, settings.normalizeVolume]);

  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const resetAllPads = useCallback(() => {
    playRequestRef.current += 1;
    allPadsRef.current.forEach((pad) => deletedPadIdsRef.current.add(pad.id));
    decodeRetryRef.current.clear();
    void stopAllPads();
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
    allPadsRef.current.forEach((pad) => {
      if (pad.audioUrl) {
        revokeStoredAudioURL(pad.audioUrl).catch((e) => {
          console.error("Failed to revoke audio URL:", e);
        });
      }
    });
    clearAllAudioFiles().catch((e) => {
      console.error("Failed to clear stored audio files:", e);
    });
    setAllPads([]);
    setBanks([createDefaultBank()]);
    setActiveBankId(DEFAULT_BANK_ID);
    setSettings(DEFAULT_SETTINGS);
    setIsMuted(false);
    setActivePadId(null);
  }, [stopAllPads, cleanupPreloadAudio]);

  const createBank = useCallback(
    (name: string) => {
      const bankName = name.trim();
      if (!bankName) return null;
      const newBank: AudioBank = { id: createId(), name: bankName };
      setBanks((prev) => [...prev, newBank]);
      void stopAllPads();
      setActiveBankId(newBank.id);
      return newBank;
    },
    [stopAllPads],
  );

  const renameBank = useCallback((bankId: string, name: string) => {
    const nextName = name.trim();
    if (!nextName) return;
    setBanks((prev) =>
      prev.map((bank) =>
        bank.id === bankId ? { ...bank, name: nextName } : bank,
      ),
    );
  }, []);

  const switchBank = useCallback(
    (bankId: string) => {
      if (bankId === activeBankId) return;
      const exists = banks.some((bank) => bank.id === bankId);
      if (!exists) return;
      void stopAllPads();
      setActiveBankId(bankId);
    },
    [activeBankId, banks, stopAllPads],
  );

  const deleteBank = useCallback(
    (bankId: string) => {
      if (banks.length <= 1) return false;
      const exists = banks.some((bank) => bank.id === bankId);
      if (!exists) return false;

      const fallbackBank = banks.find((bank) => bank.id !== bankId);
      if (!fallbackBank) return false;

      const padsToRemove = allPadsRef.current.filter(
        (pad) => pad.bankId === bankId,
      );
      void stopAllPads();
      padsToRemove.forEach((pad) => {
        deletedPadIdsRef.current.add(pad.id);
        cleanupQueueRef.current.push({ padId: pad.id, pad });
      });
      void runCleanupQueue();

      setAllPads((prev) => prev.filter((pad) => pad.bankId !== bankId));
      setBanks((prev) => prev.filter((bank) => bank.id !== bankId));
      setActiveBankId((current) =>
        current === bankId ? fallbackBank.id : current,
      );
      return true;
    },
    [banks, stopAllPads, runCleanupQueue],
  );

  const reorderPads = useCallback(
    (fromIndex: number, toIndex: number) => {
      setAllPads((prev) => {
        const bankPads = prev.filter((p) => p.bankId === activeBankId);
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= bankPads.length ||
          toIndex >= bankPads.length
        ) {
          return prev;
        }

        const movedBankPads = arrayMove(bankPads, fromIndex, toIndex);
        let cursor = 0;
        return prev.map((pad) =>
          pad.bankId === activeBankId ? movedBankPads[cursor++] : pad,
        );
      });
    },
    [activeBankId],
  );

  const pads = useMemo(
    () => allPads.filter((pad) => pad.bankId === activeBankId),
    [allPads, activeBankId],
  );

  const activeBank = useMemo(
    () =>
      banks.find((bank) => bank.id === activeBankId) ??
      banks[0] ??
      createDefaultBank(),
    [banks, activeBankId],
  );

  // Persist pads
  useEffect(() => {
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = window.setTimeout(() => {
      const persistedPads: PersistedAudioPad[] = allPads.map((pad) => ({
        id: pad.id,
        bankId: pad.bankId || DEFAULT_BANK_ID,
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
  }, [allPads]);

  useEffect(() => {
    allPadsRef.current = allPads;
  }, [allPads]);

  useEffect(() => {
    if (!banks.some((bank) => bank.id === activeBankId)) {
      setActiveBankId(banks[0]?.id ?? DEFAULT_BANK_ID);
    }
  }, [banks, activeBankId]);

  useEffect(() => {
    try {
      localStorage.setItem("audioPadSettings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem("audioPadBanks", JSON.stringify(banks));
    } catch (e) {
      console.error("Failed to save banks:", e);
    }
  }, [banks]);

  useEffect(() => {
    try {
      localStorage.setItem("audioPadActiveBankId", activeBankId);
    } catch (e) {
      console.error("Failed to save active bank:", e);
    }
  }, [activeBankId]);

  useEffect(() => {
    gainNodesRef.current.forEach((gainNode, padId) => {
      const pad = allPadsRef.current.find((p) => p.id === padId);
      if (!pad || pad.status !== "playing") return;
      const norm = settings.normalizeVolume ? (pad.normalizationGain ?? 1) : 1;
      gainNode.gain.value = isMuted ? 0 : Math.min(1, pad.volume * norm);
    });
  }, [settings.normalizeVolume, isMuted]);

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
      allPadsRef.current.forEach((pad) => {
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

  return {
    pads,
    allPads,
    banks,
    activeBank,
    activeBankId,
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
    createBank,
    renameBank,
    deleteBank,
    switchBank,
  };
}
