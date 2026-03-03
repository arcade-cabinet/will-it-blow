import {ButtonSystem} from './ButtonSystem';
import {CombatSystem} from './CombatSystem';
import {CookingColorSystem} from './CookingColorSystem';
import {CrankSystem} from './CrankSystem';
import {DialSystem} from './DialSystem';
import {EnemySpawnSystem} from './EnemySpawnSystem';
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
import {XRInputSystem} from './XRInputSystem';

export function SystemsProvider() {
  return (
    <>
      {/* XR input — must run before other input systems so XR state is current */}
      <XRInputSystem />
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
      {/* Enemy / combat systems */}
      <EnemySpawnSystem />
      <CombatSystem />
    </>
  );
}
