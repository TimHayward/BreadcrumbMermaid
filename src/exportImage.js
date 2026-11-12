// SVG and PNG export.
//
// The diagram is re-rendered off-screen with Mermaid rather than copied from
// the editing canvas, so the output never carries Visimer's editing artefacts
// (pan/zoom transform, invisible click targets on arrows, selection glow).
// The result is then cropped to what is actually drawn, because Mermaid's own
// viewBox can include a large empty margin.

const SVG_NS = 'http://www.w3.org/2000/svg';
const MARGIN = 16; // px of space kept around the diagram
const MAX_CANVAS_SIDE = 16384; // browser limit on canvas width or height
const MAX_CANVAS_AREA = 268_000_000; // browser limit on canvas pixels

export const PNG_PRESETS = {
  powerpoint: { label: 'PowerPoint (3x, white)', scale: 3, background: '#ffffff' },
  obsidian: { label: 'Obsidian (2x, white)', scale: 2, background: '#ffffff' },
  transparent: { label: 'Transparent (3x)', scale: 3, background: null }
};

let renderCount = 0;

function parseSvg(markup) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(markup, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    // Mermaid occasionally returns markup that is valid HTML but not strict XML.
    const element = parser.parseFromString(markup, 'text/html').body.firstElementChild;
    if (element?.localName !== 'svg' || element.namespaceURI !== SVG_NS) {
      throw new Error('Mermaid did not return an SVG diagram.');
    }
    doc = parser.parseFromString(new XMLSerializer().serializeToString(element), 'image/svg+xml');
  }
  const root = doc.documentElement;
  if (root.localName !== 'svg' || doc.querySelector('parsererror')) {
    throw new Error(doc.querySelector('parsererror')?.textContent || 'Invalid SVG output.');
  }
  return root;
}

const isClear = (value) =>
  !value || value === 'none' || value === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(value);

// Bounds, in the SVG's own coordinates, of every element that is actually visible.
function visibleBounds(svg) {
  const toSvg = svg.getScreenCTM()?.inverse();
  if (!toSvg) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  svg.querySelectorAll('rect,path,circle,ellipse,polygon,polyline,line,text,foreignObject,image').forEach((el) => {
    if (el.closest('defs,marker,clipPath,mask')) return;
    // Gantt's "today" line can sit far outside the chart when the tasks are in
    // the past or future; cropping to it would leave a huge empty strip.
    if (el.closest('.today')) return;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;
    const tag = el.localName.toLowerCase();
    const isShape = !['text', 'foreignobject', 'image'].includes(tag);
    const noFill = isClear(style.fill) || parseFloat(style.fillOpacity) === 0;
    const noStroke = isClear(style.stroke) || parseFloat(style.strokeOpacity) === 0 || parseFloat(style.strokeWidth) === 0;
    if (isShape && noFill && noStroke) return;

    const box = el.getBoundingClientRect();
    if (!box.width && !box.height) return;
    for (const [x, y] of [[box.left, box.top], [box.right, box.bottom]]) {
      const p = new DOMPoint(x, y).matrixTransform(toSvg);
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  });

  return Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null;
}

function declaredBounds(svg) {
  const parts = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (parts?.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
    return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
  }
  return null;
}

/**
 * Render `code` off-screen and return a cleaned, cropped SVG.
 * Resolves to { svg: string, width: number, height: number }.
 */
export async function renderExportSvg(mermaid, code) {
  // Off-screen but laid out normally (not visibility:hidden), so that the
  // visible-content measurement below sees the real computed styles.
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:1600px;pointer-events:none';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);

  try {
    const { svg: markup } = await mermaid.render(`export-${Date.now()}-${++renderCount}`, code, host);
    const svg = document.importNode(parseSvg(markup), true);
    host.replaceChildren(svg);

    const fallback = declaredBounds(svg);
    const drawn = visibleBounds(svg);
    const area = drawn
      ? { x: drawn.x - MARGIN, y: drawn.y - MARGIN, width: drawn.width + MARGIN * 2, height: drawn.height + MARGIN * 2 }
      : fallback;
    if (!area) throw new Error('Could not determine the diagram size.');

    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox', `${area.x} ${area.y} ${area.width} ${area.height}`);
    svg.setAttribute('width', String(area.width));
    svg.setAttribute('height', String(area.height));
    svg.style.removeProperty('max-width');
    svg.style.removeProperty('width');
    svg.style.removeProperty('height');

    return { svg: new XMLSerializer().serializeToString(svg), width: area.width, height: area.height };
  } finally {
    host.remove();
  }
}

/** Draw an exported SVG onto a canvas and resolve to a PNG Blob. */
export async function svgToPng({ svg, width, height }, { scale, background }) {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();

  // Reduce the scale if the result would exceed the browser's canvas limits.
  const factor = Math.min(
    scale,
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height,
    Math.sqrt(MAX_CANVAS_AREA / (width * height))
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * factor);
  canvas.height = Math.ceil(height * factor);
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.scale(factor, factor);
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The browser could not encode the PNG.');
  return { blob, reducedScale: factor < scale ? factor : null };
}
