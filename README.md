# BreadcrumbMermaid

A self-hosted diagram library for Mermaid, built on [Visimer](https://github.com/inkeep/visimer) (`@visimer/react`). Diagrams are edited as text or directly on the canvas, saved to the server as `.mmd` files, and exported as `.mmd`, SVG or PNG.

## How it fits together

| Part | What it does |
|---|---|
| `src/` | React frontend, built with Vite |
| `server.mjs` | Express server: serves the built frontend and stores diagrams in `$DATA_DIR/diagrams` |
| `Dockerfile` | Builds the frontend inside Docker, then produces the runtime image |

The API is `GET /api/diagrams`, `GET /api/diagrams/{name}.mmd` and `PUT /api/diagrams/{name}.mmd`. Saves carry a revision, so a diagram changed elsewhere is not silently overwritten.

## Exports

SVG and PNG are produced in the browser. The diagram is re-rendered off-screen with Mermaid, so the files never contain the editor's selection highlights, click targets or zoom, and the result is cropped to the drawn content with a 16 px margin.

| PNG preset | Scale | Background | Intended for |
|---|---|---|---|
| PowerPoint | 3x | White | Slides |
| Obsidian | 2x | White | Notes |
| Transparent | 3x | None | Placing on coloured backgrounds |

Very large diagrams are exported at a lower scale if they would exceed the browser's canvas limits; the status line says when this happens.

Use PNG rather than SVG for PowerPoint: Office does not reliably draw Mermaid's text labels from SVG.

## Build and deploy

On the Docker host:

```sh
git clone git@github-visimer:TimHayward/BreadcrumbMermaid.git   # first time only
cd BreadcrumbMermaid
git pull
docker build -t visimer-app:$(node -p "require('./package.json').version" 2>/dev/null || echo latest) .
```

If Node is not installed on the host, give the tag explicitly, for example `docker build -t visimer-app:1.1.0 .`

Then in Portainer, edit the `visimer` stack, change the `image:` tag to the new version and select **Update the stack**. Keep the previous image on the host as the rollback: because the stack uses `pull_policy: never`, reverting the tag is enough.

Versioning: change `version` in `package.json`, which also updates the version shown in the page header, and tag the commit `v<version>`.

## Local development

```sh
npm ci
DATA_DIR=./data node server.mjs   # terminal 1, API on port 8080
npm run dev                       # terminal 2, frontend with live reload
```
