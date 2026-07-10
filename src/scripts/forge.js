/**
 * FORGE — the persistent particle system behind the whole page.
 *
 * One buffer of particles, four morph targets, blended in the vertex
 * shader by a scroll-driven uniform:
 *
 *   0 ORE     — raw chaos: a wide drifting cloud of sparks (hero)
 *   1 STREAM  — signal found: particles pour into a converging vortex (method)
 *   2 INGOT   — structure: a standing lattice slab, white-hot core (work)
 *   3 EMBER   — release: a slow ring of rising embers (contact)
 *
 * Everything is procedural — no textures, no assets.
 */
import * as THREE from 'three'

const simplex = /* glsl */ `
// Ashima simplex 3D
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx;vec3 x2=x0-i2+2.0*C.xxx;vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 curl(vec3 p){
  const float e=0.1;
  float n1=snoise(vec3(p.x,p.y+e,p.z));float n2=snoise(vec3(p.x,p.y-e,p.z));
  float n3=snoise(vec3(p.x,p.y,p.z+e));float n4=snoise(vec3(p.x,p.y,p.z-e));
  float n5=snoise(vec3(p.x+e,p.y,p.z));float n6=snoise(vec3(p.x-e,p.y,p.z));
  float x=(n1-n2)-(n3-n4);float y=(n3-n4)-(n5-n6);float z=(n5-n6)-(n1-n2);
  return normalize(vec3(x,y,z)/(2.0*e));
}
`

const vertexShader = /* glsl */ `
${simplex}
attribute vec3 aOre;
attribute vec3 aStream;
attribute vec3 aIngot;
attribute vec3 aEmber;
attribute float aRand;
attribute float aHeat;

uniform float uTime;
uniform float uProgress;   // 0..3 across the four states
uniform float uPixelRatio;
uniform vec2 uMouse;       // world-space
uniform float uMouseForce;
uniform vec3 uIngotShift;  // pushes the ingot off the prose column

varying float vHeat;
varying float vFade;

// staggered, eased blend between two states
float seg(float p, float lo, float hi, float r) {
  float t = clamp((p - lo) / (hi - lo), 0.0, 1.0);
  // per-particle stagger: some particles leave early, some late
  t = clamp(t * 1.45 - r * 0.45, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

void main() {
  float p = uProgress;
  float t1 = seg(p, 0.0, 1.0, aRand);
  float t2 = seg(p, 1.0, 2.0, aRand);
  float t3 = seg(p, 2.0, 3.0, aRand);

  vec3 pos = aOre;
  pos = mix(pos, aStream, t1);
  pos = mix(pos, aIngot + uIngotShift, t2);
  pos = mix(pos, aEmber, t3);

  // state-dependent turbulence amplitude
  float amp = mix(1.6, 0.9, t1);   // ore drifts wide, stream tightens
  amp = mix(amp, 0.10, t2);        // ingot nearly still
  amp = mix(amp, 0.55, t3);        // embers loosen again

  float speed = 0.12;
  vec3 c = curl(pos * 0.16 + uTime * speed + aRand * 3.7);
  pos += c * amp;

  // embers rise
  pos.y += t3 * mod(uTime * (0.35 + aRand * 0.5) + aRand * 12.0, 9.0) * 0.35 * t3;

  // stream state swirls around its axis
  float swirl = t1 * (1.0 - t2) * 0.8;
  float ang = uTime * (0.25 + aRand * 0.2) * swirl;
  float cs = cos(ang), sn = sin(ang);
  pos.xz = mat2(cs, -sn, sn, cs) * pos.xz;

  // mouse repulsion (in world xy)
  vec2 d = pos.xy - uMouse;
  float dist = length(d);
  float push = smoothstep(4.5, 0.0, dist) * uMouseForce;
  pos.xy += normalize(d + 0.0001) * push * 2.2;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // heat: base per-particle + hotter in ingot core + flicker
  float coreGlow = t2 * (1.0 - t3) * smoothstep(6.0, 0.0, length(aIngot.xy));
  float flicker = 0.5 + 0.5 * snoise(vec3(aRand * 40.0, uTime * 0.6, 0.0));
  vHeat = clamp(aHeat * 0.75 + coreGlow * 0.6 + flicker * 0.18, 0.0, 1.0);

  float size = (0.8 + aRand * 1.7) * (1.0 + vHeat * 0.9);
  gl_PointSize = size * uPixelRatio * (34.0 / -mv.z);
  vFade = smoothstep(60.0, 20.0, -mv.z);
}
`

const fragmentShader = /* glsl */ `
varying float vHeat;
varying float vFade;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.05, d);
  alpha *= alpha;

  // heat ramp: iron ash -> ember -> amber -> white-hot
  vec3 ash    = vec3(0.28, 0.22, 0.27);
  vec3 ember  = vec3(1.0, 0.36, 0.18);
  vec3 amber  = vec3(1.0, 0.71, 0.33);
  vec3 white  = vec3(1.0, 0.93, 0.82);

  vec3 col = mix(ash, ember, smoothstep(0.0, 0.45, vHeat));
  col = mix(col, amber, smoothstep(0.45, 0.78, vHeat));
  col = mix(col, white, smoothstep(0.78, 1.0, vHeat));

  gl_FragColor = vec4(col, alpha * vFade * (0.35 + vHeat * 0.65));
}
`

/* ————— target-state generators ————— */

