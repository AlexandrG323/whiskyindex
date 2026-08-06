# Brand originals

Full-resolution sources for the logo and sidebar banner, kept for re-cropping
and re-export. **Nothing here is served or bundled** — it sits outside
`public/`, so Vite never copies it into `dist/`, and `.dockerignore` keeps it
out of the image build entirely.

What the app actually loads is `frontend/public/icons/{logo,banner}.webp`.

| file | original | shipped |
| --- | --- | --- |
| logo | 1254×1254 PNG, 1.6 MB | 256×256 WebP, ~10 KB |
| banner | 1536×1024 PNG, 1.7 MB | 600×400 WebP, ~12 KB |

## Re-exporting

Needs `cwebp` (`brew install webp`). From this directory:

```sh
cwebp -q 85 -resize 256 0 logo.png   -o ../public/icons/logo.webp
cwebp -q 82 -resize 600 0 banner.png -o ../public/icons/banner.webp
```

A `0` for the second `-resize` argument preserves the aspect ratio.

Sizes are set from how the assets actually render — the logo at ~48–56 px and
the banner at ~250 px wide — leaving roughly 2× headroom for retina. Going
larger costs bytes on first paint for no visible gain.

Anything added under `public/` requires `docker compose up -d --build frontend`
to appear; nginx serves the baked image, not the working tree. Note that a
missing file there returns the SPA fallback — HTTP 200 with `text/html` — so
verify the content type, not just the status code.
