import {CookingColorSystem} from './CookingColorSystem';
import {FillDrivenSystem} from './FillDrivenSystem';
import {InflationSystem} from './InflationSystem';
import {OrbitSystem} from './OrbitSystem';
import {ParticlePhysicsSystem} from './ParticlePhysicsSystem';
import {RotationSystem} from './RotationSystem';
import {VibrationSystem} from './VibrationSystem';

export function SystemsProvider() {
  return (
    <>
      <VibrationSystem />
      <RotationSystem />
      <OrbitSystem />
      <CookingColorSystem />
      <InflationSystem />
      <FillDrivenSystem />
      <ParticlePhysicsSystem />
    </>
  );
}
