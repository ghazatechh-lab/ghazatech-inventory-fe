import React from "react";
import { Volume2, VolumeX } from "lucide-react";

const ENABLED_KEY = "ghazatech.ui.clickSound.enabled";
const VOLUME_KEY = "ghazatech.ui.clickSound.volume";
const TARGETS = [
  "button", "a[href]", "select", "summary", "[data-click-sound]",
  "[role='button']", "[role='tab']", "[role='menuitem']", "[role='option']",
  "[role='checkbox']", "[role='radio']", "[role='switch']", "[role='combobox']",
  "input[type='button']", "input[type='submit']", "input[type='reset']",
  "input[type='checkbox']", "input[type='radio']",
].join(", ");

function readEnabled() {
  try { return window.localStorage.getItem(ENABLED_KEY) !== "false"; }
  catch { return true; }
}
function readVolume() {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 75;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 75;
  } catch { return 75; }
}

export default function GlobalClickSound() {
  const [enabled, setEnabled] = React.useState(readEnabled);
  const [volume, setVolume] = React.useState(readVolume);
  const [showVolume, setShowVolume] = React.useState(false);
  const contextRef = React.useRef(null);
  const enabledRef = React.useRef(enabled);
  const volumeRef = React.useRef(volume);
  enabledRef.current = enabled;
  volumeRef.current = volume;

  const play = React.useCallback((force = false) => {
    if ((!force && !enabledRef.current) || volumeRef.current <= 0) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!contextRef.current || contextRef.current.state === "closed") {
        contextRef.current = new AudioContextClass();
      }
      const audio = contextRef.current;
      if (audio.state === "suspended") void audio.resume().catch(() => {});
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const envelope = audio.createGain();
      // Crisp, short UI tap. Adjustable peak 0..0.16, vs 0.025 in original version.
      const peak = 0.16 * (volumeRef.current / 100);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.055);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.004);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.072);
      osc.connect(envelope);
      envelope.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Browser audio policies must never interrupt normal UI actions.
    }
  }, []);

  React.useEffect(() => {
    const controlFrom = (event) => {
      if (!(event.target instanceof Element)) return null;
      const target = event.target.closest(TARGETS);
      if (!target || target.matches(":disabled, [aria-disabled='true'], [inert]")) return null;
      if (target.closest("[inert], [aria-disabled='true']")) return null;
      return target;
    };
    const pointer = (event) => {
      if (!event.isTrusted || event.button !== 0) return;
      if (controlFrom(event)) play();
    };
    const keyboard = (event) => {
      if (!event.isTrusted || event.repeat || !["Enter", " "].includes(event.key)) return;
      if (controlFrom(event)) play();
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", keyboard, true);
      if (contextRef.current) void contextRef.current.close().catch(() => {});
      contextRef.current = null;
    };
  }, [play]);

  const toggle = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try { window.localStorage.setItem(ENABLED_KEY, String(next)); } catch {}
    if (next) play(true);
  };
  const updateVolume = (event) => {
    const next = Number(event.target.value);
    volumeRef.current = next;
    setVolume(next);
    try { window.localStorage.setItem(VOLUME_KEY, String(next)); } catch {}
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2" data-click-sound-controls>
      <button
        type="button"
        onClick={toggle}
        aria-label={enabled ? "Mute click sounds" : "Enable click sounds"}
        title={enabled ? "Mute click sounds" : "Enable click sounds"}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md backdrop-blur hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        {enabled ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={() => setShowVolume((value) => !value)}
        aria-label="Adjust click sound volume"
        aria-expanded={showVolume}
        title="Adjust click sound volume"
        className="rounded-full border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-md hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        {volume}%
      </button>
      {showVolume ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <label htmlFor="ghazatech-click-volume" className="whitespace-nowrap text-xs text-slate-600 dark:text-slate-200">Click volume</label>
          <input
            id="ghazatech-click-volume"
            type="range"
            min="0"
            max="100"
            step="5"
            value={volume}
            onChange={updateVolume}
            onPointerUp={() => play(true)}
            className="w-28 accent-blue-600"
            aria-label="Click sound volume"
          />
        </div>
      ) : null}
    </div>
  );
}
