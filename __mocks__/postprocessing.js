const React = require('react');
const noop = props => React.createElement('group', null, props.children);
module.exports = {
  EffectComposer: noop,
  Bloom: () => null,
  Vignette: () => null,
  ChromaticAberration: () => null,
  Noise: () => null,
  // BlendFunction enum values (from the postprocessing package)
  BlendFunction: {
    NORMAL: 27,
    OVERLAY: 29,
    ADD: 2,
    MULTIPLY: 25,
    SCREEN: 35,
  },
};
