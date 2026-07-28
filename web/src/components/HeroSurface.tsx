import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./ui/utils";

/**
 * The hero card surface — the Balance Card on the dashboard and the summary bar on
 * the Plan page. Both used to be a flat `from-primary to-primary/80` gradient; both
 * now carry a slow aurora rendered by a WebGL fragment shader.
 *
 * Three things this component is deliberately careful about:
 *
 * 1. **It is barely perceptible.** This sits behind a number the user reads every
 *    day, so the motion is pitched below the threshold where it competes for
 *    attention: ~45s to traverse, low amplitude, throttled to 30fps.
 * 2. **It degrades to a static gradient, always.** No WebGL, a lost context, or the
 *    moment before the first frame all fall through to `SURFACE[theme].fallback` on
 *    the wrapper — a still approximation of the same aurora, so a degraded card
 *    still looks intended rather than broken.
 * 3. **It costs nothing when unwatched.** The loop stops when the card scrolls out
 *    of view, when the tab is backgrounded, and when the reader has asked for
 *    reduced motion (in which case a single frame is drawn and that is all).
 */

type Rgb = [number, number, number];

type Surface = {
  /** Card colour where the light is absent. */
  base: Rgb;
  /** The tone the ramp passes through at half strength. */
  mid: Rgb;
  /** Colour the beam brightens toward. */
  glow: Rgb;
  /** How far along the ramp the brightest part of the beam is allowed to travel. */
  intensity: number;
  /** Film-grain amplitude. */
  grain: number;
  /** Still approximation of the same aurora, for every non-WebGL path. */
  fallback: string;
};

const hex = (v: number): Rgb => [
  ((v >> 16) & 0xff) / 255,
  ((v >> 8) & 0xff) / 255,
  (v & 0xff) / 255,
];

/**
 * The lavender is intentionally not a design token. It exists only on these two
 * surfaces, and promoting it to `globals.css` would invite it to spread — see the
 * Earned Color Rule in DESIGN.md.
 *
 * Light theme is the reference, sampled off it directly: a very dark purple-black
 * base, a mauve midtone, and a pale desaturated lavender at the beam's brightest.
 * Dark theme keeps the card's inversion (near-white with dark text, as `--primary`
 * does) and runs the same ramp downward into a pale lavender wash. Its `glow` is the
 * darkest tone that surface reaches, and it holds ~9:1 against
 * `--primary-foreground` — comfortably past AA.
 */
const SURFACE: Record<"light" | "dark", Surface> = {
  light: {
    base: hex(0x15111d),
    mid: hex(0x6d5e92),
    glow: hex(0xcfc3e8),
    intensity: 1,
    grain: 0.07,
    fallback:
      "radial-gradient(75% 130% at 92% 46%, rgba(207, 195, 232, 0.85) 0%, rgba(207, 195, 232, 0) 55%), " +
      "radial-gradient(65% 120% at 40% 6%, rgba(109, 94, 146, 0.80) 0%, rgba(109, 94, 146, 0) 60%), " +
      "radial-gradient(55% 110% at 100% 88%, rgba(109, 94, 146, 0.40) 0%, rgba(109, 94, 146, 0) 60%), " +
      "#15111d",
  },
  dark: {
    base: hex(0xfafafa),
    mid: hex(0xe8e2f2),
    glow: hex(0xc6bade),
    intensity: 0.9,
    // A near-white card shows grain as dirt, so it gets a fraction of the light one's.
    grain: 0.02,
    fallback:
      "radial-gradient(75% 130% at 92% 46%, rgba(198, 186, 222, 0.85) 0%, rgba(198, 186, 222, 0) 55%), " +
      "radial-gradient(65% 120% at 40% 6%, rgba(232, 226, 242, 0.90) 0%, rgba(232, 226, 242, 0) 60%), " +
      "radial-gradient(55% 110% at 100% 88%, rgba(198, 186, 222, 0.35) 0%, rgba(198, 186, 222, 0) 60%), " +
      "#fafafa",
  },
};

/**
 * 30fps. At this motion speed it is indistinguishable from 60 and halves the fill
 * cost, which matters because the card is full-bleed on mobile.
 */
const FRAME_MS = 1000 / 30;

/**
 * Soft gradients gain nothing from a 3x buffer, and the cost is quadratic. 1.5 is
 * enough to keep the ridge edges from stair-stepping.
 */
const MAX_DPR = 1.5;

