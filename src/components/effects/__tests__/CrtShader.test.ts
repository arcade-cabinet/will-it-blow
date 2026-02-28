import {createCrtMaterial} from '../CrtShader';

describe('CrtShader', () => {
  it('creates a ShaderMaterial with correct uniforms', () => {
    const mat = createCrtMaterial('test');
    expect(mat.uniforms.time.value).toBe(0);
    expect(mat.uniforms.flickerIntensity.value).toBe(1.0);
    expect(mat.uniforms.staticIntensity.value).toBe(0.05);
    expect(mat.uniforms.reactionIntensity.value).toBe(0.0);
  });

  it('has vertex and fragment shaders defined', () => {
    const mat = createCrtMaterial('test');
    expect(mat.vertexShader).toContain('gl_Position');
    expect(mat.fragmentShader).toContain('gl_FragColor');
  });
});
