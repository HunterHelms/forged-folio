/**
 * Scroll orchestration: Lenis smooth scroll + GSAP ScrollTrigger.
 * The whole page is one scrubbed timeline that drives the forge's
 * uProgress through its four states, plus per-section reveals.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { initForge } from './forge.js'

gsap.registerPlugin(ScrollTrigger)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ————— forge canvas ————— */
const canvas = document.getElementById('forge-canvas')
const forge = canvas ? initForge(canvas, { reducedMotion }) : null

/* ————— smooth scroll ————— */
let lenis = null
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.09 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

// route same-page anchors through Lenis so they glide instead of jump
document.querySelectorAll('a[href^="#"], a[href^="/#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const hash = a.getAttribute('href').replace('/', '')
    const el = document.querySelector(hash)
    if (!el) return
    e.preventDefault()
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 })
    else el.scrollIntoView()
    history.pushState(null, '', hash)
  })
})

/* ————— forge state ↔ scroll chapters ————— */
// Each chapter marker pins a particle state to a section.
// Between markers the forge morphs.
if (forge) {
  const chapters = [
    { sel: '#hero', state: 0 },
    { sel: '#method', state: 1 },
    { sel: '#work', state: 2 },
    { sel: '#about', state: 3 }, // embers arrive with the personal chapter
    { sel: '#contact', state: 3 },
  ]

  // canvas dim keyframes (progress → opacity): particles never fight the prose.
  // Held low through the ingot dissolve so the About text stays clean.
  const DIM = [
    [0, 1],
    [1, 0.6],
    [2, 0.5],
    [2.6, 0.55],
    [3, 0.9],
  ]
  const dimAt = (p) => {
    for (let i = 0; i < DIM.length - 1; i++) {
      const [p0, v0] = DIM[i]
      const [p1, v1] = DIM[i + 1]
      if (p <= p1) return v0 + ((v1 - v0) * (Math.max(p, p0) - p0)) / (p1 - p0)
    }
    return DIM[DIM.length - 1][1]
  }

  // smoothed writer — one source of truth for uProgress
  let target = 0
  let current = 0
  const apply = (v) => {
    current = v
    forge.setProgress(v)
    canvas.style.opacity = dimAt(v)
  }
  if (reducedMotion) {
    apply(0)
  } else {
    gsap.ticker.add(() => {
      current += (target - current) * 0.07
      if (Math.abs(target - current) > 0.0004) apply(current)
    })
  }

  chapters.forEach((ch, i) => {
    if (i === 0) return
    const el = document.querySelector(ch.sel)
    if (!el) return
    ScrollTrigger.create({
      trigger: el,
      start: 'top 95%',
      end: 'top 25%',
      onUpdate: (self) => {
        target = chapters[i - 1].state + self.progress * (ch.state - chapters[i - 1].state)
        if (reducedMotion) apply(target)
      },
    })
  })

  window.__forge = { get: () => current }
}

/* ————— reveals ————— */
if (!reducedMotion) {
  // hero entrance — one orchestrated moment
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  heroTl
    .from('[data-hero-eyebrow]', { y: 18, opacity: 0, duration: 0.7 }, 0.15)
    .from('[data-hero-line]', { y: 90, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.3)
    .from('[data-hero-body]', { y: 24, opacity: 0, duration: 0.8 }, 0.9)
    .from('[data-hero-cue]', { opacity: 0, duration: 0.9 }, 1.3)
    .from('header.site-nav', { y: -18, opacity: 0, duration: 0.7 }, 0.5)

  // generic section reveals
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 42,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%' },
    })
  })

  gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
    gsap.from(group.querySelectorAll('[data-reveal-item]'), {
      y: 36,
      opacity: 0,
      duration: 0.9,
      stagger: 0.09,
      ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 82%' },
    })
  })

  // scroll cue retires once the reader commits
  const cue = document.querySelector('[data-hero-cue]')
  if (cue) {
    gsap.to(cue, {
      opacity: 0,
      scrollTrigger: { trigger: '#method', start: 'top 98%', end: 'top 80%', scrub: true },
    })
  }

  // magnetic pull on the contact buttons — molten things attract
  document.querySelectorAll('.btn-forge, .btn-quiet').forEach((btn) => {
    const strength = 0.28
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect()
      const x = (e.clientX - r.left - r.width / 2) * strength
      const y = (e.clientY - r.top - r.height / 2) * strength
      gsap.to(btn, { x, y, duration: 0.4, ease: 'power2.out' })
    })
    btn.addEventListener('pointerleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
    })
  })
} else {
  document.querySelectorAll('[data-reveal], [data-reveal-item]').forEach((el) => {
    el.style.opacity = '1'
  })
}