const VERTEX_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `
precision mediump float;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec3  u_base;
uniform vec3  u_mid;
uniform vec3  u_glow;
uniform float u_intensity;
uniform float u_grain;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

/**
 * The light, as one scalar field.
 *
 * The reference is a single band that arrives high on the left, descends across the
 * card while tightening, and blooms into its brightest stretch against the right
 * edge — plus a dim wash hanging below it on the right.
 *
 * Three x coordinates, deliberately: uv.y drives the vertical geometry, cx is the
 * composition's x (biased for narrow cards, see main) and drives the band, and nx
 * is x scaled for the noise domain so the noise keeps its proportions at any aspect.
 */
float field(vec2 uv, float cx, float nx, float t) {
  // Vertical domain warp: the band undulates in place rather than sliding sideways.
  // Kept small — the reference is a clean shape, and a heavy warp makes it wander
  // off the profile below.
  float y = uv.y + 0.07 * (fbm(vec2(nx * 1.25 + t, uv.y * 1.6 - t * 0.5)) - 0.5) * 2.0;

  // One band, but it does not fall evenly. It hugs the top edge through the left
  // half, dives late and hard across the middle, then flattens into the bright beam
  // on the right. That plateau-dive-plateau is the whole shape: an even diagonal
  // would wash mauve straight through the area the balance figure sits in, which
  // the reference keeps black.
  float fall = smoothstep(0.38, 0.72, cx);
  float centre = mix(0.97, 0.56, fall);
  float width = 0.17;
  // Present along the top but dim; it only reaches full strength once it has
  // bottomed out on the right.
  float lift = mix(0.55, 0.92, smoothstep(0.30, 0.85, cx));

  // Two lobes: a tight core and a much wider halo. One Gaussian cannot be both
  // tight at the core and soft at the edge, and the reference carries diffuse light
  // a long way out from the beam — with a single lobe the card measures far too
  // dark everywhere the band is not.
  //
  // The halo is also asymmetric, pooling below the band and falling off quickly
  // above it. Symmetric, it cannot win: widen it enough to fill the left half under
  // the top band and it washes out the top-right corner the reference keeps black.
  // The side term crossfades rather than switching, so there is no seam along the
  // band's centre line.
  float d = (y - centre) / width;
  float side = smoothstep(-0.6, 0.6, d);
  float halo = exp(-d * d * mix(0.13, 0.42, side)) * mix(0.34, 0.24, side);
  float band = (exp(-d * d) * 0.72 + halo) * lift * smoothstep(0.0, 0.28, cx);

  // Two dim blooms along the bottom. The reference's bottom edge lifts at both ends
  // but stays black through the middle, which one centred bloom cannot do.
  vec2 bl = (vec2(cx, y) - vec2(0.10, -0.05)) / vec2(0.34, 0.34);
  vec2 br = (vec2(cx, y) - vec2(1.00, 0.02)) / vec2(0.40, 0.40);
  float bloom = exp(-dot(bl, bl)) * 0.18 + exp(-dot(br, br)) * 0.12;

  return clamp(band + bloom, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Half aspect correction for the noise only. Full correction turns the structure
  // into circular blobs; none smears it into flat bars at the card's ~5:1 ratio.
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float nx = uv.x * sqrt(aspect);

  // The composition was fitted against a wide desktop card. On a card that squares
  // up — the same component at mobile width — the band's bright stretch lands
  // straight on the balance figure, white text on pale lavender. Biasing x with an
  // exponent pushes the whole composition right as the card narrows, so the top-left
  // where the text lives stays dark at every width.
  float narrow = smoothstep(3.5, 1.6, aspect);
  float cx = pow(uv.x, mix(1.0, 1.9, narrow));

  float t = u_time * 0.2;

  // Chromatic aberration: sample the field a hair apart per channel, which fringes
  // the beam edges cool on one side and warm on the other. Small — the reference is
  // close to neutral lavender, so this is texture rather than an effect.
  const float shift = 0.004;
  vec3 f = vec3(
    field(uv, cx + shift, nx + shift, t),
    field(uv, cx, nx, t),
    field(uv, cx - shift, nx - shift, t)
  ) * u_intensity;

  // Three stops, not two. The reference does not run straight from near-black to
  // pale lavender — it passes through a distinctly more saturated mauve around the
  // midpoint, and a two-colour mix reads visibly greyer through that range. The
  // smoothstep ranges overlap so there is no crease where the two blends meet.
  vec3 colour = mix(mix(u_base, u_mid, smoothstep(0.0, 0.55, f)), u_glow, smoothstep(0.45, 1.0, f));

  // Static grain, not animated. The reference carries a real film-grain texture
  // (sigma about 5/255), enough that leaving it out reads as a different, cleaner
  // image — so this is matching the reference, not just killing 8-bit banding.
  // Animating it would read as television static and undo the quiet.
  // It is scaled by the field so the black left third stays clean.
  colour += (hash(gl_FragCoord.xy) - 0.5) * u_grain * (0.45 + 0.55 * f.g);

  gl_FragColor = vec4(colour, 1.0);
}
`;

function readIsDark() {
  return document.documentElement.classList.contains("dark");
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);

    return null;
  }

  return shader;
}

type HeroSurfaceProps = {
  /** Padding and margin, supplied by the caller — the two heroes differ. */
  className?: string;
  children: ReactNode;
};

