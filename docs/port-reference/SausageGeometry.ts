import * as THREE from 'three';

export class SausageCurve extends THREE.Curve<THREE.Vector3> {
  type: string;
  val: number;
  off: THREE.Vector3;

  constructor(type: string, lengthOrCoils: number, offset: THREE.Vector3) {
    super();
    this.type = type;
    this.val = lengthOrCoils;
    this.off = offset;
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    if (this.type === 'Coil') {
      const maxTheta = this.val * Math.PI * 2;
      const theta = t * maxTheta;
      const r = 0.5 + (theta / maxTheta) * 3.5;
      return optionalTarget.set(
        this.off.x + r * Math.cos(theta),
        this.off.y,
        this.off.z + r * Math.sin(theta),
      );
    } else {
      const x = -this.val / 2 + t * this.val;
      const z = Math.sin(t * Math.PI * 3) * 1.5;
      return optionalTarget.set(this.off.x + x, this.off.y, this.off.z + z);
    }
  }
}

export function createSausageGeometry(
  path: THREE.Curve<THREE.Vector3>,
  pSeg: number,
  radius: number,
  rSeg: number,
  linksCount: number,
  isCoil: boolean,
  numBones: number,
) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  const skinIndices = [];
  const skinWeights = [];

  const frames = path.computeFrenetFrames(pSeg, false);

  for (let i = 0; i <= pSeg; i++) {
    const t = i / pSeg;
    const p = path.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    const boneF = t * (numBones - 1);
    let b0 = Math.floor(boneF);
    let b1 = Math.ceil(boneF);
    const w1 = boneF - b0;
    const w0 = 1.0 - w1;

    if (b0 >= numBones) b0 = numBones - 1;
    if (b1 >= numBones) b1 = numBones - 1;

    let cRad = radius;
    if (!isCoil && linksCount > 1) {
      const sT = t * linksCount;
      const dT = Math.min(sT - Math.floor(sT), Math.ceil(sT) - sT);
      if (dT < 0.15) {
        cRad *= 0.01 + 0.99 * Math.sin((dT / 0.15) * (Math.PI / 2));
      } else {
        cRad *= 1.0 + 0.05 * Math.sin(sT * Math.PI);
      }
    } else {
      const dE = Math.min(t, 1.0 - t);
      if (dE < 0.02) {
        cRad *= 0.01 + 0.99 * Math.sin((dE / 0.02) * (Math.PI / 2));
      }
    }

    for (let j = 0; j <= rSeg; j++) {
      const v = j / rSeg;
      const th = v * Math.PI * 2;
      vertices.push(
        p.x + cRad * (Math.cos(th) * N.x + Math.sin(th) * B.x),
        p.y + cRad * (Math.cos(th) * N.y + Math.sin(th) * B.y),
        p.z + cRad * (Math.cos(th) * N.z + Math.sin(th) * B.z),
      );
      uvs.push(v, t * (isCoil ? pSeg / 10 : linksCount * 2));
      skinIndices.push(b0, b1, 0, 0);
      skinWeights.push(w0, w1, 0, 0);
    }
  }

  for (let i = 0; i < pSeg; i++) {
    for (let j = 0; j < rSeg; j++) {
      const a = i * (rSeg + 1) + (j + 1);
      const b = i * (rSeg + 1) + j;
      const c = (i + 1) * (rSeg + 1) + j;
      const d = (i + 1) * (rSeg + 1) + (j + 1);
      indices.push(a, d, b, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

export function generateMeatTexture(colorHex: string, fatRatio: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return {map: new THREE.Texture(), bumpMap: new THREE.Texture()};

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 1024, 1024);

  const drawSpecks = (c: number, sr: {min: number; max: number}, cols: string[], a: number) => {
    ctx.globalAlpha = a;
    for (let i = 0; i < c; i++) {
      ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
      ctx.beginPath();
      ctx.arc(
        Math.random() * 1024,
        Math.random() * 1024,
        Math.random() * sr.max + sr.min,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };

  drawSpecks(2000, {min: 2, max: 8}, ['#8a2b2b', '#6b1b1b', '#a83c3c'], 0.7);
  drawSpecks(Math.floor(6000 * fatRatio), {min: 1, max: 5}, ['#fcf2f2', '#fcebeb', '#e8caca'], 0.9);

  ctx.globalAlpha = 1.0;
  ctx.filter = 'blur(1.5px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  const bumpTex = new THREE.CanvasTexture(canvas);
  bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;

  return {map: tex, bumpMap: bumpTex};
}
