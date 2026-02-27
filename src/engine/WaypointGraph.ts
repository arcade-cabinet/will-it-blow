/** Fixed waypoint positions in the basement kitchen. */

export type WaypointId = "center" | "fridge" | "grinder" | "stuffer" | "stove";

export interface Waypoint {
	id: WaypointId;
	label: string;
	position: [number, number, number];
	lookAt: [number, number, number];
	connections: WaypointId[];
	rotationRange: number;
}

export const WAYPOINTS: Record<WaypointId, Waypoint> = {
	center: {
		id: "center",
		label: "Center",
		position: [0, 1.6, 0],
		lookAt: [0, 1.8, -5],
		connections: ["fridge", "grinder", "stuffer"],
		rotationRange: Math.PI * 2,
	},
	fridge: {
		id: "fridge",
		label: "Fridge",
		position: [-4, 1.6, -2],
		lookAt: [-5, 1.2, -4],
		connections: ["center", "stove"],
		rotationRange: Math.PI * 0.5,
	},
	grinder: {
		id: "grinder",
		label: "Grinder",
		position: [0, 1.6, -3],
		lookAt: [0, 1.0, -5],
		connections: ["center", "stove"],
		rotationRange: Math.PI * 0.5,
	},
	stuffer: {
		id: "stuffer",
		label: "Stuffer",
		position: [4, 1.6, -2],
		lookAt: [5, 1.0, -4],
		connections: ["center", "stove"],
		rotationRange: Math.PI * 0.5,
	},
	stove: {
		id: "stove",
		label: "Stove",
		position: [0, 1.6, -5],
		lookAt: [0, 0.8, -7],
		connections: ["fridge", "grinder", "stuffer"],
		rotationRange: Math.PI,
	},
};

const ALL_IDS = Object.keys(WAYPOINTS) as WaypointId[];

function isWaypointId(id: string): id is WaypointId {
	return ALL_IDS.includes(id as WaypointId);
}

/** Returns waypoint data for the given id, or throws if invalid. */
export function getWaypoint(id: WaypointId): Waypoint {
	if (!isWaypointId(id)) {
		throw new Error(`Invalid waypoint id: ${id}`);
	}
	return WAYPOINTS[id];
}

/** Returns the connected waypoint IDs for the given id. */
export function getConnections(id: WaypointId): WaypointId[] {
	return getWaypoint(id).connections;
}

/** Returns true if there is a direct connection from `from` to `to`. */
export function canNavigate(from: WaypointId, to: WaypointId): boolean {
	return getWaypoint(from).connections.includes(to);
}

/** BFS shortest path from `from` to `to`. Returns array of WaypointIds including both endpoints. */
export function getNavigationPath(
	from: WaypointId,
	to: WaypointId,
): WaypointId[] {
	if (from === to) return [from];

	const visited = new Set<WaypointId>([from]);
	const queue: WaypointId[][] = [[from]];

	while (queue.length > 0) {
		const path = queue.shift()!;
		const current = path[path.length - 1];

		for (const neighbor of getConnections(current)) {
			if (neighbor === to) {
				return [...path, neighbor];
			}
			if (!visited.has(neighbor)) {
				visited.add(neighbor);
				queue.push([...path, neighbor]);
			}
		}
	}

	// Should never reach here in a connected graph
	throw new Error(`No path found from ${from} to ${to}`);
}
