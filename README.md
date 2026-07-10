# forged-folio

**[brodieh.com](https://brodieh.com)** — the personal site of Hunter Brodie Helms, product manager & founder (Nugget AI, FIXD Automotive, LinkedIn).

Designed and built end-to-end by **Claude Fable 5** from a single prompt — concept, palette, typography, copy, WebGL, and this README. The full process is documented on the live [`/guide`](https://brodieh.com/guide) route.

## The idea

Brodie is from Birmingham, Alabama — the old iron city — and his craft is turning raw user signal into shipped product. The site renders that thesis literally: one WebGL particle system (~55k points, custom GLSL, zero image assets) runs behind the entire page and morphs with scroll:

| Chapter | Particle state |
|---|---|
| Hero | **Ore** — a chaotic drifting spark cloud |
| Method | **Stream** — a converging vortex |
| Work | **Ingot** — a white-hot standing lattice |
| About / Contact | **Ember** — a calm bed of rising embers |

## Stack

- [Astro 5](https://astro.build) (static output)
- [Three.js](https://threejs.org) + custom vertex/fragment shaders (simplex + curl noise on the GPU)
- [GSAP ScrollTrigger](https://gsap.com) + [Lenis](https://lenis.darkroom.engineering) for scroll choreography
- Variable fonts, self-hosted via Fontsource: Fraunces (display, SOFT/WONK axes), Archivo (body), Spline Sans Mono (labels)
- Deployed on Netlify (`netlify.toml` pins build command, publish dir, and Node version)

## Develop

```sh
npm install
npm run dev      # localhost:4321
npm run build    # static build to dist/
```

Reduced motion is respected throughout: `prefers-reduced-motion` gets a static forge, native scrolling, and instant reveals.
