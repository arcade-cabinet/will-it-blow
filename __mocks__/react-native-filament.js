// Mock for react-native-filament in Jest tests
const _React = require('react');

module.exports = {
  FilamentScene: ({children}) => children,
  FilamentView: ({children}) => children,
  DefaultLight: () => null,
  Camera: () => null,
  Model: () => null,
  useWorld: () => ({}),
  useRigidBody: () => ({}),
  useBoxShape: () => ({}),
  useSphereShape: () => ({}),
  useCylinderShape: () => ({}),
  useStaticPlaneShape: () => ({}),
  useFilamentContext: () => ({transformManager: {setEntityRotation: jest.fn()}}),
  useModel: () => ({state: 'loaded', rootEntity: 1}),
  useCameraManipulator: () => ({}),
};
