// Global keyboard shortcuts (SPEC §16). W A S D / arrows belong to the camera rig, N to the reactor view,
// Page Up / Page Down to the presenter overlay.
import { useEffect } from 'react';
import { useApp } from '../store';
import { STATION_IDS } from '../types';
import { openStation, takeScreenshot, toggleFullscreen } from './live';

function isTyping(target: EventTarget | null, key: string): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    // Range sliders and checkboxes only need arrows, Home/End, Page keys and Space; let other shortcuts through.
    if (type === 'range' || type === 'checkbox' || type === 'radio') {
      return key.startsWith('Arrow') || key === 'Home' || key === 'End' || key === 'PageUp' || key === 'PageDown' || key === ' ';
    }
    return true;
  }
  if (el.getAttribute('role') === 'slider') return key.startsWith('Arrow') || key === 'Home' || key === 'End' || key === 'PageUp' || key === 'PageDown';
  return false;
}

/** Space on a focused button or switch should press it, not toggle play. */
function isPressable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'switch' || el.getAttribute('role') === 'tab';
}

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.defaultPrevented) return;
      if (isTyping(e.target, e.key)) return;
      const s = useApp.getState();
      const key = e.key;

      if (key === 'Escape') {
        if (s.placePickerOpen) s.setPlacePickerOpen(false);
        else if (s.sourcesOpen) s.closeSources();
        else if (s.helpOpen) s.setHelpOpen(false);
        else if (s.inside) s.closeInside();
        else if (s.tool && !(s.screen === 'beyond' && s.tool === 'beyond')) s.openTool(null);
        else if (s.selectedStation) s.selectStation(null);
        else if (s.selectedDistrict) s.selectDistrict(null);
        else if (s.screen !== 'title' && s.cameraMode !== 'map') s.setCameraMode('map');
        else return;
        e.preventDefault();
        return;
      }
      if (key === 'f' || key === 'F') { if (!e.repeat) toggleFullscreen(); e.preventDefault(); return; }
      if (key === '?') { s.setHelpOpen(!s.helpOpen); e.preventDefault(); return; }
      if (s.screen === 'title') return;
      // While a modal is open, only Esc, F and ? work.
      if (s.placePickerOpen || s.helpOpen) return;

      if (key === ' ' || key === 'Spacebar') {
        if (isPressable(e.target)) return;
        if (!e.repeat) s.togglePlay();
        e.preventDefault();
        return;
      }
      if (key === '[') { s.stepHour(-1); e.preventDefault(); return; }
      if (key === ']') { s.stepHour(1); e.preventDefault(); return; }
      if (e.repeat) return;

      if (/^[0-9]$/.test(key)) {
        const n = parseInt(key, 10);
        const id = STATION_IDS[(n + 9) % 10];
        if (id) s.flyTo(id);
        e.preventDefault();
        return;
      }
      switch (key) {
        case 'm': case 'M':
          s.setCameraMode(s.cameraMode === 'map' ? 'orbit' : 'map');
          break;
        case 'e': case 'E': {
          if (s.inside) return;
          const id = s.nearStation ?? s.selectedStation;
          if (!id || !openStation(id)) return;
          break;
        }
        case 'r': case 'R': {
          if (s.inside) return;
          const id = s.nearStation ?? s.selectedStation;
          if (id !== 'reactor') return;
          s.openTool('reactorRow');
          break;
        }
        case 'p': case 'P':
          s.setPresenter(!s.presenter);
          break;
        case 's': case 'S':
          // S is also "walk back" for the camera rig; only take a screenshot when not walking.
          if (s.cameraMode === 'walk') return;
          takeScreenshot();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
