# BreadcrumbMermaid

A self-hosted diagram library for Mermaid, built on [Visimer](https://github.com/inkeep/visimer) (`@visimer/react`). Diagrams are edited as text or directly on the canvas, saved to the server as `.mmd` files, and exported as `.mmd`, SVG or PNG.

## How it fits together

| Part | What it does |
|---|---|
| `src/` | React frontend, built with Vite |
| `server.mjs` | Express server: serves the built frontend and stores diagrams in `$DATA_DIR/diagrams` |
| `Dockerfile` | Builds the frontend inside Docker, then produces the runtime image |

The API is `GET /api/diagrams`, `GET /api/diagrams/{name}.mmd` and `PUT /api/diagrams/{name}.mmd`. Saves carry a revision, so a diagram changed elsewhere is not silently overwritten.

## New diagrams

**+ New diagram** offers **Start from blank** or a starter template for each diagram type the editor supports: flowchart, sequence, class, state, entity relationship, user journey, Gantt, pie, quadrant, requirement, Git graph, C4 context, mindmap, timeline, Sankey, XY chart, block, packet, Kanban, architecture, radar and treemap. Templates live in `src/templates.js`. ZenUML is not offered because it needs a Mermaid plugin the app does not load.

## Exports

All exports are under the **Export** menu: **Export .mmd**, **Export SVG** and **Export PNG**, which opens a submenu of the presets below. SVG and PNG are produced in the browser. The diagram is re-rendered off-screen with Mermaid, so the files never contain the editor's selection highlights, click targets or zoom, and the result is cropped to the drawn content with a 16 px margin. A Gantt chart's "today" line is ignored when cropping, so charts dated in the past or future are not padded out to today.

| PNG preset | Scale | Background | Intended for |
|---|---|---|---|
| PowerPoint | 3x | White | Slides |
| Obsidian | 2x | White | Notes |
| Transparent | 3x | None | Placing on coloured backgrounds |

Very large diagrams are exported at a lower scale if they would exceed the browser's canvas limits; the status line says when this happens.

Use PNG rather than SVG for PowerPoint: Office does not reliably draw Mermaid's text labels from SVG.

## Build and deploy

The app is deployed as a Portainer Git stack using `docker-compose.yml`. Portainer clones the repository, builds the image from the `Dockerfile` and starts it. Diagrams are kept in the `diagrams` named volume (shown in Portainer as `<stack name>_diagrams`), so they survive redeploys.

| Portainer setting | Value |
|---|---|
| Repository reference | `refs/heads/main` |
| Compose path | `docker-compose.yml` |
| Environment variables | Optional `HOST_PORT` (default `8082`) |

The app listens on all host interfaces on `HOST_PORT`. Check it at `http://<host>:<port>/health`.

To release: change `version` in `package.json` (also shown in the page header), commit to `main`, tag the commit `v<version>`, then select **Pull and redeploy** on the stack. Each redeploy rebuilds the image because of `pull_policy: build`.

To roll back: revert the commit on `main` (or point the stack's reference at an earlier tag, for example `refs/tags/v1.0.0`) and redeploy. Do not delete the `diagrams` volume when removing or recreating the stack.

## Local development

```sh
npm ci
DATA_DIR=./data node server.mjs   # terminal 1, API on port 8080
npm run dev                       # terminal 2, frontend with live reload
```
