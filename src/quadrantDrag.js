import { useEffect, useRef } from 'react';

// Ctrl/⌘ + drag to move a point on a quadrantChart.
//
// Visimer can select and relabel quadrant points but cannot move them, so this
// works directly on Mermaid's rendered SVG. While dragging, only the point's
// SVG is moved; the source is rewritten once, on release, so Visimer
// re-renders a single time rather than on every mouse movement.
//
// Mermaid specifics this relies on (mermaid 11, quadrantRenderer):
// - points are <g class="data-point"> inside <g class="data-points">;
// - the plot area is the union of the four <g class="quadrant"> rects, and
//   point coordinates map linearly onto it (y = 1 at the top);
// - points are drawn in reverse source order (addPoints prepends).

const POINT_LINE = /(:\s*)\[\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\]/;
const MIN_MOVE_PX = 3;

const firstStatement = (code) =>
  code.split('\n').find((line) => line.trim() && !line.trim().startsWith('%%'))?.trim() ?? '';

export const isQuadrantChart = (code) => /^quadrantChart\b/.test(firstStatement(code));

// Line numbers of point definitions, in source order.
function pointLines(lines) {
  const header = lines.findIndex((line) => /^\s*quadrantChart\b/.test(line));
  const result = [];
  lines.forEach((line, index) => {
    const text = line.trim();
    if (index <= header || text.startsWith('%%') || /^(title|x-axis|y-axis|quadrant-\d|classDef)\b/.test(text)) return;
    if (POINT_LINE.test(line)) result.push(index);
  });
  return result;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value * 100) / 100;

function plotBounds(svg) {
  const rects = [...svg.querySelectorAll('g.quadrants rect')].map((rect) => rect.getBoundingClientRect());
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return right > left && bottom > top ? { left, top, right, bottom, width: right - left, height: bottom - top } : null;
}

export function useQuadrantDrag(hostRef, code, setCode, setStatus) {
  const latest = useRef({ code, setCode, setStatus });
  latest.current = { code, setCode, setStatus };
  const enabled = isQuadrantChart(code);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !enabled) return undefined;

    const withModifier = (event) => event.ctrlKey || event.metaKey;
    const pointAt = (event) => event.target instanceof Element ? event.target.closest('g.data-point') : null;

    // Show a move cursor over points while Ctrl/⌘ is held.
    const setReady = (event) => host.classList.toggle('quadrant-drag-ready', withModifier(event));
    const clearReady = () => host.classList.remove('quadrant-drag-ready');

    function onPointerDown(event) {
      if (event.button !== 0 || !withModifier(event)) return;
      const point = pointAt(event);
      const svg = point?.ownerSVGElement;
      if (!point || !svg) return;
      // Keep Visimer from panning or selecting while we drag.
      event.preventDefault();
      event.stopPropagation();

      const { code: source, setStatus: status } = latest.current;
      const lines = source.split('\n');
      const sourcePoints = pointLines(lines);
      const drawn = [...svg.querySelectorAll('g.data-point')];
      const bounds = plotBounds(svg);
      if (!bounds || drawn.length !== sourcePoints.length) {
        status('Could not match this point to the source. Edit its coordinates in the source instead.');
        return;
      }
      const lineIndex = sourcePoints[sourcePoints.length - 1 - drawn.indexOf(point)];
      const label = point.querySelector('text')?.textContent ?? 'point';

      const circle = point.querySelector('circle').getBoundingClientRect();
      const start = { x: circle.left + circle.width / 2, y: circle.top + circle.height / 2 };
      const toLocal = point.getScreenCTM()?.inverse();
      if (!toLocal) return;
      const local = (x, y) => new DOMPoint(x, y).matrixTransform(toLocal);
      const origin = local(start.x, start.y);
      const grab = { x: event.clientX - start.x, y: event.clientY - start.y };
      let value = null;

      point.classList.add('quadrant-dragging');

      function onMove(move) {
        const centre = {
          x: clamp(move.clientX - grab.x, bounds.left, bounds.right),
          y: clamp(move.clientY - grab.y, bounds.top, bounds.bottom)
        };
        if (!value && Math.hypot(centre.x - start.x, centre.y - start.y) < MIN_MOVE_PX) return;
        const moved = local(centre.x, centre.y);
        point.setAttribute('transform', `translate(${moved.x - origin.x} ${moved.y - origin.y})`);
        value = {
          x: round((centre.x - bounds.left) / bounds.width),
          y: round(1 - (centre.y - bounds.top) / bounds.height)
        };
        status(`Moving ${label}: [${value.x.toFixed(2)}, ${value.y.toFixed(2)}]`);
      }

      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        point.classList.remove('quadrant-dragging');
        if (!value) return;
        // Stop the click that follows the drag from changing Visimer's selection.
        // The click, if any, is dispatched in the same task as pointerup.
        const swallowClick = (click) => click.stopPropagation();
        window.addEventListener('click', swallowClick, true);
        setTimeout(() => window.removeEventListener('click', swallowClick, true), 0);

        const { code: current, setCode: update, setStatus: report } = latest.current;
        if (current !== source) {
          point.removeAttribute('transform');
          report('The source changed during the drag, so the move was not applied.');
          return;
        }
        const coords = `[${value.x.toFixed(2)}, ${value.y.toFixed(2)}]`;
        lines[lineIndex] = lines[lineIndex].replace(POINT_LINE, (_, colon) => `${colon}${coords}`);
        update(lines.join('\n'));
        report(`Moved ${label} to ${coords}.`);
      }

      function onCancel() {
        value = null;
        point.removeAttribute('transform');
        onUp();
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }

    // On macOS, Ctrl+click opens the context menu; don't let it over a point.
    function onContextMenu(event) {
      if (event.ctrlKey && pointAt(event)) event.preventDefault();
    }

    host.addEventListener('pointerdown', onPointerDown, true);
    host.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('keydown', setReady);
    window.addEventListener('keyup', setReady);
    window.addEventListener('blur', clearReady);
    return () => {
      host.removeEventListener('pointerdown', onPointerDown, true);
      host.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('keydown', setReady);
      window.removeEventListener('keyup', setReady);
      window.removeEventListener('blur', clearReady);
      clearReady();
    };
  }, [hostRef, enabled]);

  return enabled;
}
