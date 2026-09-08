# OW — Order of Worship archive & viewer

This repo hosts our weekly **Order of Worship** (OW) bulletins as PDFs and serves
them through a small, dependency‑free web viewer on GitHub Pages. The viewer is
embedded in the church Squarespace site so visitors always see the current
week's bulletin, can page back through past editions, and can jump to the
livestream for that service.

Live site: <https://cju-media.github.io/OW/>

## How it works

1. **PDFs live in [`OWs/`](OWs/).** Each file is named for its service date (see
   [naming](#file-naming)).
2. **A GitHub Action rebuilds an index.** On every push that touches `OWs/`,
   [`.github/workflows/generate-ow-index.yml`](.github/workflows/generate-ow-index.yml)
   runs [`scripts/generate-ow-index.js`](scripts/generate-ow-index.js), which
   scans the folder and writes [`OWs/index.json`](OWs/index.json) — a map of
   `date key → { filename, url, display_date }`.
3. **GitHub Pages serves everything** straight from `main`: the PDFs, the
   `index.json`, and the viewer pages.
4. **The viewer reads `index.json`** to populate the edition dropdown and render
   the selected PDF inline.
5. **Livestream matching:** the viewer cross‑references a companion feed
   (`cju-media/FCCLA-Youtube-Checker` → `data/playlist_streams.json`) to show a
   **Watch Service** button linking to the YouTube stream for that date/time.

### Pages

| File | Purpose |
| --- | --- |
| [`OW HTML/OW.html`](OW%20HTML/OW.html) | Primary viewer — title bar, edition dropdown, inline PDF, "Watch Service" / "Open in New Tab" buttons. This is what the Squarespace site embeds. |
| [`index.html`](index.html) | Lightweight fallback viewer — loads a single PDF in an iframe based on the URL path. |
| [`404.html`](404.html) | Captures pretty URLs like `/OWs/1-19-25`, stashes the date, and redirects into the viewer. |

## File naming

The index script parses the **start** of each filename. Both `.` and `-`
separators work, and either underscores or spaces after the date are fine.

| Pattern | Example | Notes |
| --- | --- | --- |
| `M.D.YY OW.pdf` | `1.19.25_OW.pdf`, `3.1.26 OW.pdf` | Standard Sunday bulletin |
| `M.D.YY OW FINAL.pdf` | `6.14.26 OW FINAL.pdf` | `FINAL` wins over other files for the same date |
| `M.D.YY OW Draft.pdf` | `8.9.26 OW Draft.pdf` | `Draft` loses to any non‑draft for the same date |
| `M.D.YY <time>pm.pdf` | `12.24.25_5pm.pdf`, `12.24.25 8pm.pdf` | Multiple services on one day (Christmas Eve, etc.); `am`/`pm` time is part of the key |
| `XMAS <time>pm ...` | `XMAS 8pm.pdf` | Christmas Eve fallback; year inferred from git history if absent |

**Duplicate handling:** if two files resolve to the same date/time key, the
Action keeps one (preferring `FINAL`, then the most recently committed, and
demoting `Draft`) and **deletes the losers from `OWs/`** as part of the index
commit. Don't rely on a superseded file sticking around.

Files that don't start with a parseable date (e.g. a standalone
`*_Palm_Sunday_Insert.pdf`) are ignored by the index and won't appear in the
viewer dropdown.

## Adding or replacing a bulletin

You don't need to clone the repo. In the GitHub web UI:

1. Open [`OWs/`](OWs/) → **Add file → Upload files**.
2. Drop in the PDF, named per the table above.
3. Commit to `main`.
4. The **Generate OW PDF Directory Index** Action runs automatically and commits
   an updated `index.json` (`chore: automated directory matrix update [skip ci]`).
   Give it a minute, then reload the site.

To replace an existing week, upload a new file that resolves to the same date
key (e.g. a `FINAL` over a `Draft`); the Action prunes the old one.

You can also re‑run the indexer manually from the **Actions** tab
(`workflow_dispatch`).

## Working with a local clone

`OWs/` is ~240 MB of PDFs and grows every week. A plain `git clone` pulls all of
it and all of its history. If you only need the code (viewer, script, workflow),
clone without the blobs and check out just what you need:

```bash
# history stays lean; blobs fetch on demand only when you open a file
git clone --filter=blob:none --no-checkout https://github.com/cju-media/OW.git
cd OW
git sparse-checkout set --no-cone '/*' '!/OWs/*.pdf' '!/UCC OWs/*.pdf'
git checkout main
```

This gives you everything except the PDF blobs. Drop the `sparse-checkout` line
if you do want the current PDFs but still want to skip downloading historical
versions.

## Repo layout

```
OW/
├── OWs/                     # weekly bulletins + generated index.json
├── UCC OWs/                 # UCC conference bulletins (not indexed)
├── OW HTML/OW.html          # primary embedded viewer
├── index.html               # fallback single-PDF viewer
├── 404.html                 # pretty-URL router
├── scripts/
│   └── generate-ow-index.js # builds OWs/index.json
└── .github/workflows/
    └── generate-ow-index.yml
```
