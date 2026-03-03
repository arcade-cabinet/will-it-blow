module.exports = {
  XR: ({children}) => children,
  createXRStore: () => ({
    enterVR: () => {},
    enterAR: () => {},
    getState: () => ({session: null, inputSourceStates: [], mode: null}),
    subscribe: () => () => {},
  }),
  useXR: selector => {
    const state = {session: null, inputSourceStates: [], mode: null};
    return selector ? selector(state) : state;
  },
  useXRInputSourceState: () => undefined,
  useXRInputSourceStates: () => [],
  useXRInputSourceEvent: () => {},
  useXRControllerButtonEvent: () => {},
  useXRStore: () => module.exports.createXRStore(),
  useXRSessionVisibilityState: () => undefined,
  useXRSessionModeSupported: () => undefined,
  useXRSessionFeatureEnabled: () => false,
  useXRControllerLocomotion: () => {},
  useHover: () => false,
  XRControllerComponent: () => null,
  XRControllerModel: () => null,
  XROrigin: ({children}) => children,
  TeleportTarget: ({children}) => children,
  TeleportPointerRayModel: () => null,
  IfInSessionMode: ({children}) => children,
  NotInXR: ({children}) => children,
  PointerEvents: () => null,
  noEvents: () => ({}),
};
