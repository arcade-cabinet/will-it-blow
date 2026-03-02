const React = require('react');

const passthrough = ({children}) => (children != null ? children : null);

// Stub rigid body API surface used by physics-driven components
const noopRigidBody = {
  addForce: () => {},
  applyImpulse: () => {},
  applyTorqueImpulse: () => {},
  setBodyType: () => {},
  setTranslation: () => {},
  setLinvel: () => {},
  setAngvel: () => {},
  setNextKinematicTranslation: () => {},
  wakeUp: () => {},
  sleep: () => {},
  mass: () => 1,
  translation: () => ({x: 0, y: 0, z: 0}),
  linvel: () => ({x: 0, y: 0, z: 0}),
};

module.exports = {
  Physics: passthrough,
  RigidBody: React.forwardRef(({children}, ref) => {
    React.useImperativeHandle(ref, () => noopRigidBody);
    return children != null ? children : null;
  }),
  BallCollider: passthrough,
  CapsuleCollider: passthrough,
  CylinderCollider: passthrough,
  CuboidCollider: passthrough,
  useRapier: () => ({world: null}),
};
