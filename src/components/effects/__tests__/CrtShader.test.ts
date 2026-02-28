import {createCrtMaterial, crtUniforms} from '../CrtShader';

describe('CrtShader', () => {
  afterEach(() => {
    crtUniforms.time.value = 0;
    crtUniforms.reactionIntensity.value = 0.0;
  });

  it('creates a NodeMaterial with fragmentNode set', () => {
    const mat = createCrtMaterial('test');
    expect(mat.type).toBe('NodeMaterial');
    expect(mat.fragmentNode).toBeDefined();
  });

  it('exports uniforms with correct default values', () => {
    expect(crtUniforms.time.value).toBe(0);
    expect(crtUniforms.flickerIntensity.value).toBe(1.0);
    expect(crtUniforms.staticIntensity.value).toBe(0.06);
    expect(crtUniforms.reactionIntensity.value).toBe(0.0);
  });

  it('allows uniform values to be updated', () => {
    crtUniforms.time.value = 5.0;
    expect(crtUniforms.time.value).toBe(5.0);

    crtUniforms.reactionIntensity.value = 0.8;
    expect(crtUniforms.reactionIntensity.value).toBe(0.8);
  });
});
