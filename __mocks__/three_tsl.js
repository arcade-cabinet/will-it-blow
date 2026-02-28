/**
 * Jest mock for three/tsl (Three Shading Language).
 *
 * TSL functions return chainable "node" objects with methods like .mul(),
 * .add(), .toVar(), .x, .y, .z, etc. This mock provides a minimal stub
 * so modules that use TSL can be imported in Jest without WebGPU.
 */

function createNode(value) {
  const node = {
    value: value ?? 0,
    mul: () => createNode(),
    add: () => createNode(),
    sub: () => createNode(),
    div: () => createNode(),
    addAssign: () => createNode(),
    mulAssign: () => createNode(),
    assign: () => createNode(),
    toVar: () => createNode(),
    lessThan: () => createNode(),
    greaterThan: () => createNode(),
    or: () => createNode(),
    get x() { return createNode(); },
    get y() { return createNode(); },
    get z() { return createNode(); },
  };
  return node;
}

const fnStub = () => createNode();
const fnFactory = (fn) => {
  const wrapper = (...args) => createNode();
  return wrapper;
};

module.exports = {
  uniform: (v) => createNode(v),
  float: () => createNode(),
  vec2: () => createNode(),
  vec3: () => createNode(),
  vec4: () => createNode(),
  Fn: (fn) => fnFactory(fn),
  If: () => createNode(),
  abs: () => createNode(),
  add: () => createNode(),
  clamp: () => createNode(),
  dot: () => createNode(),
  exp: () => createNode(),
  floor: () => createNode(),
  fract: () => createNode(),
  hash: () => createNode(),
  length: () => createNode(),
  max: () => createNode(),
  min: () => createNode(),
  mix: () => createNode(),
  mod: () => createNode(),
  mul: () => createNode(),
  select: () => createNode(),
  sin: () => createNode(),
  smoothstep: () => createNode(),
  step: () => createNode(),
  sub: () => createNode(),
  uv: () => createNode(),
};