export function HeroSurface({ className, children }: HeroSurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDark, setIsDark] = useState(readIsDark);

  /**
   * Set by the render effect once WebGL is up. The theme effect calls it instead of
   * re-running the effect, so flipping the theme just swaps the uniforms rather than
   * tearing down and rebuilding the GL context.
   */
  const setSurfaceRef = useRef<((next: Surface) => void) | null>(null);

  /**
   * `useAppSettings` owns the theme, but it is per-instance local state rather than
   * a context — calling it here would stand up a second copy of the store. Watching
   * the class it writes to <html> keeps this component prop-free at both call sites.
   */
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(readIsDark()));

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSurfaceRef.current?.(isDark ? SURFACE.dark : SURFACE.light);
  }, [isDark]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    // No WebGL: leave the canvas blank and let the wrapper's static gradient stand.
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    const program = vertex && fragment ? gl.createProgram() : null;

    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);

      return;
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);

      return;
    }

    gl.useProgram(program);

    // One oversized triangle rather than a quad — same coverage, one fewer vertex.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uBase = gl.getUniformLocation(program, "u_base");
    const uMid = gl.getUniformLocation(program, "u_mid");
    const uGlow = gl.getUniformLocation(program, "u_glow");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");
    const uGrain = gl.getUniformLocation(program, "u_grain");

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let reduced = motionQuery.matches;
    let onScreen = true;
    let tabVisible = !document.hidden;
    let running = false;
    let lost = false;
    let raf = 0;
    let lastFrame = 0;

    const startedAt = performance.now();

    /**
     * Swapped outright on a theme flip, not crossfaded. `text-primary-foreground`
     * inverts the moment the `dark` class lands, so a fading card would leave dark
     * text over a still-black surface for the length of the fade. Every other
     * surface in the app switches instantly too.
     */
    let surface: Surface = readIsDark() ? SURFACE.dark : SURFACE.light;

    // These are arrow consts rather than declarations so TypeScript carries the
    // non-null narrowing of `gl` / `canvas` / `host` into them; hoisted declarations
    // lose it.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width === width && canvas.height === height) return false;

      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);

      return true;
    };

    // Deliberately does not resize: that needs a layout read, and doing one every
    // frame would put a forced reflow on the main thread 30 times a second for a
    // size that only ever changes when the ResizeObserver says so.
    const draw = (now: number) => {
      if (lost) return;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 0 : (now - startedAt) / 1000);
      gl.uniform3fv(uBase, surface.base);
      gl.uniform3fv(uMid, surface.mid);
      gl.uniform3fv(uGlow, surface.glow);
      gl.uniform1f(uIntensity, surface.intensity);
      gl.uniform1f(uGrain, surface.grain);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      if (now - lastFrame >= FRAME_MS) {
        lastFrame = now;
        draw(now);
      }

      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      if (lost) return;

      const wants = onScreen && tabVisible && !reduced;

      if (wants && !running) {
        running = true;
        lastFrame = 0;
        raf = requestAnimationFrame(frame);
      } else if (!wants && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    /** A one-off repaint for changes that land while the loop is stopped. */
    const invalidate = () => {
      if (running || lost || !onScreen || !tabVisible) return;

      draw(performance.now());
    };

    setSurfaceRef.current = (next) => {
      if (next === surface || lost) return;

      surface = next;
      // A running loop picks this up on its next frame; a stopped one needs a nudge.
      invalidate();
    };

    // The trailing `invalidate` is a no-op whenever the loop restarts; it matters
    // under reduced motion, where nothing restarts and a resize that landed while
    // the card was away has left the drawing buffer cleared.
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
      invalidate();
    };
    const intersection = new IntersectionObserver(onIntersect, { threshold: 0 });
    intersection.observe(host);

    const resizeObserver = new ResizeObserver(() => {
      if (resize()) invalidate();
    });
    resizeObserver.observe(host);

    const onVisibility = () => {
      tabVisible = !document.hidden;
      sync();
      invalidate();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onMotionChange = () => {
      reduced = motionQuery.matches;
      sync();
      invalidate();
    };
    motionQuery.addEventListener("change", onMotionChange);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      running = false;
      cancelAnimationFrame(raf);
      // Uncovering the wrapper's static gradient underneath.
      canvas.style.display = "none";
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    resize();
    sync();
    invalidate();

    return () => {
      cancelAnimationFrame(raf);
      setSurfaceRef.current = null;
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotionChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);

      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      // Hand the context back rather than waiting for GC; browsers cap how many a
      // page may hold, and these cards mount and unmount as the view switches.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative isolate overflow-hidden rounded-xl shadow-lg text-primary-foreground",
        className,
      )}
      style={{ background: (isDark ? SURFACE.dark : SURFACE.light).fallback }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        // Safari does not reliably clip a composited child against the parent's
        // overflow + radius; matching the radius on the canvas itself does.
        style={{ borderRadius: "inherit" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
