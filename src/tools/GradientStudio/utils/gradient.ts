export type GradientType =
  | 'simple'
  | 'soft-bezier'
  | 'mesh-static'
  | 'mesh-grid'
  | 'sharp-bezier';

export type WarpShape =
  | 'simplex-noise'
  | 'circular'
  | 'value-noise'
  | 'worley-noise'
  | 'fbm-noise'
  | 'voronoi-noise'
  | 'domain-warping'
  | 'waves'
  | 'smooth-noise'
  | 'oval'
  | 'rows'
  | 'columns'
  | 'flat'
  | 'gravity';

export interface ControlPoint {
  x: number; // 0..1
  y: number; // 0..1
}

export interface GradientConfig {
  gradientType: GradientType;
  warpShape: WarpShape;
  warp: number;      // 0–100
  warpSize: number;  // 0–100
  noise: number;     // 0–100
  colors: string[];  // hex
  controlPoints?: ControlPoint[];
  seed: number;
  time: number;      // seconds
}

const MAX_STOPS = 10;
const MAX_CONTROL_POINTS = 10;

const GRADIENT_TYPE_INDEX: Record<GradientType, number> = {
  simple: 0,
  'soft-bezier': 1,
  'mesh-static': 2,
  'mesh-grid': 3,
  'sharp-bezier': 4,
};

const WARP_SHAPE_INDEX: Record<WarpShape, number> = {
  'simplex-noise': 0,
  circular: 1,
  'value-noise': 2,
  'worley-noise': 3,
  'fbm-noise': 4,
  'voronoi-noise': 5,
  'domain-warping': 6,
  waves: 7,
  'smooth-noise': 8,
  oval: 9,
  rows: 10,
  columns: 11,
  flat: 12,
  gravity: 13,
};

