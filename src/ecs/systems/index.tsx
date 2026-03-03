import {ButtonSystem} from './ButtonSystem';
import {CookingColorSystem} from './CookingColorSystem';
import {CrankSystem} from './CrankSystem';
import {DialSystem} from './DialSystem';
import {FillDrivenSystem} from './FillDrivenSystem';
import {FlickerSystem} from './FlickerSystem';
import {InflationSystem} from './InflationSystem';
import {InputContractSystem} from './InputContractSystem';
import {OrbitSystem} from './OrbitSystem';
import {ParticlePhysicsSystem} from './ParticlePhysicsSystem';
import {PlungerSystem} from './PlungerSystem';
import {RotationSystem} from './RotationSystem';
import {ToggleSystem} from './ToggleSystem';
import {VibrationSystem} from './VibrationSystem';

export function SystemsProvider() {
  return (
    <>
      {/* Input systems — process gestures first */}
      <DialSystem />
      <CrankSystem />
      <PlungerSystem />
      <ToggleSystem />
      <ButtonSystem />
      <InputContractSystem />
      {/* Behavior systems — animate based on updated params */}
      <VibrationSystem />
      <RotationSystem />
      <OrbitSystem />
      <CookingColorSystem />
      <InflationSystem />
      <FillDrivenSystem />
      <FlickerSystem />
      <ParticlePhysicsSystem />
    </>
  );
}