function makeTargets(count) {
  const ore = new Float32Array(count * 3)
  const stream = new Float32Array(count * 3)
  const ingot = new Float32Array(count * 3)
  const ember = new Float32Array(count * 3)
  const rand = new Float32Array(count)
  const heat = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const r = Math.random()
    rand[i] = r
    heat[i] = Math.pow(Math.random(), 2.2) // most particles cool, few hot

    // ORE — wide flat-ish cloud, biased right of the hero text
    {
      const th = Math.random() * Math.PI * 2
      const rad = 6 + Math.pow(Math.random(), 0.5) * 16
      ore[i3] = Math.cos(th) * rad * 1.35 + 4.0
      ore[i3 + 1] = (Math.random() - 0.5) * 18
      ore[i3 + 2] = Math.sin(th) * rad * 0.6 - 4
    }

    // STREAM — converging vortex funnel (wide top, tight throat)
    {
      const t = Math.random()
      const th = t * Math.PI * 10 + r * 0.6
      const rad = 1.2 + (1 - t) * 9.5
      stream[i3] = Math.cos(th) * rad
      stream[i3 + 1] = (t - 0.5) * 16
      stream[i3 + 2] = Math.sin(th) * rad - 2
    }

    // INGOT — standing lattice slab, slightly rotated
    {
      const w = 13, h = 7.4, d = 2.4
      const x = (Math.random() - 0.5) * w
      const y = (Math.random() - 0.5) * h
      const z = (Math.random() - 0.5) * d
      // quantize into a lattice, keep a little jitter
      const q = 0.55
      const qx = Math.round(x / q) * q + (Math.random() - 0.5) * 0.08
      const qy = Math.round(y / q) * q + (Math.random() - 0.5) * 0.08
      const qz = Math.round(z / q) * q + (Math.random() - 0.5) * 0.08
      const rot = -0.22
      ingot[i3] = qx * Math.cos(rot) - qz * Math.sin(rot)
      ingot[i3 + 1] = qy
      ingot[i3 + 2] = qx * Math.sin(rot) + qz * Math.cos(rot) - 2
    }

    // EMBER — broad low ring, sparse and calm
    {
      const th = Math.random() * Math.PI * 2
      const rad = 7 + Math.random() * 7
      ember[i3] = Math.cos(th) * rad * 1.3
      ember[i3 + 1] = -6 + Math.random() * 3
      ember[i3 + 2] = Math.sin(th) * rad * 0.5 - 3
    }
  }

  return { ore, stream, ingot, ember, rand, heat }
}

/* ————— public init ————— */

export function initForge(canvas, { reducedMotion = false } = {}) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    })
  } catch {
    canvas.style.display = 'none'
    return null
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches
  const COUNT = isMobile ? 22000 : 55000

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120)
  camera.position.set(0, 0, 26)

  const geo = new THREE.BufferGeometry()
  const t = makeTargets(COUNT)
  geo.setAttribute('position', new THREE.BufferAttribute(t.ore, 3))
  geo.setAttribute('aOre', new THREE.BufferAttribute(t.ore, 3))
  geo.setAttribute('aStream', new THREE.BufferAttribute(t.stream, 3))
  geo.setAttribute('aIngot', new THREE.BufferAttribute(t.ingot, 3))
  geo.setAttribute('aEmber', new THREE.BufferAttribute(t.ember, 3))
  geo.setAttribute('aRand', new THREE.BufferAttribute(t.rand, 1))
  geo.setAttribute('aHeat', new THREE.BufferAttribute(t.heat, 1))

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPixelRatio: { value: 1 },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uMouseForce: { value: reducedMotion ? 0 : 1 },
    uIngotShift: {
      value: isMobile ? new THREE.Vector3(0, -1.5, -10) : new THREE.Vector3(8.5, 0.5, -6),
    },
  }

  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geo, mat)
  scene.add(points)

  function resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio, 1.75)
    renderer.setSize(w, h, false)
    renderer.setPixelRatio(dpr)
    uniforms.uPixelRatio.value = dpr
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  // mouse → world plane at z≈0
  const mouseTarget = new THREE.Vector2(999, 999)
  if (!reducedMotion) {
    window.addEventListener('pointermove', (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z
      const halfW = halfH * camera.aspect
      mouseTarget.set(x * halfW, y * halfH)
    })
    window.addEventListener('pointerleave', () => mouseTarget.set(999, 999))
  }

  const clock = new THREE.Clock()
  let camX = 0
  let camY = 0

  function frame() {
    uniforms.uTime.value = clock.getElapsedTime()
    // ease mouse
    uniforms.uMouse.value.lerp(mouseTarget, 0.08)
    // gentle camera parallax
    const mx = mouseTarget.x === 999 ? 0 : mouseTarget.x
    const my = mouseTarget.y === 999 ? 0 : mouseTarget.y
    camX += ((mx / 30) - camX) * 0.03
    camY += ((my / 30) - camY) * 0.03
    camera.position.x = camX
    camera.position.y = camY
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
  }

  if (reducedMotion) {
    // single static frame — no loop
    uniforms.uTime.value = 4
    renderer.render(scene, camera)
    window.addEventListener('resize', () => renderer.render(scene, camera))
  } else {
    renderer.setAnimationLoop(frame)
  }

  return {
    uniforms,
    setProgress(v) {
      uniforms.uProgress.value = v
      if (reducedMotion) renderer.render(scene, camera)
    },
  }
}
