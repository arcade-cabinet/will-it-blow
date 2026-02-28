/**
 * Jest mock for three/webgpu.
 *
 * Re-exports everything from the base 'three' CJS bundle and adds stubs
 * for WebGPU-specific classes (NodeMaterial, WebGPURenderer) that only
 * exist in the ESM three/webgpu entry point.
 */
const THREE = require('three');

class NodeMaterial extends THREE.Material {
  constructor() {
    super();
    this.type = 'NodeMaterial';
    this.fragmentNode = null;
  }
}

class WebGPURenderer {
  constructor() {
    this.domElement = null;
  }
  async init() {
    return Promise.resolve();
  }
  setSize() {}
  render() {}
  dispose() {}
}

module.exports = {
  ...THREE,
  NodeMaterial,
  WebGPURenderer,
};