// ─── GLSL ────────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = /* glsl */`
  precision highp float;
  #define MAX_CP 10
  #define MAX_STOP 10

  uniform vec2  u_res;
  uniform vec3  u_bg_col;
  uniform vec3  u_cp_col[MAX_CP];
  uniform vec2  u_cp_pos[MAX_CP];
  uniform int   u_num_cp;
  uniform vec3  u_stop_col[MAX_STOP];
  uniform int   u_num_stop;
  uniform float u_warp;        // 0.0–1.0
  uniform float u_warp_size;   // 0.2–4.0
  uniform float u_noise;       // 0.0–1.0
  uniform int   u_grad_type;   // 0..4
  uniform int   u_warp_shape;  // 0..13
  uniform float u_seed;
  uniform float u_time;

  float rand(vec2 n) {
    return fract(sin(dot(n + vec2(u_seed * 0.17, u_seed * 0.11), vec2(12.9898, 4.1414))) * 43758.5453);
  }

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p + u_seed * 0.01) * 43758.5453);
  }

  float valueNoise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    float n = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    return (n - 0.5) * 2.0;
  }

  float fbm(vec2 st) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amp * valueNoise(st);
      st *= 2.0;
      amp *= 0.5;
    }
    return value;
  }

  float worleyNoise(vec2 st) {
    vec2 i_st = floor(st);
    vec2 f_st = fract(st);
    float m_dist = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = hash2(i_st + neighbor);
        vec2 diff = neighbor + point - f_st;
        m_dist = min(m_dist, length(diff));
      }
    }
    return (1.0 - m_dist) * 2.0;
  }

  float voronoiNoise(vec2 st) {
    vec2 i_st = floor(st);
    vec2 f_st = fract(st);
    float m_dist = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = hash2(i_st + neighbor);
        point = 0.5 + 0.5 * sin(vec2(u_seed * 0.013) + 6.2831 * point);
        vec2 diff = neighbor + point - f_st;
        m_dist = min(m_dist, length(diff));
      }
    }
    return m_dist;
  }

  vec2 domainWarp(vec2 p) {
    float n1 = fbm(p + vec2(0.0, u_seed * 0.01 + u_time * 0.25));
    float n2 = fbm(p + vec2(5.2 + u_time * 0.21, 1.3 + u_seed * 0.01));
    return vec2(n1, n2);
  }

  float wavesNoise(vec2 st) {
    float n = 0.0;
    vec2 p1 = st * 3.0;
    n += sin(p1.x + u_seed * 0.01 + u_time * 0.22) * 0.5 + 0.5;
    n += sin(p1.y + u_seed * 0.01 + u_time * 0.19) * 0.5 + 0.5;
    vec2 p2 = vec2(
      st.x * cos(0.7854) - st.y * sin(0.7854),
      st.x * sin(0.7854) + st.y * cos(0.7854)
    ) * 4.0;
    n += sin(p2.x) * 0.25 + 0.25;
    n += sin(p2.y) * 0.25 + 0.25;
    return n / 3.0;
  }

  float smoothGradient(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    float n = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    return n * 0.8 + 0.1;
  }

  float ovalNoise(vec2 st) {
    vec2 center = vec2(0.5);
    vec2 p = (st - center) * vec2(1.12, 0.84);
    float dist = length(p);
    float shape = smoothstep(0.62, 0.0, dist);
    float angle = atan(p.y, p.x);
    float ripple = sin(angle * 2.0 + u_seed * 0.01 + u_time * 0.2) * 0.02;
    return shape + ripple;
  }

  float rowsNoise(vec2 st) {
    float rows = 15.0;
    float y = st.y * rows;
    float row = floor(y);
    float offset = row * 0.1;
    float x = st.x + offset;
    float movement = sin(u_time * 0.2 + row * 0.5) * 0.02;
    x += movement;
    float smoothRow = smoothstep(0.0, 0.1, fract(y));
    return mix(x, x + 0.1, smoothRow);
  }

  float columnsNoise(vec2 st) {
    float cols = 15.0;
    float x = st.x * cols;
    float col = floor(x);
    float offset = col * 0.1;
    float y = st.y + offset;
    float movement = sin(u_time * 0.2 + col * 0.5) * 0.02;
    y += movement;
    float smoothCol = smoothstep(0.0, 0.1, fract(x));
    return mix(y, y + 0.1, smoothCol);
  }

  float flatNoise(vec2 st) {
    return sin(st.x * 2.0) * 0.02 + cos(st.y * 2.0) * 0.02;
  }

  float gravityNoise(vec2 st) {
    vec2 center = vec2(0.5);
    vec2 toCenter = st - center;
    float dist = length(toCenter);
    float angle = atan(toCenter.y, toCenter.x);
    float pull = 1.0 - smoothstep(0.0, 1.5, dist);
    float spiral = angle + u_seed * 0.006 + u_time * 0.28;
    float distortion = 0.0;
    distortion += sin(spiral * 2.0 + dist * 4.0) * 0.3;
    distortion += cos(spiral * 1.5 - dist * 3.0) * 0.2;
    distortion *= pull * pull;
    return distortion;
  }

  vec2 applyWarpShape(vec2 st) {
    vec2 warp = vec2(0.0);
    float s = u_warp_size;
    if (u_warp_shape == 0) {
      float n = fbm(st * s + vec2(u_seed * 0.01 + u_time * 0.25, u_time * 0.18));
      warp = vec2(n);
    } else if (u_warp_shape == 1) {
      float p = length(st - 0.5) * s + u_seed * 0.01 + u_time * 0.9;
      warp = vec2(sin(p), cos(p)) * 0.5;
    } else if (u_warp_shape == 2) {
      float n = valueNoise(st * s + vec2(u_seed * 0.01 + u_time * 0.2, u_time * 0.15));
      warp = vec2(n) * 0.5;
    } else if (u_warp_shape == 3) {
      float n = worleyNoise(st * s + vec2(u_seed * 0.01 + u_time * 0.18, u_time * 0.12));
      warp = vec2(n) * 0.5;
    } else if (u_warp_shape == 4) {
      float n = fbm(st * s + vec2(u_seed * 0.01 + u_time * 0.2, u_time * 0.16));
      warp = vec2(n) * 0.4;
    } else if (u_warp_shape == 5) {
      float n = voronoiNoise(st * s + vec2(u_seed * 0.01 + u_time * 0.16, u_time * 0.12));
      warp = vec2(n) * 0.5;
    } else if (u_warp_shape == 6) {
      warp = domainWarp(st * s) * 0.5;
    } else if (u_warp_shape == 7) {
      float n = wavesNoise(st * s);
      warp = vec2(n) * 0.4;
    } else if (u_warp_shape == 8) {
      float n = smoothGradient(st * s + vec2(u_seed * 0.01 + u_time * 0.22, u_time * 0.1));
      warp = vec2(n) * 0.5;
    } else if (u_warp_shape == 9) {
      float n = ovalNoise(st);
      warp = vec2(n) * s * 0.2;
    } else if (u_warp_shape == 10) {
      warp = vec2(rowsNoise(st)) * s * 0.5;
    } else if (u_warp_shape == 11) {
      warp = vec2(columnsNoise(st)) * s * 0.5;
    } else if (u_warp_shape == 12) {
      float n = flatNoise(st);
      warp = vec2(n) * s;
    } else if (u_warp_shape == 13) {
      float effect = gravityNoise(st);
      vec2 toCenter = st - vec2(0.5);
      float len = length(toCenter);
      if (len > 0.0) {
        vec2 dir = toCenter / len;
        warp = dir * effect * s * 0.8;
      }
    }
    return warp;
  }

  float warpShapeScale() {
    if (u_warp_shape == 9) return 0.24;   // oval
    if (u_warp_shape == 10) return 1.0;   // rows
    if (u_warp_shape == 11) return 1.0;   // columns
    if (u_warp_shape == 12) return 0.14;  // flat
    if (u_warp_shape == 13) return 0.18;  // gravity
    return 0.34;
  }

  vec3 getStopColor(int idx) {
    vec3 color = u_bg_col;
    for (int i = 0; i < MAX_STOP; i++) {
      if (i == idx && i < u_num_stop) color = u_stop_col[i];
    }
    return color;
  }

  vec3 stopAt(float t) {
    int stopCount = u_num_stop;
    if (stopCount < 1) stopCount = 1;
    t = clamp(t, 0.0, 1.0) * float(stopCount - 1);
    int idx = int(floor(t));
    float fr = fract(t);
    vec3 c1 = getStopColor(idx);
    vec3 c2 = getStopColor(idx + 1);
    return mix(c1, c2, fr);
  }

  vec3 calculateSimpleGradient(vec2 st) {
    float pointGradient = 0.0;
    vec3 colorGradient = vec3(0.0);
    float totalLight = 1.0;
    for (int i = 0; i < MAX_CP; i++) {
      if (i < u_num_cp) {
        float dist = 1.0 - distance(st, u_cp_pos[i]) * 1.1;
        float clampedDist = clamp(dist, 0.0, 1.0);
        pointGradient += clampedDist;
        colorGradient += u_cp_col[i] * clampedDist;
        totalLight *= (1.0 - clampedDist) * (1.0 - clampedDist);
      }
    }
    totalLight = smoothstep(0.0, 1.0, clamp(1.0 - totalLight, 0.0, 1.0));
    if (pointGradient > 0.0) {
      colorGradient = (colorGradient / pointGradient) * totalLight;
    }
    vec3 bgGradient = (1.0 - totalLight) * u_bg_col;
    return clamp(colorGradient, 0.0, 1.0) + bgGradient;
  }

  vec3 calculateSoftBezier(vec2 st) {
    vec3 color = vec3(0.0);
    float totalWeight = 0.0;
    float sigma = 0.2;
    float twoSigmaSquare = 2.0 * sigma * sigma;
    for (int i = 0; i < MAX_CP; i++) {
      if (i >= u_num_cp) break;
      float dist = distance(st, u_cp_pos[i]);
      float weight = exp(-dist * dist / twoSigmaSquare);
      color += u_cp_col[i] * weight;
      totalWeight += weight;
    }
    if (totalWeight > 0.0) return color / totalWeight;
    return u_bg_col;
  }

  vec3 calculateSharpBezier(vec2 st) {
    vec3 color = vec3(0.0);
    float totalWeight = 0.0;
    float baseSigma = 0.25;
    float weightExponent = 1.8;
    float smoothingFactor = 1.2;
    for (int i = 0; i < MAX_CP; i++) {
      if (i >= u_num_cp) break;
      float dist = distance(st, u_cp_pos[i]);
      float weight = exp(-dist * dist / (2.0 * baseSigma * baseSigma));
      weight = pow(weight, weightExponent);
      weight = smoothstep(0.0, smoothingFactor, weight);
      color += u_cp_col[i] * weight;
      totalWeight += weight;
    }
    if (totalWeight > 0.0) {
      color = color / totalWeight;
      color = mix(color, pow(clamp(color, 0.0, 1.0), vec3(0.95)), 0.3);
      return color;
    }
    return u_bg_col;
  }

  vec3 calculateMeshStatic(vec2 st) {
    const int GRID = 3;
    vec2 gridSt = st * float(GRID - 1);
    int x = int(floor(gridSt.x));
    int y = int(floor(gridSt.y));
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x > GRID - 2) x = GRID - 2;
    if (y > GRID - 2) y = GRID - 2;
    vec2 f = fract(gridSt);

    int idx = y * GRID + x;
    vec3 bl = getStopColor(idx);
    vec3 br = getStopColor(idx + 1);
    vec3 tl = getStopColor(idx + GRID);
    vec3 tr = getStopColor(idx + GRID + 1);

    vec3 bottom = mix(bl, br, f.x);
    vec3 top = mix(tl, tr, f.x);
    return mix(bottom, top, f.y);
  }

  vec3 calculateMeshGrid(vec2 st) {
    const int GRID = 4;
    vec2 gridSt = st * float(GRID - 1);
    int x = int(floor(gridSt.x));
    int y = int(floor(gridSt.y));
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x > GRID - 2) x = GRID - 2;
    if (y > GRID - 2) y = GRID - 2;
    vec2 f = fract(gridSt);

    int idx = y * GRID + x;
    vec3 bl = getStopColor(idx);
    vec3 br = getStopColor(idx + 1);
    vec3 tl = getStopColor(idx + GRID);
    vec3 tr = getStopColor(idx + GRID + 1);

    vec3 bottom = mix(bl, br, f.x);
    vec3 top = mix(tl, tr, f.x);
    return mix(bottom, top, f.y);
  }

  void main() {
    vec2 st = gl_FragCoord.xy / u_res.xy;
    st.y = 1.0 - st.y;

    vec2 warp = applyWarpShape(st) * (u_warp * warpShapeScale());
    vec2 warpedSt = st + warp;

    vec3 gradientColor = u_bg_col;
    if (u_grad_type == 0) {
      gradientColor = calculateSimpleGradient(warpedSt);
    } else if (u_grad_type == 1) {
      gradientColor = calculateSoftBezier(warpedSt);
    } else if (u_grad_type == 2) {
      gradientColor = calculateMeshStatic(warpedSt);
    } else if (u_grad_type == 3) {
      gradientColor = calculateMeshGrid(warpedSt);
    } else if (u_grad_type == 4) {
      gradientColor = calculateSharpBezier(warpedSt);
    }

    vec3 noiseColor = vec3(rand(vec2(
      st.x * 5.0 + u_seed * 0.01 + u_time * 0.7,
      st.y * 5.0 - u_seed * 0.01 - u_time * 0.5
    )));
    vec3 finalColor = mix(gradientColor, noiseColor, clamp(u_noise, 0.0, 1.0));
    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
  }
