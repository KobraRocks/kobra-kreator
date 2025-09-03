# 🌐 Web Media & Font Format Compatibility Matrix

| Format                          | Chrome | Firefox | Safari (macOS)                | Edge | iOS Safari  | Android |
| ------------------------------- | ------ | ------- | ----------------------------- | ---- | ----------- | ------- |
| **AUDIO**                       |        |         |                               |      |             |         |
| MP3 (`.mp3`)                    | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| Ogg Vorbis (`.ogg`)             | ✅      | ✅       | ❌ (old), ✅ (recent macOS)     | ✅    | ❌           | ✅       |
| Opus (`.opus`, `.ogg`, `.webm`) | ✅      | ✅       | ⚠️ partial                    | ✅    | ⚠️ partial  | ✅       |
| AAC / M4A (`.aac`, `.m4a`)      | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| WAV (`.wav`)                    | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| **IMAGES**                      |        |         |                               |      |             |         |
| JPEG (`.jpg`, `.jpeg`)          | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| PNG (`.png`)                    | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| GIF (`.gif`)                    | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| WebP (`.webp`)                  | ✅      | ✅       | ✅ (Safari 14+)                | ✅    | ✅ (iOS 14+) | ✅       |
| AVIF (`.avif`)                  | ✅      | ✅       | ✅ (Safari 16+)                | ✅    | ✅ (iOS 16+) | ✅       |
| SVG (`.svg`)                    | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| **VIDEO**                       |        |         |                               |      |             |         |
| MP4 (H.264 + AAC)               | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| WebM (VP8/VP9 + Opus)           | ✅      | ✅       | ⚠️ partial                    | ✅    | ⚠️ partial  | ✅       |
| AV1 (`.av1` in WebM/MP4)        | ✅      | ✅       | ⚠️ (experimental, Safari 17+) | ✅    | ❌ / partial | ✅       |
| Ogg Theora (`.ogv`)             | ✅      | ✅       | ❌                             | ✅    | ❌           | ✅       |
| **FONTS**                       |        |         |                               |      |             |         |
| WOFF2 (`.woff2`)                | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| WOFF (`.woff`)                  | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| TTF / OTF (`.ttf`, `.otf`)      | ✅      | ✅       | ✅                             | ✅    | ✅           | ✅       |
| EOT (`.eot`)                    | ❌      | ❌       | ❌                             | ❌    | ❌           | ❌       |
| SVG Fonts                       | ❌      | ❌       | ❌                             | ❌    | ❌           | ❌       |

