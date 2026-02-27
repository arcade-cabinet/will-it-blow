import {
  Color3,
  type Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import { REACTIONS, type Reaction } from "./reactions";

interface MrSausage3DProps {
  reaction?: Reaction;
  position?: [number, number, number];
  scale?: number;
}

/**
 * Mr. Sausage — just the iconic head.
 *
 * Youtooz reference: hotdog-bun colored head, sick aviator shades above
 * a lush handlebar mustache, and a white chef toque on top.
 */
export const MrSausage3D = ({
  reaction = "idle",
  position = [0, 0, 0],
  scale = 1,
}: MrSausage3DProps) => {
  const scene = useScene();
  const reactionRef = useRef<Reaction>(reaction);
  const rootRef = useRef<TransformNode | null>(null);

  useEffect(() => {
    reactionRef.current = reaction;
  }, [reaction]);

  // Update position/scale without recreating geometry
  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.position = new Vector3(position[0], position[1], position[2]);
      rootRef.current.scaling = new Vector3(scale, scale, scale);
    }
  }, [position, scale]);

  useEffect(() => {
    if (!scene) return;

    // ==========================================================
    // MATERIALS — strong emissive so they glow against dark BG
    // ==========================================================

    // Helper: create a self-lit material (lighting disabled, emissive = final color)
    const toon = (name: string, r: number, g: number, b: number) => {
      const mat = new StandardMaterial(name, scene);
      mat.disableLighting = true;
      mat.emissiveColor = new Color3(r, g, b);
      return mat;
    };

    // Hotdog bun skin — warm peach/tan
    const skinMat = toon("mrSkin", 0.92, 0.62, 0.35);

    // Mustard zigzag — bright yellow
    const mustardMat = toon("mrMustard", 1.0, 0.82, 0.05);

    // Sunglasses lenses — very dark, slight blue tint
    const lensMat = toon("mrLens", 0.06, 0.06, 0.12);

    // Glasses frame — dark charcoal
    const frameMat = toon("mrFrame", 0.15, 0.15, 0.18);

    // Mustache — dark brown
    const stacheMat = toon("mrStache", 0.35, 0.18, 0.06);

    // Chef hat — bright white
    const hatMat = toon("mrHat", 0.95, 0.95, 0.95);

    // ==========================================================
    // ROOT
    // ==========================================================
    const root = new TransformNode("mrSausage", scene);
    root.position = new Vector3(position[0], position[1], position[2]);
    root.scaling = new Vector3(scale, scale, scale);
    rootRef.current = root;

    // ==========================================================
    // HEAD — big bun-colored sphere, the main mass
    // ==========================================================
    const head = MeshBuilder.CreateSphere(
      "mrHead",
      { diameter: 3.6, segments: 24 },
      scene,
    );
    head.scaling = new Vector3(1.0, 1.05, 0.95);
    head.material = skinMat;
    head.parent = root;

    // ==========================================================
    // SUNGLASSES — the #1 defining feature, big and prominent
    // ==========================================================

    // Left lens — squished oval
    const lensL = MeshBuilder.CreateSphere(
      "lensL",
      { diameter: 1.1, segments: 16 },
      scene,
    );
    lensL.scaling = new Vector3(0.95, 0.75, 0.35);
    lensL.position = new Vector3(-0.6, 0.25, -1.45);
    lensL.material = lensMat;
    lensL.parent = root;

    // Right lens
    const lensR = MeshBuilder.CreateSphere(
      "lensR",
      { diameter: 1.1, segments: 16 },
      scene,
    );
    lensR.scaling = new Vector3(0.95, 0.75, 0.35);
    lensR.position = new Vector3(0.6, 0.25, -1.45);
    lensR.material = lensMat;
    lensR.parent = root;

    // Bridge between lenses
    const bridge = MeshBuilder.CreateBox(
      "bridge",
      { width: 0.5, height: 0.12, depth: 0.12 },
      scene,
    );
    bridge.position = new Vector3(0, 0.3, -1.55);
    bridge.material = frameMat;
    bridge.parent = root;

    // Top bar across both lenses (thick brow bar)
    const topBar = MeshBuilder.CreateBox(
      "topBar",
      { width: 2.1, height: 0.15, depth: 0.12 },
      scene,
    );
    topBar.position = new Vector3(0, 0.62, -1.52);
    topBar.material = frameMat;
    topBar.parent = root;

    // Left temple arm
    const templeL = MeshBuilder.CreateBox(
      "templeL",
      { width: 0.1, height: 0.1, depth: 1.0 },
      scene,
    );
    templeL.position = new Vector3(-1.0, 0.55, -1.0);
    templeL.material = frameMat;
    templeL.parent = root;

    // Right temple arm
    const templeR = MeshBuilder.CreateBox(
      "templeR",
      { width: 0.1, height: 0.1, depth: 1.0 },
      scene,
    );
    templeR.position = new Vector3(1.0, 0.55, -1.0);
    templeR.material = frameMat;
    templeR.parent = root;

    // ==========================================================
    // MUSTACHE — big lush handlebar
    // ==========================================================

    // Center bar
    const stacheCenter = MeshBuilder.CreateBox(
      "stacheCenter",
      { width: 1.4, height: 0.35, depth: 0.3 },
      scene,
    );
    stacheCenter.position = new Vector3(0, -0.35, -1.5);
    stacheCenter.material = stacheMat;
    stacheCenter.parent = root;

    // Left handlebar curl — big sweeping arc
    const curlL = MeshBuilder.CreateTorus(
      "curlL",
      { diameter: 0.85, thickness: 0.22, tessellation: 20 },
      scene,
    );
    curlL.position = new Vector3(-1.05, -0.38, -1.4);
    curlL.rotation.y = Math.PI / 2;
    curlL.rotation.x = -0.15;
    curlL.scaling = new Vector3(1.0, 1.0, 0.5);
    curlL.material = stacheMat;
    curlL.parent = root;

    // Left curl tip — upswept end
    const tipL = MeshBuilder.CreateSphere(
      "tipL",
      { diameter: 0.32, segments: 10 },
      scene,
    );
    tipL.position = new Vector3(-1.55, -0.2, -1.35);
    tipL.material = stacheMat;
    tipL.parent = root;

    // Right handlebar curl
    const curlR = MeshBuilder.CreateTorus(
      "curlR",
      { diameter: 0.85, thickness: 0.22, tessellation: 20 },
      scene,
    );
    curlR.position = new Vector3(1.05, -0.38, -1.4);
    curlR.rotation.y = -Math.PI / 2;
    curlR.rotation.x = -0.15;
    curlR.scaling = new Vector3(1.0, 1.0, 0.5);
    curlR.material = stacheMat;
    curlR.parent = root;

    // Right curl tip
    const tipR = MeshBuilder.CreateSphere(
      "tipR",
      { diameter: 0.32, segments: 10 },
      scene,
    );
    tipR.position = new Vector3(1.55, -0.2, -1.35);
    tipR.material = stacheMat;
    tipR.parent = root;

    // No chin/chin balls — Youtooz style, just clean head sphere

    // ==========================================================
    // CHEF HAT (TOQUE) — lowered, prominent, cloth texture
    // ==========================================================

    // Slightly off-white for brim band to create contrast
    const brimMat = toon("mrBrim", 0.88, 0.88, 0.85);

    // Brim band — sits right on top of the head
    const hatBrim = MeshBuilder.CreateCylinder(
      "hatBrim",
      { height: 0.3, diameter: 2.8, tessellation: 28 },
      scene,
    );
    hatBrim.position = new Vector3(0, 1.4, 0);
    hatBrim.material = brimMat;
    hatBrim.parent = root;

    // Toque body — tapers up
    const hatBody = MeshBuilder.CreateCylinder(
      "hatBody",
      { height: 1.3, diameterTop: 1.8, diameterBottom: 2.3, tessellation: 24 },
      scene,
    );
    hatBody.position = new Vector3(0, 2.2, 0);
    hatBody.material = hatMat;
    hatBody.parent = root;

    // Cloth pleats — vertical ridges on the toque body for fabric feel
    const pleats: Mesh[] = [];
    const pleatCount = 8;
    for (let i = 0; i < pleatCount; i++) {
      const angle = (i / pleatCount) * Math.PI * 2;
      const pleat = MeshBuilder.CreateBox(
        `pleat_${i}`,
        { width: 0.06, height: 1.2, depth: 0.06 },
        scene,
      );
      pleat.position = new Vector3(
        Math.cos(angle) * 1.05,
        2.2,
        Math.sin(angle) * 1.05,
      );
      pleat.material = brimMat; // Slightly darker than hat body
      pleat.parent = root;
      pleats.push(pleat);
    }

    // Puffy top dome — the iconic chef hat puff
    const hatPuff = MeshBuilder.CreateSphere(
      "hatPuff",
      { diameter: 2.2, segments: 18 },
      scene,
    );
    hatPuff.position = new Vector3(0, 2.95, 0);
    hatPuff.scaling = new Vector3(1.0, 0.6, 1.0);
    hatPuff.material = hatMat;
    hatPuff.parent = root;

    // Secondary puff bulge for cloth irregularity
    const hatPuff2 = MeshBuilder.CreateSphere(
      "hatPuff2",
      { diameter: 1.2, segments: 12 },
      scene,
    );
    hatPuff2.position = new Vector3(0.3, 3.1, -0.2);
    hatPuff2.scaling = new Vector3(1.0, 0.5, 0.8);
    hatPuff2.material = hatMat;
    hatPuff2.parent = root;

    // ==========================================================
    // MUSTARD ZIGZAG — squiggly stripe on the forehead/top
    // Small spheres in a sine wave pattern
    // ==========================================================
    const mustardBalls: Mesh[] = [];
    const mustardCount = 10;
    for (let i = 0; i < mustardCount; i++) {
      const t = i / (mustardCount - 1); // 0 to 1
      const y = 0.6 + t * 1.0; // runs up from mid-head to near hat
      const ball = MeshBuilder.CreateSphere(
        `mustard_${i}`,
        { diameter: 0.2, segments: 8 },
        scene,
      );
      ball.position = new Vector3(
        Math.sin(t * Math.PI * 3) * 0.2,
        y,
        -1.55 + t * 0.3,
      );
      ball.material = mustardMat;
      ball.parent = root;
      mustardBalls.push(ball);
    }

    // ==========================================================
    // ANIMATION
    // ==========================================================
    const baseY = position[1];
    let time = 0;
    let reactionElapsed = 0;
    let prevReaction: Reaction = reactionRef.current;

    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      time += dt;

      const currentReaction = reactionRef.current;
      const reactionDef = REACTIONS[currentReaction];

      if (currentReaction !== prevReaction) {
        prevReaction = currentReaction;
        reactionElapsed = 0;
      }
      reactionElapsed += dt * 1000;

      // Revert non-looping reactions after duration
      const active = reactionDef.loop || reactionElapsed <= reactionDef.duration;

      switch (currentReaction) {
        case "idle": {
          // Gentle float + slow rotation
          root.position.y = baseY + Math.sin(time * 1.8) * 0.15;
          root.rotation.y = Math.sin(time * 0.6) * 0.06;
          root.rotation.z = Math.sin(time * 1.2) * 0.03;
          // Mustache wiggle
          stacheCenter.rotation.z = Math.sin(time * 3) * 0.04;
          curlL.rotation.z = Math.sin(time * 3) * 0.05;
          curlR.rotation.z = -Math.sin(time * 3) * 0.05;
          break;
        }
        case "flinch": {
          if (active) {
            root.rotation.z = -0.15;
            root.rotation.x = -0.1;
            root.position.y = baseY + 0.2;
          } else {
            const decay = 1 - Math.exp(-10 * dt);
            root.rotation.z += (0 - root.rotation.z) * decay;
            root.rotation.x += (0 - root.rotation.x) * decay;
            root.position.y = baseY;
          }
          break;
        }
        case "laugh": {
          root.position.x = position[0] + Math.sin(time * 22) * 0.12;
          root.position.y = baseY + Math.abs(Math.sin(time * 7)) * 0.3;
          root.rotation.z = Math.sin(time * 18) * 0.06;
          stacheCenter.rotation.z = Math.sin(time * 5) * 0.08;
          break;
        }
        case "disgust": {
          if (active) {
            root.rotation.z = 0.12;
            root.rotation.x = -0.2;
          } else {
            const decay = 1 - Math.exp(-10 * dt);
            root.rotation.z += (0 - root.rotation.z) * decay;
            root.rotation.x += (0 - root.rotation.x) * decay;
          }
          root.position.y = baseY;
          break;
        }
        case "excitement": {
          root.position.y = baseY + Math.abs(Math.sin(time * 6)) * 0.5;
          const pulse = 1 + Math.sin(time * 8) * 0.04;
          head.scaling.y = 1.05 * pulse;
          root.rotation.z = Math.sin(time * 10) * 0.05;
          break;
        }
        case "nervous": {
          root.position.x = position[0] + Math.sin(time * 14) * 0.04;
          root.position.y = baseY + Math.sin(time * 2) * 0.06;
          root.rotation.z = Math.sin(time * 3) * 0.04;
          break;
        }
        case "nod": {
          const nodPhase = (reactionElapsed / 300) * Math.PI;
          root.rotation.x = Math.abs(Math.sin(nodPhase)) * 0.25;
          root.position.y = baseY;
          break;
        }
        case "talk": {
          root.position.y = baseY + Math.sin(time * 2) * 0.05;
          const talkPulse = 1 + Math.sin(time * 10) * 0.015;
          head.scaling.y = 1.05 * talkPulse;
          stacheCenter.rotation.z = Math.sin(time * 7) * 0.03;
          break;
        }
      }
    });

    // ==========================================================
    // CLEANUP
    // ==========================================================
    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      rootRef.current = null;

      // root.dispose() recursively disposes all child meshes
      root.dispose();

      // Materials must be disposed separately
      skinMat.dispose();
      mustardMat.dispose();
      lensMat.dispose();
      frameMat.dispose();
      stacheMat.dispose();
      hatMat.dispose();
      brimMat.dispose();
    };
  }, [scene]);

  return null;
};
