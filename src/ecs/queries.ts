/**
 * @module ecs/queries
 * Koota ECS queries for Will It Blow?
 * Pre-built queries for common entity lookups.
 */
import {createQuery} from 'koota';
import {
  BlowoutTrait,
  ChopperTrait,
  DemandTrait,
  GrinderTrait,
  IngredientTrait,
  PhaseTag,
  PlayerTrait,
  RoundTrait,
  SausageTrait,
  ScoreTrait,
  StationTrait,
  StoveTrait,
  StufferTrait,
} from './traits';

/** All station entities. */
export const stationQuery = createQuery(StationTrait);

/** Active station entities. */
export const activeStationQuery = createQuery(StationTrait);

/** The sausage being assembled. */
export const sausageQuery = createQuery(SausageTrait);

/** Grinder station entities. */
export const grinderQuery = createQuery(GrinderTrait);

/** Stuffer station entities. */
export const stufferQuery = createQuery(StufferTrait);

/** Stove station entities. */
export const stoveQuery = createQuery(StoveTrait);

/** Chopper station entities. */
export const chopperQuery = createQuery(ChopperTrait);

/** Blowout station entities. */
export const blowoutQuery = createQuery(BlowoutTrait);

/** All ingredient entities. */
export const ingredientQuery = createQuery(IngredientTrait);

/** Selected ingredient entities. */
export const selectedIngredientQuery = createQuery(IngredientTrait);

/** Demand entities (Mr. Sausage's demands). */
export const demandQuery = createQuery(DemandTrait);

/** Score entities. */
export const scoreQuery = createQuery(ScoreTrait);

/** Round tracking entities. */
export const roundQuery = createQuery(RoundTrait);

/** Player entities. */
export const playerQuery = createQuery(PlayerTrait);

/** Phase tag entities (singleton). */
export const phaseQuery = createQuery(PhaseTag);
