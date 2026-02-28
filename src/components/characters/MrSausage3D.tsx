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
  /** Y-axis rotation in radians (e.g. Math.PI to face opposite direction) */
  rotationY?: number;
  /** When true, root subtly rotates to face the active camera */
  trackCamera?: boolean;
}

/**
 * Mr. Sausage — the iconic head with full facial rigging.
 *
 * Youtooz reference: hotdog-bun colored head, sick aviator shades above
 * a lush handlebar mustache, and a white chef toque on top.
 *
 * Rigging controls:
 * - Eyes: peek above sunglasses, with movable pupils and blink lids
 * - Mouth: below mustache, opens/closes with shape
 * - Cheeks: color-shifting blush pads (subtle pink → deep angry red)
 * - Camera tracking: head slowly follows the player's camera
 */
export const MrSausage3D = ({
  reaction = "idle",
  position = [0, 0, 0],
  scale = 1,
  rotationY = 0,
  trackCamera = false,
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

    const toon = (name: string, r: number, g: number, b: number) => {
      const mat = new StandardMaterial(name, scene);
      mat.disableLighting = true;
      mat.emissiveColor = new Color3(r, g, b);
      return mat;
    };

    const skinMat = toon("mrSkin", 0.92, 0.62, 0.35);
    const mustardMat = toon("mrMustard", 1.0, 0.82, 0.05);
    const lensMat = toon("mrLens", 0.06, 0.06, 0.12);
    const frameMat = toon("mrFrame", 0.15, 0.15, 0.18);
    const stacheMat = toon("mrStache", 0.35, 0.18, 0.06);
    const hatMat = toon("mrHat", 0.95, 0.95, 0.95);
    const brimMat = toon("mrBrim", 0.88, 0.88, 0.85);

    // Eye materials
    const scleraMat = toon("mrSclera", 0.95, 0.95, 0.92); // Warm white
    const irisMat = toon("mrIris", 0.25, 0.55, 0.3); // Olive green
    const pupilMat = toon("mrPupil", 0.02, 0.02, 0.02); // Near black
    const lidMat = toon("mrLid", 0.85, 0.55, 0.3); // Skin-toned eyelid

    // Mouth materials
    const mouthMat = toon("mrMouth", 0.15, 0.04, 0.02); // Dark mouth interior
    const lipMat = toon("mrLip", 0.75, 0.35, 0.25); // Warm lip color

    // Cheek material — starts at skin tone, animates to red
    const cheekMat = new StandardMaterial("mrCheek", scene);
    cheekMat.disableLighting = true;
    cheekMat.emissiveColor = new Color3(0.92, 0.62, 0.35);
    cheekMat.alpha = 0.6;

    // ==========================================================
    // ROOT
    // ==========================================================
    const root = new TransformNode("mrSausage", scene);
    root.position = new Vector3(position[0], position[1], position[2]);
    root.scaling = new Vector3(scale, scale, scale);
    root.rotation.y = rotationY;
    rootRef.current = root;

    // ==========================================================
    // HEAD
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
    // EYES — peek above sunglasses with iris + pupil
    // ==========================================================

    // Eye containers (transform nodes for independent pupil movement)
    const eyeL = new TransformNode("eyeL", scene);
    eyeL.position = new Vector3(-0.55, 0.72, -1.35);
    eyeL.parent = root;

    const eyeR = new TransformNode("eyeR", scene);
    eyeR.position = new Vector3(0.55, 0.72, -1.35);
    eyeR.parent = root;

    // Left eye
    const scleraL = MeshBuilder.CreateSphere("scleraL", { diameter: 0.5, segments: 12 }, scene);
    scleraL.scaling = new Vector3(1.0, 0.85, 0.4);
    scleraL.material = scleraMat;
    scleraL.parent = eyeL;

    const irisL = MeshBuilder.CreateSphere("irisL", { diameter: 0.22, segments: 10 }, scene);
    irisL.position = new Vector3(0, 0, -0.12);
    irisL.scaling = new Vector3(1.0, 1.0, 0.3);
    irisL.material = irisMat;
    irisL.parent = eyeL;

    const pupilL = MeshBuilder.CreateSphere("pupilL", { diameter: 0.12, segments: 8 }, scene);
    pupilL.position = new Vector3(0, 0, -0.15);
    pupilL.scaling = new Vector3(1.0, 1.0, 0.3);
    pupilL.material = pupilMat;
    pupilL.parent = eyeL;

    // Left eyelid — half-sphere that scales down over the eye for blinks/squints
    const lidL = MeshBuilder.CreateSphere("lidL", { diameter: 0.54, segments: 10 }, scene);
    lidL.scaling = new Vector3(1.05, 0.0, 0.45); // starts invisible (0 Y = open)
    lidL.position = new Vector3(0, 0.12, -0.02);
    lidL.material = lidMat;
    lidL.parent = eyeL;

    // Right eye
    const scleraR = MeshBuilder.CreateSphere("scleraR", { diameter: 0.5, segments: 12 }, scene);
    scleraR.scaling = new Vector3(1.0, 0.85, 0.4);
    scleraR.material = scleraMat;
    scleraR.parent = eyeR;

    const irisR = MeshBuilder.CreateSphere("irisR", { diameter: 0.22, segments: 10 }, scene);
    irisR.position = new Vector3(0, 0, -0.12);
    irisR.scaling = new Vector3(1.0, 1.0, 0.3);
    irisR.material = irisMat;
    irisR.parent = eyeR;

    const pupilR = MeshBuilder.CreateSphere("pupilR", { diameter: 0.12, segments: 8 }, scene);
    pupilR.position = new Vector3(0, 0, -0.15);
    pupilR.scaling = new Vector3(1.0, 1.0, 0.3);
    pupilR.material = pupilMat;
    pupilR.parent = eyeR;

    const lidR = MeshBuilder.CreateSphere("lidR", { diameter: 0.54, segments: 10 }, scene);
    lidR.scaling = new Vector3(1.05, 0.0, 0.45);
    lidR.position = new Vector3(0, 0.12, -0.02);
    lidR.material = lidMat;
    lidR.parent = eyeR;

    // ==========================================================
    // SUNGLASSES
    // ==========================================================

    const lensL = MeshBuilder.CreateSphere("lensL", { diameter: 1.1, segments: 16 }, scene);
    lensL.scaling = new Vector3(0.95, 0.75, 0.35);
    lensL.position = new Vector3(-0.6, 0.25, -1.45);
    lensL.material = lensMat;
    lensL.parent = root;

    const lensR = MeshBuilder.CreateSphere("lensR", { diameter: 1.1, segments: 16 }, scene);
    lensR.scaling = new Vector3(0.95, 0.75, 0.35);
    lensR.position = new Vector3(0.6, 0.25, -1.45);
    lensR.material = lensMat;
    lensR.parent = root;

    const bridge = MeshBuilder.CreateBox("bridge", { width: 0.5, height: 0.12, depth: 0.12 }, scene);
    bridge.position = new Vector3(0, 0.3, -1.55);
    bridge.material = frameMat;
    bridge.parent = root;

    const topBar = MeshBuilder.CreateBox("topBar", { width: 2.1, height: 0.15, depth: 0.12 }, scene);
    topBar.position = new Vector3(0, 0.62, -1.52);
    topBar.material = frameMat;
    topBar.parent = root;

    const templeL = MeshBuilder.CreateBox("templeL", { width: 0.1, height: 0.1, depth: 1.0 }, scene);
    templeL.position = new Vector3(-1.0, 0.55, -1.0);
    templeL.material = frameMat;
    templeL.parent = root;

    const templeR = MeshBuilder.CreateBox("templeR", { width: 0.1, height: 0.1, depth: 1.0 }, scene);
    templeR.position = new Vector3(1.0, 0.55, -1.0);
    templeR.material = frameMat;
    templeR.parent = root;

    // ==========================================================
    // MOUTH — below mustache, elliptical opening
    // ==========================================================

    // Mouth opening (dark interior)
    const mouth = MeshBuilder.CreateSphere("mrMouth", { diameter: 0.7, segments: 12 }, scene);
    mouth.scaling = new Vector3(1.2, 0.0, 0.35); // starts closed (0 Y)
    mouth.position = new Vector3(0, -0.85, -1.4);
    mouth.material = mouthMat;
    mouth.parent = root;

    // Upper lip line
    const upperLip = MeshBuilder.CreateBox("upperLip", { width: 0.8, height: 0.06, depth: 0.15 }, scene);
    upperLip.position = new Vector3(0, -0.7, -1.48);
    upperLip.material = lipMat;
    upperLip.parent = root;

    // Lower lip — curves down when mouth opens
    const lowerLip = MeshBuilder.CreateBox("lowerLip", { width: 0.65, height: 0.06, depth: 0.12 }, scene);
    lowerLip.position = new Vector3(0, -0.88, -1.42);
    lowerLip.material = lipMat;
    lowerLip.parent = root;

    // ==========================================================
    // CHEEKS — blush pads that shift from skin tone to angry red
    // ==========================================================

    const cheekL = MeshBuilder.CreateSphere("cheekL", { diameter: 0.8, segments: 10 }, scene);
    cheekL.scaling = new Vector3(0.5, 0.4, 0.2);
    cheekL.position = new Vector3(-1.1, -0.1, -1.2);
    cheekL.material = cheekMat;
    cheekL.parent = root;

    const cheekR = MeshBuilder.CreateSphere("cheekR", { diameter: 0.8, segments: 10 }, scene);
    cheekR.scaling = new Vector3(0.5, 0.4, 0.2);
    cheekR.position = new Vector3(1.1, -0.1, -1.2);
    cheekR.material = cheekMat;
    cheekR.parent = root;

    // ==========================================================
    // MUSTACHE
    // ==========================================================

    const stacheCenter = MeshBuilder.CreateBox(
      "stacheCenter",
      { width: 1.4, height: 0.35, depth: 0.3 },
      scene,
    );
    stacheCenter.position = new Vector3(0, -0.35, -1.5);
    stacheCenter.material = stacheMat;
    stacheCenter.parent = root;

    const curlL = MeshBuilder.CreateTorus("curlL", { diameter: 0.85, thickness: 0.22, tessellation: 20 }, scene);
    curlL.position = new Vector3(-1.05, -0.38, -1.4);
    curlL.rotation.y = Math.PI / 2;
    curlL.rotation.x = -0.15;
    curlL.scaling = new Vector3(1.0, 1.0, 0.5);
    curlL.material = stacheMat;
    curlL.parent = root;

    const tipL = MeshBuilder.CreateSphere("tipL", { diameter: 0.32, segments: 10 }, scene);
    tipL.position = new Vector3(-1.55, -0.2, -1.35);
    tipL.material = stacheMat;
    tipL.parent = root;

    const curlR = MeshBuilder.CreateTorus("curlR", { diameter: 0.85, thickness: 0.22, tessellation: 20 }, scene);
    curlR.position = new Vector3(1.05, -0.38, -1.4);
    curlR.rotation.y = -Math.PI / 2;
    curlR.rotation.x = -0.15;
    curlR.scaling = new Vector3(1.0, 1.0, 0.5);
    curlR.material = stacheMat;
    curlR.parent = root;

    const tipR = MeshBuilder.CreateSphere("tipR", { diameter: 0.32, segments: 10 }, scene);
    tipR.position = new Vector3(1.55, -0.2, -1.35);
    tipR.material = stacheMat;
    tipR.parent = root;

    // ==========================================================
    // CHEF HAT (TOQUE)
    // ==========================================================

    const hatBrim = MeshBuilder.CreateCylinder("hatBrim", { height: 0.3, diameter: 2.8, tessellation: 28 }, scene);
    hatBrim.position = new Vector3(0, 1.4, 0);
    hatBrim.material = brimMat;
    hatBrim.parent = root;

    const hatBody = MeshBuilder.CreateCylinder("hatBody", { height: 1.3, diameterTop: 1.8, diameterBottom: 2.3, tessellation: 24 }, scene);
    hatBody.position = new Vector3(0, 2.2, 0);
    hatBody.material = hatMat;
    hatBody.parent = root;

    const pleats: Mesh[] = [];
    const pleatCount = 8;
    for (let i = 0; i < pleatCount; i++) {
      const angle = (i / pleatCount) * Math.PI * 2;
      const pleat = MeshBuilder.CreateBox(`pleat_${i}`, { width: 0.06, height: 1.2, depth: 0.06 }, scene);
      pleat.position = new Vector3(Math.cos(angle) * 1.05, 2.2, Math.sin(angle) * 1.05);
      pleat.material = brimMat;
      pleat.parent = root;
      pleats.push(pleat);
    }

    const hatPuff = MeshBuilder.CreateSphere("hatPuff", { diameter: 2.2, segments: 18 }, scene);
    hatPuff.position = new Vector3(0, 2.95, 0);
    hatPuff.scaling = new Vector3(1.0, 0.6, 1.0);
    hatPuff.material = hatMat;
    hatPuff.parent = root;

    const hatPuff2 = MeshBuilder.CreateSphere("hatPuff2", { diameter: 1.2, segments: 12 }, scene);
    hatPuff2.position = new Vector3(0.3, 3.1, -0.2);
    hatPuff2.scaling = new Vector3(1.0, 0.5, 0.8);
    hatPuff2.material = hatMat;
    hatPuff2.parent = root;

    // ==========================================================
    // MUSTARD ZIGZAG
    // ==========================================================
    const mustardBalls: Mesh[] = [];
    const mustardCount = 10;
    for (let i = 0; i < mustardCount; i++) {
      const t = i / (mustardCount - 1);
      const y = 0.6 + t * 1.0;
      const ball = MeshBuilder.CreateSphere(`mustard_${i}`, { diameter: 0.2, segments: 8 }, scene);
      ball.position = new Vector3(Math.sin(t * Math.PI * 3) * 0.2, y, -1.55 + t * 0.3);
      ball.material = mustardMat;
      ball.parent = root;
      mustardBalls.push(ball);
    }

    // ==========================================================
    // ANIMATION — with full facial rigging
    // ==========================================================
    const baseY = position[1];
    let time = 0;
    let reactionElapsed = 0;
    let prevReaction: Reaction = reactionRef.current;

    // Blink timer
    let nextBlink = 2 + Math.random() * 3;
    let blinkPhase = 0; // 0 = not blinking

    // Smooth tracking
    let trackYaw = 0;
    let trackPitch = 0;

    /** Set eye lid closure: 0 = open, 1 = fully closed */
    const setLids = (leftClose: number, rightClose: number) => {
      lidL.scaling.y = Math.max(0, Math.min(1, leftClose)) * 0.5;
      lidR.scaling.y = Math.max(0, Math.min(1, rightClose)) * 0.5;
    };

    /** Set pupil offset for both eyes (x = left/right, y = up/down) */
    const setPupilLook = (x: number, y: number) => {
      const clampX = Math.max(-0.08, Math.min(0.08, x));
      const clampY = Math.max(-0.06, Math.min(0.06, y));
      irisL.position.x = clampX;
      irisL.position.y = clampY;
      pupilL.position.x = clampX;
      pupilL.position.y = clampY;
      irisR.position.x = clampX;
      irisR.position.y = clampY;
      pupilR.position.x = clampX;
      pupilR.position.y = clampY;
    };

    /** Set pupil size multiplier (1 = normal, <1 = constricted, >1 = dilated) */
    const setPupilSize = (s: number) => {
      pupilL.scaling.x = s;
      pupilL.scaling.y = s;
      pupilR.scaling.x = s;
      pupilR.scaling.y = s;
    };

    /** Set mouth openness: 0 = closed, 1 = wide open */
    const setMouthOpen = (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      mouth.scaling.y = clamped * 0.6;
      // Lower lip drops when mouth opens
      lowerLip.position.y = -0.88 - clamped * 0.25;
    };

    /** Set cheek color blend: 0 = skin tone, 1 = deep angry red */
    const setCheekBlush = (intensity: number) => {
      const clamped = Math.max(0, Math.min(1, intensity));
      // Lerp from skin tone (0.92, 0.62, 0.35) to deep red (0.85, 0.15, 0.1)
      const r = 0.92 + (0.85 - 0.92) * clamped;
      const g = 0.62 + (0.15 - 0.62) * clamped;
      const b = 0.35 + (0.1 - 0.35) * clamped;
      cheekMat.emissiveColor = new Color3(r, g, b);
      // Increase opacity with blush
      cheekMat.alpha = 0.6 + clamped * 0.4;
    };

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

      const active = reactionDef.loop || reactionElapsed <= reactionDef.duration;

      // ---- Camera tracking ----
      if (trackCamera && scene.activeCamera) {
        const camPos = scene.activeCamera.position;
        const rootWorldPos = root.getAbsolutePosition();
        const dir = camPos.subtract(rootWorldPos);

        // Compute target yaw/pitch relative to root's base rotation
        const targetYaw = Math.atan2(dir.x, dir.z) - rotationY;
        const dist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
        const targetPitch = -Math.atan2(dir.y, dist) * 0.3;

        // Clamp tracking range
        const maxYaw = 0.4;
        const maxPitch = 0.2;
        const clampedYaw = Math.max(-maxYaw, Math.min(maxYaw, targetYaw));
        const clampedPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));

        // Smooth interpolation
        trackYaw += (clampedYaw - trackYaw) * Math.min(3.0 * dt, 1.0);
        trackPitch += (clampedPitch - trackPitch) * Math.min(3.0 * dt, 1.0);
      }

      // ---- Natural blink ----
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkPhase === 0) {
        blinkPhase = 1;
        nextBlink = 2.5 + Math.random() * 4;
      }
      if (blinkPhase > 0) {
        blinkPhase += dt * 12; // Fast blink
        if (blinkPhase >= 2) blinkPhase = 0;
      }
      const naturalBlink = blinkPhase > 0 ? (blinkPhase < 1 ? blinkPhase : 2 - blinkPhase) : 0;

      // ---- Default state (reset each frame) ----
      let lidCloseL = naturalBlink;
      let lidCloseR = naturalBlink;
      let pupilX = 0;
      let pupilY = 0;
      let pupilSize = 1.0;
      let mouthOpen = 0;
      let cheekBlush = 0;

      // ---- Per-reaction animation ----
      switch (currentReaction) {
        case "idle": {
          root.position.y = baseY + Math.sin(time * 1.8) * 0.15;
          root.rotation.y = rotationY + trackYaw + Math.sin(time * 0.6) * 0.06;
          root.rotation.x = trackPitch;
          root.rotation.z = Math.sin(time * 1.2) * 0.03;
          stacheCenter.rotation.z = Math.sin(time * 3) * 0.04;
          curlL.rotation.z = Math.sin(time * 3) * 0.05;
          curlR.rotation.z = -Math.sin(time * 3) * 0.05;
          // Gentle idle eye drift
          pupilX = Math.sin(time * 0.4) * 0.02;
          pupilY = Math.sin(time * 0.3) * 0.01;
          break;
        }
        case "flinch": {
          // EXAGGERATED: eyes blow wide open, pupils tiny, mouth gapes
          if (active) {
            root.rotation.z = -0.15;
            root.rotation.x = -0.1 + trackPitch;
            root.position.y = baseY + 0.2;
            root.rotation.y = rotationY + trackYaw;
            pupilSize = 0.5; // Constricted pupils = shock
            mouthOpen = 0.8;
            cheekBlush = 0.1;
          } else {
            const decay = 1 - Math.exp(-10 * dt);
            root.rotation.z += (0 - root.rotation.z) * decay;
            root.rotation.x += (trackPitch - root.rotation.x) * decay;
            root.position.y = baseY;
            root.rotation.y = rotationY + trackYaw;
            mouthOpen = Math.max(0, mouthOpen - dt * 3);
          }
          break;
        }
        case "laugh": {
          // EXAGGERATED: eyes squeezed shut, mouth wide, bouncing
          root.position.x = position[0] + Math.sin(time * 22) * 0.12;
          root.position.y = baseY + Math.abs(Math.sin(time * 7)) * 0.3;
          root.rotation.z = Math.sin(time * 18) * 0.06;
          root.rotation.y = rotationY + trackYaw;
          root.rotation.x = trackPitch;
          stacheCenter.rotation.z = Math.sin(time * 5) * 0.08;
          lidCloseL = 0.8; // Squinted with laughter
          lidCloseR = 0.8;
          mouthOpen = 0.6 + Math.sin(time * 12) * 0.3; // Rapid open-close
          cheekBlush = 0.3; // Rosy from laughter
          break;
        }
        case "disgust": {
          // EXAGGERATED: one eye narrow, deep cheek flush, mouth twisted
          if (active) {
            root.rotation.z = 0.12;
            root.rotation.x = -0.2 + trackPitch;
            root.rotation.y = rotationY + trackYaw;
            lidCloseL = 0.6; // Left eye narrowed in contempt
            lidCloseR = 0.15;
            mouthOpen = 0.3;
            cheekBlush = 0.85; // Deep angry red
            pupilSize = 0.7;
            pupilX = 0.04; // Eyes look to the side in disgust
          } else {
            const decay = 1 - Math.exp(-10 * dt);
            root.rotation.z += (0 - root.rotation.z) * decay;
            root.rotation.x += (trackPitch - root.rotation.x) * decay;
            root.rotation.y = rotationY + trackYaw;
          }
          root.position.y = baseY;
          break;
        }
        case "excitement": {
          // EXAGGERATED: eyes wide + huge pupils, mouth open grinning
          root.position.y = baseY + Math.abs(Math.sin(time * 6)) * 0.5;
          const pulse = 1 + Math.sin(time * 8) * 0.04;
          head.scaling.y = 1.05 * pulse;
          root.rotation.z = Math.sin(time * 10) * 0.05;
          root.rotation.y = rotationY + trackYaw;
          root.rotation.x = trackPitch;
          pupilSize = 1.5; // Dilated with excitement
          mouthOpen = 0.5 + Math.sin(time * 4) * 0.2;
          cheekBlush = 0.2; // Light excited blush
          break;
        }
        case "nervous": {
          // EXAGGERATED: darting eyes, slight mouth twitch
          root.position.x = position[0] + Math.sin(time * 14) * 0.04;
          root.position.y = baseY + Math.sin(time * 2) * 0.06;
          root.rotation.z = Math.sin(time * 3) * 0.04;
          root.rotation.y = rotationY + trackYaw;
          root.rotation.x = trackPitch;
          // Eyes dart rapidly left-right
          pupilX = Math.sin(time * 8) * 0.07;
          pupilY = Math.sin(time * 5) * 0.02;
          mouthOpen = 0.05 + Math.sin(time * 6) * 0.05; // Nervous twitch
          cheekBlush = 0.15;
          pupilSize = 0.8;
          break;
        }
        case "nod": {
          const nodPhase = (reactionElapsed / 300) * Math.PI;
          root.rotation.x = Math.abs(Math.sin(nodPhase)) * 0.25 + trackPitch;
          root.rotation.y = rotationY + trackYaw;
          root.position.y = baseY;
          // Brief eye close on each nod
          const nodClose = Math.abs(Math.sin(nodPhase)) * 0.4;
          lidCloseL = Math.max(naturalBlink, nodClose);
          lidCloseR = Math.max(naturalBlink, nodClose);
          break;
        }
        case "talk": {
          // Mouth opens and closes rhythmically, eyes engaged
          root.position.y = baseY + Math.sin(time * 2) * 0.05;
          const talkPulse = 1 + Math.sin(time * 10) * 0.015;
          head.scaling.y = 1.05 * talkPulse;
          stacheCenter.rotation.z = Math.sin(time * 7) * 0.03;
          root.rotation.y = rotationY + trackYaw;
          root.rotation.x = trackPitch;
          // Mouth syncs to "speech" rhythm
          mouthOpen = 0.15 + Math.abs(Math.sin(time * 8)) * 0.35;
          // Stache bounces with jaw
          stacheCenter.position.y = -0.35 - mouthOpen * 0.08;
          break;
        }
      }

      // ---- Apply facial rig values ----
      setLids(lidCloseL, lidCloseR);
      setPupilLook(pupilX, pupilY);
      setPupilSize(pupilSize);
      setMouthOpen(mouthOpen);
      setCheekBlush(cheekBlush);
    });

    // ==========================================================
    // CLEANUP
    // ==========================================================
    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      rootRef.current = null;
      root.dispose();

      skinMat.dispose();
      mustardMat.dispose();
      lensMat.dispose();
      frameMat.dispose();
      stacheMat.dispose();
      hatMat.dispose();
      brimMat.dispose();
      scleraMat.dispose();
      irisMat.dispose();
      pupilMat.dispose();
      lidMat.dispose();
      mouthMat.dispose();
      lipMat.dispose();
      cheekMat.dispose();
    };
  }, [scene]);

  return null;
};
