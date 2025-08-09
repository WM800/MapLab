import { Connection, GraphNode } from './types';

export interface HeightmapResult {
  width: number;
  height: number;
  data: Float32Array; // values
}

function hash(x: number, y: number, seed: number) {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 0xffffffff;
}

function valueNoise(x: number, y: number, seed: number) {
  const xInt = Math.floor(x); const yInt = Math.floor(y);
  const xf = x - xInt; const yf = y - yInt;
  const tl = hash(xInt, yInt, seed);
  const tr = hash(xInt + 1, yInt, seed);
  const bl = hash(xInt, yInt + 1, seed);
  const br = hash(xInt + 1, yInt + 1, seed);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const top = tl + (tr - tl) * u;
  const bottom = bl + (br - bl) * u;
  return top + (bottom - top) * v;
}

function fractalNoise(x: number, y: number, seed: number, scale: number, amplitude: number) {
  let freq = 1 / Math.max(0.0001, scale);
  let amp = amplitude;
  let value = 0;
  for (let o = 0; o < 4; o++) {
    value += valueNoise(x * freq, y * freq, seed + o * 19) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return value / (1 + 0.5 + 0.25 + 0.125);
}

interface EvalContext {
  nodesById: Record<string, GraphNode>;
  connections: Connection[];
  memo: Record<string, Float32Array>;
  width: number; height: number;
}

function evaluateNode(nodeId: string, ctx: EvalContext, seed: number, stack: Set<string> = new Set()): Float32Array {
  if (ctx.memo[nodeId]) return ctx.memo[nodeId];
  const node = ctx.nodesById[nodeId];
  if (!node) { return new Float32Array(ctx.width * ctx.height); }
  if (stack.has(nodeId)) {
    // cykl – zwróć zero dla stabilności
    return new Float32Array(ctx.width * ctx.height);
  }
  stack.add(nodeId);
  const out = new Float32Array(ctx.width * ctx.height);
  const incoming = ctx.connections.filter(c => c.to.nodeId === nodeId);
  const getInput = (index: number): Float32Array | null => {
    const con = incoming[index];
    if (!con) return null;
    return evaluateNode(con.from.nodeId, ctx, seed, stack);
  };

  switch (node.nodeType) {
    case 'noise': {
      const scale = node.params.scale ?? 2;
      const amp = node.params.amplitude ?? 1;
      let ptr = 0;
      for (let y = 0; y < ctx.height; y++) {
        for (let x = 0; x < ctx.width; x++) {
          const nx = (x / ctx.width - 0.5) * 10;
          const ny = (y / ctx.height - 0.5) * 10;
          out[ptr++] = fractalNoise(nx, ny, seed + node.id.length, scale, amp);
        }
      }
      break;
    }
    case 'add': {
      const a = getInput(0); const b = getInput(1);
      if (a && b) for (let i=0;i<out.length;i++) out[i] = a[i] + b[i];
      else if (a) out.set(a); else if (b) out.set(b);
      break;
    }
    case 'multiply': {
      const a = getInput(0); const b = getInput(1);
      if (a && b) for (let i=0;i<out.length;i++) out[i] = a[i] * b[i];
      else if (a) out.set(a);
      break;
    }
    case 'clamp': {
      const a = getInput(0); const min = node.params.min ?? 0; const max = node.params.max ?? 1;
      if (a) for (let i=0;i<out.length;i++) out[i] = Math.min(max, Math.max(min, a[i]));
      break;
    }
    case 'output': {
      const a = getInput(0); if (a) out.set(a); break;
    }
    default: break;
  }
  ctx.memo[nodeId] = out;
  stack.delete(nodeId);
  return out;
}

export function generateHeightmap(nodes: GraphNode[], connections: Connection[], width: number, height: number, seed = 1337) {
  const outputNode = nodes.find(n => n.nodeType === 'output');
  if (!outputNode) return null;
  const ctx: EvalContext = {
    nodesById: Object.fromEntries(nodes.map(n => [n.id, n])),
    connections,
    memo: {},
    width,
    height
  };
  const data = evaluateNode(outputNode.id, ctx, seed);
  return { width, height, data };
}
