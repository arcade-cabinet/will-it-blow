import {World} from 'miniplex';
import {createReactAPI} from 'miniplex-react';
import type {Entity} from './types';

export const world = new World<Entity>();
export const ECS = createReactAPI(world);

// Pre-built queries
export const vibrating = world.with('vibration', 'three');
export const rotating = world.with('rotation', 'three');
export const orbiting = world.with('orbit', 'three');
export const cookable = world.with('cookAppearance', 'three');
export const inflatable = world.with('inflation', 'three');
export const renderable = world.with('geometry', 'material', 'transform');
export const nonMachineRenderable = world
  .with('geometry', 'material', 'transform')
  .without('machineSlot');
export const lights = world.with('lightDef', 'transform');
export const particles = world.with('particle', 'three');
export const fillDriven = world.with('fillDriven', 'three');
export const flickerLights = world.with('flicker', 'lightDef', 'three');

// Input primitive queries
export const dials = world.with('dial', 'three');
export const cranks = world.with('crank', 'three');
export const plungers = world.with('plunger', 'three');
export const toggles = world.with('toggle', 'three');
export const buttons = world.with('button', 'three');
export const contracts = world.with('inputContract');

// Enemy / Combat queries
export const enemies = world.with('enemy', 'three');
export const weapons = world.with('weapon', 'three');
