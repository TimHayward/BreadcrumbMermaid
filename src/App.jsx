import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { MermaidWysiwyg } from '@visimer/react';
import { listDiagrams, openDiagram, saveDiagram } from './api.js';
import { MERMAID_CONFIG } from './mermaidConfig.js';
import { PNG_PRESETS, renderExportSvg, svgToPng } from './exportImage.js';

const STARTER = `flowchart TD
  A[Start] --> B{Ready?}
  B -->|Yes| C[Finish]
  B -->|No| A
`;

const MAX_IMPORT_BYTES = 1_000_000;

function downloadText(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const shortError = (error) => String(error?.message || error).replace(/\s+/g, ' ').slice(0, 240);

export default function App() {
  const [code, setCode] = useState(STARTER);
  const [name, setName] = useState('Untitled');
  const [savedFile, setSavedFile] = useState(null);
  const [savedCode, setSavedCode] = useState(null);
  const [revision, setRevision] = useState(null);
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('Save to keep this diagram on the server.');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(null); // 'svg' | 'png' | null
  const [download, setDownload] = useState(null);
  const [pngPreset, setPngPreset] = useState('powerpoint');
  const exportLock = useRef(false);
  const fileInput = useRef(null);

  const baseName = name || 'diagram';
  const dirty = code !== savedCode || `${name}.mmd` !== savedFile;

  const refreshList = () => listDiagrams().then(setFiles);

  useEffect(() => {
    refreshList().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Release the previous export's object URL when it is replaced.
  useEffect(() => () => {
    if (download) URL.revokeObjectURL(download.url);
  }, [download]);

  const confirmDiscard = () =>
    !dirty || window.confirm('Discard unsaved changes? Export first if you want to keep them.');

  function newDiagram() {
    if (!confirmDiscard()) return;
    setCode(STARTER);
    setName('Untitled');
    setSavedFile(null);
    setRevision(null);
    setSavedCode(null);
    setStatus('New diagram.');
  }

  async function open(file) {
    if (!confirmDiscard()) return;
    setBusy(true);
    try {
      const result = await openDiagram(file);
      setCode(result.code);
      setSavedCode(result.code);
      setName(file.slice(0, -4));
      setSavedFile(file);
      setRevision(result.revision);
      setStatus('Opened from server.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const file = `${name}.mmd`;
      const result = await saveDiagram(file, code, file === savedFile ? revision : null);
      setSavedCode(code);
      setSavedFile(file);
      setRevision(result.revision);
      setStatus('Saved to server.');
      await refreshList();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function importFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || !confirmDiscard()) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setStatus('Import must be smaller than 1 MB.');
      return;
    }
    const text = await file.text();
    setCode(text);
    setName(file.name.replace(/\.[^.]+$/, ''));
    setSavedFile(null);
    setSavedCode(null);
    setRevision(null);
    setStatus('Imported. Save to keep on server.');
  }

  async function exportImage(kind) {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(kind);
    setDownload(null);
    const label = kind.toUpperCase();
    setStatus(`Preparing ${label}… Large diagrams may take a moment.`);
    try {
      const rendered = await renderExportSvg(mermaid, code);
      let blob;
      let note = '';
      if (kind === 'svg') {
        blob = new Blob([rendered.svg], { type: 'image/svg+xml;charset=utf-8' });
      } else {
        const result = await svgToPng(rendered, PNG_PRESETS[pngPreset]);
        blob = result.blob;
        if (result.reducedScale) {
          note = ` The diagram is very large, so it was exported at ${result.reducedScale.toFixed(1)}x.`;
        }
      }
      setDownload({ kind, url: URL.createObjectURL(blob), filename: `${baseName}.${kind}`, source: code });
      setStatus(`${label} ready. Click Download ${label} below to save the file, or Open ${label} to view it.${note}`);
    } catch (error) {
      setStatus(`${label} export failed: ${shortError(error)}`);
    } finally {
      exportLock.current = false;
      setExporting(null);
    }
  }

  // Only offer a download that still matches what is on screen.
  const showDownload = download && download.source === code && download.filename === `${baseName}.${download.kind}`;
  const downloadLabel = download?.kind.toUpperCase();

  return (
    <div className="app">
      <header>
        <strong>Diagram library</strong>
        <span>Visimer · Mermaid · v{__APP_VERSION__}</span>
      </header>
      <div className="workspace">
        <aside>
          <button disabled={busy} onClick={newDiagram}>+ New diagram</button>
          <h2>Saved diagrams</h2>
          {files.length === 0 && <p>No saved diagrams yet.</p>}
          {files.map((file) => (
            <button className="file" key={file} disabled={busy} onClick={() => open(file)}>
              {file.slice(0, -4)}
            </button>
          ))}
        </aside>
        <main>
          <div className="toolbar">
            <input aria-label="Diagram name" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
            <button disabled={busy} onClick={save}>Save{dirty ? ' *' : ''}</button>
            <button disabled={busy} onClick={() => fileInput.current.click()}>Import .mmd</button>
            <button onClick={() => downloadText(code, `${baseName}.mmd`, 'text/plain;charset=utf-8')}>Export .mmd</button>
            <button disabled={busy || exporting !== null} onClick={() => exportImage('svg')}>
              {exporting === 'svg' ? 'Exporting SVG…' : 'Export SVG'}
            </button>
            <span className="png-export">
              <select aria-label="PNG preset" value={pngPreset} onChange={(e) => setPngPreset(e.target.value)}>
                {Object.entries(PNG_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.label}</option>
                ))}
              </select>
              <button disabled={busy || exporting !== null} onClick={() => exportImage('png')}>
                {exporting === 'png' ? 'Exporting PNG…' : 'Export PNG'}
              </button>
            </span>
            <input ref={fileInput} type="file" accept=".mmd,.txt" hidden onChange={importFile} />
          </div>
          <p role="status" className="status">{status}</p>
          {showDownload && (
            <div className="export-download">
              <strong>Your {downloadLabel} is ready</strong>
              <a href={download.url} download={download.filename}>Download {downloadLabel}</a>
              <a href={download.url} target="_blank" rel="noopener noreferrer">Open {downloadLabel}</a>
              <span>{download.filename}</span>
            </div>
          )}
          <div className="editors">
            <label className="source">
              Mermaid source
              <textarea spellCheck="false" value={code} disabled={busy} onChange={(e) => setCode(e.target.value)} />
            </label>
            <div className="preview">
              <MermaidWysiwyg code={code} onCodeChange={setCode} mermaid={mermaid} mermaidConfig={MERMAID_CONFIG} panZoom />
            </div>
          </div>
          <footer>
            Zoom with +/− or Ctrl/⌘ + scroll; drag empty canvas to pan. Fit restores the overview. Double-click labels to edit.
          </footer>
        </main>
      </div>
    </div>
  );
}
