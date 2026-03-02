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
export const lights = world.with('lightDef', 'transform');
export const particles = world.with('particle', 'three');
