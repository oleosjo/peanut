# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **static website** deployed via GitHub Pages (custom domain in `CNAME`, `asinglepeanut.com`). There is **no build system, package manager, or backend** — nothing to install or compile. `python3` and `node` are already available on the VM.

It contains three independent static "products":
- **Root peanut viewer** (`index.html`): a 3D peanut using Google `<model-viewer>` loaded from the jsDelivr CDN, rendering `peanut.glb`. Requires internet access to `cdn.jsdelivr.net`.
- **`malvolia/`**: a Godot 4 WebAssembly game (`index.wasm` ~36 MB). Its loader needs **cross-origin isolation** — the server must send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, or it will fall back to installing a service worker.
- **`asciiworld/`**: a legacy Java Applet. Java Applets are unsupported by all modern browsers, so this page cannot run (dead legacy content).

### Running (development)

Serve the repo root over HTTP (opening via `file://` breaks ES modules / CDN / WASM loading).

- Peanut viewer only: `python3 -m http.server 8000` from repo root, then open `http://localhost:8000/`.
- To also boot the Malvolia Godot game, use a server that sets COOP/COEP headers, e.g.:

  ```bash
  python3 -c '
  from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
  class H(SimpleHTTPRequestHandler):
      def end_headers(self):
          self.send_header("Cross-Origin-Opener-Policy","same-origin")
          self.send_header("Cross-Origin-Embedder-Policy","require-corp")
          super().end_headers()
  ThreadingHTTPServer(("0.0.0.0",8000),H).serve_forever()
  '
  ```

### Lint / test / build

There are **no lint, test, or build steps** — the repo ships prebuilt static assets only.

### Notes

- Godot's exported web build logs many benign console errors (e.g. `EditorInterface` parse errors) that do **not** affect the running game.
