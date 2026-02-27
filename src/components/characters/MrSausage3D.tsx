import {
  Color3,
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

export const MrSausage3D = ({
  reaction = "idle",
  position = [0, 0, 0],
  scale = 1,
}: MrSausage3DProps) => {
  const scene = useScene();
  const reactionRef = useRef<Reaction>(reaction);
  const reactionStartRef = useRef(0);

  useEffect(() => {
    reactionRef.current = reaction;
    reactionStartRef.current = 0;
  }, [reaction]);

  useEffect(() => {
    if (!scene) return;

    // -----------------------------------------------------------
    // Materials
    // -----------------------------------------------------------
    const bodyColor = new Color3(0.85, 0.55, 0.35);

    const bodyMat = new StandardMaterial("mrBodyMat", scene);
    bodyMat.diffuseColor = bodyColor;

    const mustardMat = new StandardMaterial("mustardMat", scene);
    mustardMat.diffuseColor = new Color3(1, 0.85, 0);
    mustardMat.emissiveColor = new Color3(0.3, 0.25, 0);

    const glassMat = new StandardMaterial("mrGlassMat", scene);
    glassMat.diffuseColor = new Color3(0.05, 0.05, 0.08);
    glassMat.specularColor = new Color3(0.4, 0.4, 0.5);

    const stacheMat = new StandardMaterial("mrStacheMat", scene);
    stacheMat.diffuseColor = new Color3(0.3, 0.15, 0.05);

    const hatMat = new StandardMaterial("mrHatMat", scene);
    hatMat.diffuseColor = new Color3(0.95, 0.95, 0.95);

    // -----------------------------------------------------------
    // Root node
    // -----------------------------------------------------------
    const root = new TransformNode("mrSausage", scene);
    root.position = new Vector3(position[0], position[1], position[2]);
    root.scaling = new Vector3(scale, scale, scale);

    // -----------------------------------------------------------
    // BODY — bottom-heavy egg
    // -----------------------------------------------------------
    const body = MeshBuilder.CreateSphere(
      "mrBody",
      { diameter: 2.5, segments: 16 },
      scene,
    );
    body.scaling = new Vector3(1, 1.4, 1);
    body.material = bodyMat;
    body.parent = root;

    // Mustard stripe
    const mustardStripe = MeshBuilder.CreateCylinder(
      "mustardStripe",
      { height: 3.2, diameter: 0.15 },
      scene,
    );
    mustardStripe.material = mustardMat;
    mustardStripe.parent = root;

    // Legs
    const legL = MeshBuilder.CreateCapsule(
      "legL",
      { height: 1, radius: 0.3 },
      scene,
    );
    legL.position = new Vector3(-0.4, -2, 0);
    legL.material = bodyMat;
    legL.parent = root;

    const legR = MeshBuilder.CreateCapsule(
      "legR",
      { height: 1, radius: 0.3 },
      scene,
    );
    legR.position = new Vector3(0.4, -2, 0);
    legR.material = bodyMat;
    legR.parent = root;

    // -----------------------------------------------------------
    // HEAD
    // -----------------------------------------------------------
    const headNode = new TransformNode("mrHead", scene);
    headNode.position = new Vector3(0, 2.2, 0);
    headNode.parent = root;

    const head = MeshBuilder.CreateSphere(
      "head",
      { diameter: 1.8, segments: 16 },
      scene,
    );
    head.material = bodyMat;
    head.parent = headNode;

    // Sunglasses
    const glassL = MeshBuilder.CreateSphere(
      "glassL",
      { diameter: 0.55 },
      scene,
    );
    glassL.position = new Vector3(-0.35, 0.1, -0.8);
    glassL.material = glassMat;
    glassL.parent = headNode;

    const glassR = MeshBuilder.CreateSphere(
      "glassR",
      { diameter: 0.55 },
      scene,
    );
    glassR.position = new Vector3(0.35, 0.1, -0.8);
    glassR.material = glassMat;
    glassR.parent = headNode;

    const bridge = MeshBuilder.CreateBox(
      "bridge",
      { width: 0.35, height: 0.08, depth: 0.08 },
      scene,
    );
    bridge.position = new Vector3(0, 0.1, -0.8);
    bridge.material = glassMat;
    bridge.parent = headNode;

    const glassArmL = MeshBuilder.CreateBox(
      "glassArmL",
      { width: 0.05, height: 0.7, depth: 0.05 },
      scene,
    );
    glassArmL.position = new Vector3(-0.6, 0.1, -0.4);
    glassArmL.rotation.z = -0.15;
    glassArmL.material = glassMat;
    glassArmL.parent = headNode;

    const glassArmR = MeshBuilder.CreateBox(
      "glassArmR",
      { width: 0.05, height: 0.7, depth: 0.05 },
      scene,
    );
    glassArmR.position = new Vector3(0.6, 0.1, -0.4);
    glassArmR.rotation.z = 0.15;
    glassArmR.material = glassMat;
    glassArmR.parent = headNode;

    // Mustache
    const stache = MeshBuilder.CreateBox(
      "stache",
      { width: 1.4, height: 0.3, depth: 0.2 },
      scene,
    );
    stache.position = new Vector3(0, -0.25, -0.85);
    stache.material = stacheMat;
    stache.parent = headNode;

    const curlL = MeshBuilder.CreateSphere(
      "curlL",
      { diameter: 0.35 },
      scene,
    );
    curlL.position = new Vector3(-0.75, -0.3, -0.85);
    curlL.material = stacheMat;
    curlL.parent = headNode;

    const curlR = MeshBuilder.CreateSphere(
      "curlR",
      { diameter: 0.35 },
      scene,
    );
    curlR.position = new Vector3(0.75, -0.3, -0.85);
    curlR.material = stacheMat;
    curlR.parent = headNode;

    // Chin
    const chin = MeshBuilder.CreateSphere(
      "chin",
      { diameter: 0.6 },
      scene,
    );
    chin.position = new Vector3(0, -0.7, -0.6);
    chin.material = bodyMat;
    chin.parent = headNode;

    const chinBallL = MeshBuilder.CreateSphere(
      "chinBallL",
      { diameter: 0.28 },
      scene,
    );
    chinBallL.position = new Vector3(-0.18, -0.95, -0.55);
    chinBallL.material = bodyMat;
    chinBallL.parent = headNode;

    const chinBallR = MeshBuilder.CreateSphere(
      "chinBallR",
      { diameter: 0.28 },
      scene,
    );
    chinBallR.position = new Vector3(0.18, -0.95, -0.55);
    chinBallR.material = bodyMat;
    chinBallR.parent = headNode;

    // Chef hat
    const hatBrim = MeshBuilder.CreateCylinder(
      "hatBrim",
      { height: 0.15, diameter: 2.0, tessellation: 24 },
      scene,
    );
    hatBrim.position = new Vector3(0, 1.1, 0);
    hatBrim.material = hatMat;
    hatBrim.parent = headNode;

    const hatBody = MeshBuilder.CreateCylinder(
      "hatBody",
      { height: 1.0, diameterTop: 1.2, diameterBottom: 1.4 },
      scene,
    );
    hatBody.position = new Vector3(0, 1.7, 0);
    hatBody.material = hatMat;
    hatBody.parent = headNode;

    const hatPuff = MeshBuilder.CreateSphere(
      "hatPuff",
      { diameter: 1.4 },
      scene,
    );
    hatPuff.position = new Vector3(0, 2.2, 0);
    hatPuff.material = hatMat;
    hatPuff.parent = headNode;

    // -----------------------------------------------------------
    // ARMS
    // -----------------------------------------------------------
    const armL = MeshBuilder.CreateCapsule(
      "armL",
      { height: 1.2, radius: 0.2 },
      scene,
    );
    armL.position = new Vector3(-1.5, 0.5, 0);
    armL.rotation.z = 0.4;
    armL.material = bodyMat;
    armL.parent = root;

    const handL = MeshBuilder.CreateSphere(
      "handL",
      { diameter: 0.4 },
      scene,
    );
    handL.position = new Vector3(-1.8, -0.1, 0);
    handL.material = bodyMat;
    handL.parent = root;

    const armR = MeshBuilder.CreateCapsule(
      "armR",
      { height: 1.2, radius: 0.2 },
      scene,
    );
    armR.position = new Vector3(1.5, 0.5, 0);
    armR.rotation.z = -0.4;
    armR.material = bodyMat;
    armR.parent = root;

    const handR = MeshBuilder.CreateSphere(
      "handR",
      { diameter: 0.4 },
      scene,
    );
    handR.position = new Vector3(1.8, -0.1, 0);
    handR.material = bodyMat;
    handR.parent = root;

    // -----------------------------------------------------------
    // Animation state
    // -----------------------------------------------------------
    const baseY = position[1];
    let time = 0;
    let reactionElapsed = 0;
    let prevReaction: Reaction = reactionRef.current;

    // Lerp targets — start at idle defaults
    let targetBodyY = 0;
    let targetBodyRotZ = 0;
    let targetHeadRotX = 0;
    let targetArmLRotZ = 0.4;
    let targetArmRRotZ = -0.4;
    let shakeIntensity = 0;

    // Current animated values
    let curBodyRotZ = 0;
    let curHeadRotX = 0;
    let curArmLRotZ = 0.4;
    let curArmRRotZ = -0.4;

    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      time += dt;

      const currentReaction = reactionRef.current;
      const reactionDef = REACTIONS[currentReaction];

      // Detect reaction change
      if (currentReaction !== prevReaction) {
        prevReaction = currentReaction;
        reactionElapsed = 0;

        // Set targets from the new reaction
        targetBodyY = reactionDef.bodyY ?? 0;
        targetBodyRotZ = reactionDef.bodyRotZ ?? 0;
        targetHeadRotX = reactionDef.headRotX ?? 0;
        targetArmLRotZ = reactionDef.armLRotZ ?? 0.4;
        targetArmRRotZ = reactionDef.armRRotZ ?? -0.4;
        shakeIntensity = reactionDef.shakeIntensity ?? 0;
      }

      reactionElapsed += dt * 1000;

      // For non-looping reactions, revert to idle after duration
      if (!reactionDef.loop && reactionElapsed > reactionDef.duration) {
        targetBodyY = 0;
        targetBodyRotZ = 0;
        targetHeadRotX = 0;
        targetArmLRotZ = 0.4;
        targetArmRRotZ = -0.4;
        shakeIntensity = 0;
      }

      // Lerp factor
      const lerpFactor = Math.min(1, 10 * dt);

      // Lerp current values toward targets
      curBodyRotZ += (targetBodyRotZ - curBodyRotZ) * lerpFactor;
      curHeadRotX += (targetHeadRotX - curHeadRotX) * lerpFactor;
      curArmLRotZ += (targetArmLRotZ - curArmLRotZ) * lerpFactor;
      curArmRRotZ += (targetArmRRotZ - curArmRRotZ) * lerpFactor;

      // -----------------------------------------------------------
      // Apply reaction-specific animations
      // -----------------------------------------------------------
      switch (currentReaction) {
        case "idle": {
          // Gentle body bob
          root.position.y = baseY + Math.sin(time * 2) * 0.15;
          // Mustache wiggle
          stache.rotation.z = Math.sin(time * 4) * 0.05;
          // Gentle body rotation oscillation
          root.rotation.y = Math.sin(time) * 0.05;
          root.rotation.z = curBodyRotZ;
          break;
        }

        case "flinch": {
          root.rotation.z = curBodyRotZ;
          armL.rotation.z = curArmLRotZ;
          armR.rotation.z = curArmRRotZ;
          root.position.y = baseY;
          break;
        }

        case "laugh": {
          // Body shakes on x
          root.position.x =
            position[0] + Math.sin(time * 25) * shakeIntensity;
          // Small hops
          root.position.y =
            baseY + targetBodyY * Math.abs(Math.sin(time * 8));
          root.rotation.z = 0;
          stache.rotation.z = Math.sin(time * 6) * 0.08;
          break;
        }

        case "disgust": {
          root.rotation.z = curBodyRotZ;
          headNode.rotation.x = curHeadRotX;
          // Arms droop
          armL.rotation.z = curArmLRotZ;
          armR.rotation.z = curArmRRotZ;
          root.position.y = baseY;
          break;
        }

        case "excitement": {
          // Big hop
          root.position.y = baseY + targetBodyY * Math.abs(Math.sin(time * 6));
          // Arms up
          armL.rotation.z = curArmLRotZ;
          armR.rotation.z = curArmRRotZ;
          // Slight body pulse
          const pulse = 1 + Math.sin(time * 8) * 0.03;
          body.scaling.y = 1.4 * pulse;
          root.rotation.z = 0;
          break;
        }

        case "nervous": {
          // Small sway
          root.rotation.z = Math.sin(time * 3) * 0.05;
          // Slight position jitter
          root.position.x =
            position[0] + Math.sin(time * 15) * shakeIntensity;
          root.position.y = baseY + Math.sin(time * 2) * 0.05;
          break;
        }

        case "nod": {
          // Head bobs forward twice in duration
          const nodPhase = (reactionElapsed / 300) * Math.PI;
          headNode.rotation.x = Math.abs(Math.sin(nodPhase)) * 0.3;
          root.position.y = baseY;
          root.rotation.z = 0;
          break;
        }

        case "talk": {
          // Slight body pulse synced to talk
          body.scaling.y = 1.4 + Math.sin(time * 10) * 0.02;
          root.position.y = baseY + Math.sin(time * 2) * 0.05;
          root.rotation.z = 0;
          // Subtle mustache movement
          stache.rotation.z = Math.sin(time * 8) * 0.03;
          break;
        }
      }

      // Apply head rotation for non-head-specific reactions
      if (currentReaction !== "nod") {
        headNode.rotation.x = curHeadRotX;
      }

      // Apply arm rotations for reactions that don't override
      if (
        currentReaction === "idle" ||
        currentReaction === "laugh" ||
        currentReaction === "nervous" ||
        currentReaction === "nod" ||
        currentReaction === "talk"
      ) {
        armL.rotation.z = curArmLRotZ;
        armR.rotation.z = curArmRRotZ;
      }
    });

    // -----------------------------------------------------------
    // Cleanup — dispose everything
    // -----------------------------------------------------------
    return () => {
      scene.onBeforeRenderObservable.remove(observer);

      // Meshes
      body.dispose();
      mustardStripe.dispose();
      legL.dispose();
      legR.dispose();
      head.dispose();
      glassL.dispose();
      glassR.dispose();
      bridge.dispose();
      glassArmL.dispose();
      glassArmR.dispose();
      stache.dispose();
      curlL.dispose();
      curlR.dispose();
      chin.dispose();
      chinBallL.dispose();
      chinBallR.dispose();
      hatBrim.dispose();
      hatBody.dispose();
      hatPuff.dispose();
      armL.dispose();
      handL.dispose();
      armR.dispose();
      handR.dispose();

      // TransformNodes
      headNode.dispose();
      root.dispose();

      // Materials
      bodyMat.dispose();
      mustardMat.dispose();
      glassMat.dispose();
      stacheMat.dispose();
      hatMat.dispose();
    };
  }, [scene]);

  return null;
};
