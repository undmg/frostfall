# ❄ Frostfall — The Obsidian Keep

A dark-fantasy portfolio built as a single cinematic journey. You start outside —
a monochrome keep under a winter moon — and scroll to *dolly into the gate*.
The only color in the cold world is the fire waiting behind the portcullis.
Pass through it, and the same obsidian noir is lit by that fire.

![palette](https://img.shields.io/badge/palette-black%20·%20gray%20·%20white-b9bfc5) ![outside](https://img.shields.io/badge/outside-winter%20blue-9fb6c9) ![inside](https://img.shields.io/badge/inside-fire-e05a2b) ![deps](https://img.shields.io/badge/dependencies-0-6b7278)

## The concept

- **Strict palette.** Black, gray, white. Outside gets an ice-blue winter cast;
  inside gets red / orange / gold. Nothing else, ever.
- **The Approach** (`js/scene.js`) — a pinned, scroll-driven camera. Four castle
  layers (ridge, rear towers, gatehouse, framing bastions) zoom exponentially
  toward the gate at different depths, so scrolling *feels* like walking in.
- **Text that lurks in the world.** Lines of copy sit around the towers in 3D —
  they grow, drift outward, motion-blur, and fly past the camera as you advance.
- **One flame.** The gate's fire and the arrow-slit windows brighten as you
  approach, until the pass-through floods the screen — then the world crossfades:
  cold sky → warm hall, snow → rising embers, white cursor-dot → gold.
- **The Interior** — The Great Hall (about), The Forge (skills), The Vault
  (works), The Ravenry (contact). Stone-banded walls, hearth-glow portrait,
  flickering numerals, ember auras.
- **Noir texture everywhere** — animated film grain, cinematic letterbox bars
  that retract once you're inside, vignette, custom cursor.
- **Zero dependencies, no build step.** Hand-written HTML/CSS/JS; the castle is
  inline SVG; snow/stars/embers share one canvas engine with wind gusts.
- **Considered** — reduced-motion visitors skip the dolly and land inside;
  mobile menu; keyboard-focusable cards; opt-in WebAudio wind.

> Easter egg: press **B** for a blizzard flash.

## Run it

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

Or just open `index.html`.

## Make it yours

| Change | Where |
| --- | --- |
| Copy, projects, floating approach lines | `index.html` (`.ftext` elements carry `data-p` timing, `data-x/y` position) |
| Palette | `:root` in `css/style.css` |
| Camera speed / zoom | `data-k` per `.layer`, and `.approach` height in CSS |
| Particle density, wind | `build()` in `js/scene.js` |
| Contact behaviour | `#ravenForm` handler in `js/main.js` |

## Structure

```
index.html      # approach stage (castle SVG, floating text) + interior sections
css/style.css   # obsidian noir theme, both worlds, all detail work
js/scene.js     # scroll camera, layer dolly, text flybys, snow/star/ember canvas
js/main.js      # cursor, reveals, counters, nav, form, wind audio
```

Forged in the cold, kept by fire.
