// Pointer cursor for clickable 3D things.
export function setCursor(over: boolean) {
  if (typeof document !== 'undefined') document.body.style.cursor = over ? 'pointer' : '';
}

/** Stop DOM pointer events inside a 3D card from reaching the canvas (orbit controls, clicks behind it). */
export const stopCanvasEvents = {
  onPointerDown: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  onPointerUp: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  onPointerMove: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  onDoubleClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  onWheel: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  onContextMenu: (e: { stopPropagation: () => void }) => e.stopPropagation(),
};