`;

// ─── WebGL utilities ─────────────────────────────────────────────────────────

interface GLState {
  gl: WebGLRenderingContext;
  prog: WebGLProgram;
  buf: WebGLBuffer;
  locs: Record<string, WebGLUniformLocation | null>;
}

const glCache = new WeakMap<HTMLCanvasElement | OffscreenCanvas, GLState>();

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error('Shader compile error:', gl.getShaderInfoLog(s));
  return s;
}

function initGL(canvas: HTMLCanvasElement | OffscreenCanvas, preserve: boolean): GLState {
  const gl = (canvas as HTMLCanvasElement).getContext('webgl', {
    preserveDrawingBuffer: preserve,
    antialias: false,
    alpha: false,
  }) as WebGLRenderingContext;

  if (!gl) throw new Error('WebGL not supported');

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);

  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const names = [
    'u_res', 'u_bg_col', 'u_num_cp', 'u_num_stop', 'u_warp', 'u_warp_size',
    'u_noise', 'u_grad_type', 'u_warp_shape', 'u_seed', 'u_time',
    ...Array.from({ length: MAX_CONTROL_POINTS }, (_, i) => `u_cp_col[${i}]`),
    ...Array.from({ length: MAX_CONTROL_POINTS }, (_, i) => `u_cp_pos[${i}]`),
    ...Array.from({ length: MAX_STOPS }, (_, i) => `u_stop_col[${i}]`),
  ];
  const locs: Record<string, WebGLUniformLocation | null> = {};
  for (const n of names) locs[n] = gl.getUniformLocation(prog, n);

  return { gl, prog, buf, locs };
}

// ─── Control-point generation ────────────────────────────────────────────────

function seededPrng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateGridControlPoints(count: number): ControlPoint[] {
  const n = Math.max(0, Math.min(count, MAX_CONTROL_POINTS));
  if (n === 0) return [];

  const grid = Math.ceil(Math.sqrt(n));
  const step = 1 / grid;
  const points: ControlPoint[] = [];

  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / grid);
    const col = i % grid;
    points.push({
      x: (col + 0.5) * step,
      y: (row + 0.5) * step,
    });
  }

  return points;
}

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export function generateControlPoints(count: number, seed: number): ControlPoint[] {
  const rand = seededPrng(seed);
  const n = Math.max(0, Math.min(count, MAX_CONTROL_POINTS));
  const points: ControlPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      x: rand(),
      y: rand(),
    });
  }
  return points;
}

function buildControlPoints(colors: string[], controlPoints?: ControlPoint[]) {
  const fallback = generateGridControlPoints(colors.length);
  const count = Math.min(colors.length, MAX_CONTROL_POINTS);
  const positions: number[] = [];
  const cpColors: number[] = [];

  for (let i = 0; i < count; i++) {
    const rgb = hexToRgb01(colors[i]);
    const p = controlPoints?.[i] ?? fallback[i];
    const x = Math.max(0.02, Math.min(0.98, p?.x ?? fallback[i].x));
    const y = Math.max(0.02, Math.min(0.98, p?.y ?? fallback[i].y));
    positions.push(x, y);
    cpColors.push(rgb[0], rgb[1], rgb[2]);
  }

  return { positions, cpColors, count };
}

// ─── Main render API ─────────────────────────────────────────────────────────

export function renderGradient(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  config: GradientConfig,
  width: number,
  height: number,
  forExport = false,
) {
  const { gradientType, warpShape, warp, warpSize, noise, colors, controlPoints, seed, time } = config;
  const renderColors = colors.slice(0, MAX_STOPS);

  if ((canvas as HTMLCanvasElement).width !== width) {
    (canvas as HTMLCanvasElement).width = width;
  }
  if ((canvas as HTMLCanvasElement).height !== height) {
    (canvas as HTMLCanvasElement).height = height;
  }

  let state = glCache.get(canvas);
  if (!state) {
    try {
      state = initGL(canvas, forExport);
      glCache.set(canvas, state);
    } catch {
      return;
    }
  }

  const { gl, prog, locs } = state;
  gl.bindBuffer(gl.ARRAY_BUFFER, state.buf);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, width, height);
  gl.useProgram(prog);

  const { positions, cpColors, count: numCP } = buildControlPoints(renderColors, controlPoints);

  const set1i = (name: string, v: number) => gl.uniform1i(locs[name], v);
  const set1f = (name: string, v: number) => gl.uniform1f(locs[name], v);
  const set2f = (name: string, x: number, y: number) => gl.uniform2f(locs[name], x, y);
  const set3f = (name: string, r: number, g: number, b: number) => gl.uniform3f(locs[name], r, g, b);

  set2f('u_res', width, height);
  const [bgR, bgG, bgB] = hexToRgb01(renderColors[0] ?? '#000000');
  set3f('u_bg_col', bgR, bgG, bgB);
  set1i('u_num_cp', numCP);
  set1i('u_num_stop', renderColors.length);
  // Match photogradient slider ranges:
  // warp: 0..1.5, warp size: 0..3.0, noise: 0..0.15
  const warpRatio = Math.max(0, Math.min(1.5, (warp / 100) * 1.5));
  const warpSizeRatio = Math.max(0, Math.min(3, (warpSize / 100) * 3));
  const noiseRatio = Math.max(0, Math.min(0.15, (noise / 100) * 0.15));

  set1f('u_warp', warpRatio);
  set1f('u_warp_size', warpSizeRatio);
  set1f('u_noise', noiseRatio);
  set1i('u_grad_type', GRADIENT_TYPE_INDEX[gradientType]);
  set1i('u_warp_shape', WARP_SHAPE_INDEX[warpShape]);
  set1f('u_seed', seed);
  set1f('u_time', time);

  for (let i = 0; i < numCP; i++) {
    set2f(`u_cp_pos[${i}]`, positions[i * 2], positions[i * 2 + 1]);
    set3f(`u_cp_col[${i}]`, cpColors[i * 3], cpColors[i * 3 + 1], cpColors[i * 3 + 2]);
  }

  for (let i = 0; i < renderColors.length; i++) {
    const [r, g, b] = hexToRgb01(renderColors[i]);
    set3f(`u_stop_col[${i}]`, r, g, b);
  }

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ─── Random palette ──────────────────────────────────────────────────────────

const PRESET_PALETTES = [
  ['#EB4679', '#051681', '#EE7F7D', '#265BC9', '#C25EA5', '#7961D3'],
  ['#92B3C9', '#C6D1D1', '#7B8E54', '#F66E56', '#F96656', '#F3F4EC'],
  ['#2483A5', '#E0B94B', '#477459', '#C45408', '#6E9091', '#EFE3D1', '#E4D5B9'],
  ['#0F2F65', '#E687D8', '#347BD1', '#6890E2', '#07265C', '#A88BDF'],
];

export function randomPalette(count: number): string[] {
  const c = Math.max(2, Math.min(MAX_STOPS, count));
  const preset = [...PRESET_PALETTES[Math.floor(Math.random() * PRESET_PALETTES.length)]];
  while (preset.length < c) {
    const h = Math.round(Math.random() * 360);
    const s = Math.round(45 + Math.random() * 40);
    const l = Math.round(35 + Math.random() * 35);
    preset.push(hslToHex(h, s, l));
  }
  return preset.slice(0, c);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * v).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
