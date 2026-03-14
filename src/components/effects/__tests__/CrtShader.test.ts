import {createCrtMaterial, createCrtUniforms} from '../CrtShader';

describe('CrtShader', () => {
  it('creates a ShaderMaterial with vertex and fragment shaders', () => {
    const mat = createCrtMaterial('test');
    expect(mat.type).toBe('ShaderMaterial');
    expect(mat.vertexShader).toBeDefined();
    expect(mat.fragmentShader).toBeDefined();
    expect(mat.vertexShader.length).toBeGreaterThan(0);
    expect(mat.fragmentShader.length).toBeGreaterThan(0);
  });

  it('creates uniforms with correct default values', () => {
    const uniforms = createCrtUniforms();
    expect(uniforms.uTime.value).toBe(0);
    expect(uniforms.uFlickerIntensity.value).toBe(1.0);
    expect(uniforms.uStaticIntensity.value).toBe(0.06);
    expect(uniforms.uReactionIntensity.value).toBe(0.0);
  });

  it('material uniforms can be updated', () => {
    const mat = createCrtMaterial('test');
    mat.uniforms.uTime.value = 5.0;
    expect(mat.uniforms.uTime.value).toBe(5.0);

    mat.uniforms.uReactionIntensity.value = 0.8;
    expect(mat.uniforms.uReactionIntensity.value).toBe(0.8);
  });

  it('includes CRT effect keywords in fragment shader', () => {
    const mat = createCrtMaterial('test');
    const frag = mat.fragmentShader;
    // Verify key CRT effects are present in the shader source
    expect(frag).toContain('Barrel distortion');
    expect(frag).toContain('Scanlines');
    expect(frag).toContain('Chromatic aberration');
    expect(frag).toContain('Vignette');
    expect(frag).toContain('Static noise');
  });
});
