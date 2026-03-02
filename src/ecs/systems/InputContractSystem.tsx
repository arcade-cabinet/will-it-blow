import {useFrame} from '@react-three/fiber';
import type {BindingTransform} from '../inputTypes';
import type {Entity} from '../types';
import {contracts, world} from '../world';

/**
 * Read a nested field from an entity using a dot-separated path.
 * e.g. 'toggle.isOn' reads entity.toggle.isOn
 */
function readField(entity: Entity, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = entity;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Write a value to a nested field on an entity using a dot-separated path.
 * e.g. 'powerSource.powerLevel' sets entity.powerSource.powerLevel = value
 */
function writeField(entity: Entity, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: unknown = entity;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current == null || typeof current !== 'object') return;
    current = (current as Record<string, unknown>)[parts[i]];
  }
  if (current == null || typeof current !== 'object') return;
  (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
}

function applyTransform(transform: BindingTransform, sourceValue: unknown): unknown {
  switch (transform.type) {
    case 'segmentMap':
      return transform.map[String(sourceValue)];
    case 'linear': {
      const num = Number(sourceValue);
      let result = num * transform.scale + (transform.offset ?? 0);
      if (transform.clamp) {
        result = Math.max(transform.clamp[0], Math.min(transform.clamp[1], result));
      }
      return result;
    }
    case 'threshold': {
      const num = Number(sourceValue);
      return num >= transform.value ? transform.above : transform.below;
    }
    case 'passthrough':
      return sourceValue;
  }
}

export function updateContracts(contractEntities: Entity[], allEntities: Entity[]): void {
  // Build name → entity lookup
  const nameMap = new Map<string, Entity>();
  for (const e of allEntities) {
    if (e.name) {
      nameMap.set(e.name, e);
    }
  }

  for (const e of contractEntities) {
    const contract = e.inputContract;
    if (!contract) continue;

    for (const binding of contract.bindings) {
      const sourceEntity = nameMap.get(binding.source.entityName);
      if (!sourceEntity) continue;

      const targetEntity = nameMap.get(binding.target.entityName);
      if (!targetEntity) continue;

      const sourceValue = readField(sourceEntity, binding.source.field);
      if (sourceValue === undefined) continue;

      const result = applyTransform(binding.transform, sourceValue);
      if (result === undefined) continue;

      writeField(targetEntity, binding.target.field, result);
    }
  }
}

export function InputContractSystem() {
  useFrame(() => {
    updateContracts([...contracts], [...world.entities]);
  });
  return null;
}
