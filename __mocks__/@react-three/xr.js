module.exports = {
  XR: ({children}) => children,
  createXRStore: () => ({
    enterVR: () => {},
    enterAR: () => {},
  }),
};
