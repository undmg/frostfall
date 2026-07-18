# ❄ Frostfall — Archive of the Wanderer

A dark-fantasy portfolio wrapped in snow and old magic. A single, hand-built
static page with a custom snow engine, a living aurora, and a cold, cinematic mood.

![theme](https://img.shields.io/badge/theme-dark%20fantasy-6fb0e6) ![atmosphere](https://img.shields.io/badge/atmosphere-snowfall-a8d8ff) ![deps](https://img.shields.io/badge/dependencies-0-7fe3d0)

## What makes it impressive

- **Custom canvas snow engine** (`js/snow.js`) — three parallax depth layers of
  flakes with independent size, speed, and brightness; wind that drifts and
  *gusts*; and snow that scatters away from your cursor.
- **A living aurora** rendered on its own canvas behind the mountains, drawn with
  layered sine waves and additive blending.
- **Layered atmosphere** — CSS mountain silhouettes at three parallax depths,
  drifting fog, a vignette, and a preloader that unseals the archive.
- **Cinematic interactions** — a glowing custom cursor that swells over targets,
  scroll-reveal choreography, animated stat counters, cursor-tracking relic
  auras, and a floating labels contact form ("Send a Raven").
- **Ambient winter wind** — an opt-in WebAudio soundscape synthesized in the
  browser (filtered pink noise + a slow gust LFO). No audio files.
- **Zero dependencies, zero build step.** Just HTML, CSS, and vanilla JS. Fonts
  are the only external request.
- **Considered & accessible** — semantic landmarks, keyboard-navigable runes,
  reduced-motion fallbacks (a calm static scene instead of animation), and a
  responsive mobile menu.

> Easter egg: press **B** anywhere (outside the form) for a brief blizzard flash.

## Run it

No build required. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Make it yours

| Change | Where |
| --- | --- |
| Name, copy, projects | `index.html` |
| Colors & mood | CSS variables at the top of `css/style.css` (`:root`) |
| Snow density / wind | the `LAYERS` array and `updateWind()` in `js/snow.js` |
| Aurora colors | the `bands` array in `js/snow.js` |
| Contact behaviour | `#ravenForm` handler in `js/main.js` (wire to your backend) |

## Structure

```
index.html        # markup & content
css/style.css     # theme, layout, atmosphere, animations
js/snow.js        # snow + aurora canvas engine
js/main.js        # cursor, reveals, nav, counters, form, wind audio
```

Forged in the cold, far from any court.
