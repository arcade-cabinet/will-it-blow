import {
	WAYPOINTS,
	getWaypoint,
	getConnections,
	canNavigate,
	getNavigationPath,
} from "../src/engine/WaypointGraph";
import type { WaypointId } from "../src/engine/WaypointGraph";

describe("WaypointGraph", () => {
	it("has 5 waypoints", () => {
		expect(Object.keys(WAYPOINTS)).toHaveLength(5);
	});

	it("every waypoint has position, lookAt, and connections", () => {
		for (const wp of Object.values(WAYPOINTS)) {
			expect(wp.position).toHaveLength(3);
			expect(wp.lookAt).toHaveLength(3);
			expect(wp.connections.length).toBeGreaterThan(0);
		}
	});

	it("connections are bidirectional", () => {
		for (const wp of Object.values(WAYPOINTS)) {
			for (const connId of wp.connections) {
				const connected = WAYPOINTS[connId];
				expect(connected.connections).toContain(wp.id);
			}
		}
	});

	it("getWaypoint returns data for valid id", () => {
		const center = getWaypoint("center");
		expect(center.id).toBe("center");
		expect(center.position).toEqual([0, 1.6, 0]);
		expect(center.label).toBe("Center");
	});

	it("getWaypoint throws for invalid id", () => {
		expect(() => getWaypoint("basement" as WaypointId)).toThrow(
			"Invalid waypoint id: basement",
		);
	});

	it("center connects to fridge, grinder, stuffer", () => {
		const connections = getConnections("center");
		expect(connections).toContain("fridge");
		expect(connections).toContain("grinder");
		expect(connections).toContain("stuffer");
		expect(connections).not.toContain("stove");
	});

	it("stove connects to fridge, grinder, stuffer", () => {
		const connections = getConnections("stove");
		expect(connections).toContain("fridge");
		expect(connections).toContain("grinder");
		expect(connections).toContain("stuffer");
		expect(connections).not.toContain("center");
	});

	it("canNavigate true for connected, false for unconnected", () => {
		expect(canNavigate("center", "fridge")).toBe(true);
		expect(canNavigate("center", "grinder")).toBe(true);
		expect(canNavigate("center", "stove")).toBe(false);
		expect(canNavigate("stove", "center")).toBe(false);
		expect(canNavigate("fridge", "stove")).toBe(true);
	});

	it("getNavigationPath direct path for adjacent nodes", () => {
		expect(getNavigationPath("center", "fridge")).toEqual([
			"center",
			"fridge",
		]);
		expect(getNavigationPath("fridge", "stove")).toEqual([
			"fridge",
			"stove",
		]);
	});

	it("getNavigationPath shortest path for non-adjacent (center→stove = 3 hops)", () => {
		const path = getNavigationPath("center", "stove");
		expect(path).toHaveLength(3);
		expect(path[0]).toBe("center");
		expect(path[path.length - 1]).toBe("stove");
		// Middle node must be one of the shared connections
		expect(["fridge", "grinder", "stuffer"]).toContain(path[1]);
	});

	it("getNavigationPath same start/end returns single element", () => {
		expect(getNavigationPath("center", "center")).toEqual(["center"]);
		expect(getNavigationPath("stove", "stove")).toEqual(["stove"]);
	});
});
