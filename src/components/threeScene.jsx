import React, { useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function createCircleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Clear background transparent
  ctx.clearRect(0, 0, size, size);

  // Draw white filled circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.fill();

  // Draw blue stroke
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgb(109, 136, 156)";
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

const NUM_DOTS = 70;
const SPHERE_RADIUS = 20;
const MIN_CONNECTIONS = 4;
const MAX_CONNECTIONS = 6;

function fibonacciSpherePoints(samples, radius) {
  const points = [];
  const offset = 2 / samples;
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const y = i * offset - 1 + offset / 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * increment;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return points;
}

function findNeighbors(points, idx, minCount, maxCount) {
  const distances = points.map((p, i) => {
    if (i === idx) return { i, dist: Infinity };
    return { i, dist: points[idx].distanceTo(p) };
  });
  distances.sort((a, b) => a.dist - b.dist);
  const count =
    Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  return distances.slice(0, count).map((d) => d.i);
}

function generateInitialDots(count, radius) {
  const points = [];
  for (let i = 0; i < count; i++) {
    // Random point on sphere (or around sphere)
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius; // or radius ± variance if you want

    let x = r * Math.sin(phi) * Math.cos(theta);
    let y = r * Math.sin(phi) * Math.sin(theta);
    let z = r * Math.cos(phi);

    // For ~20% of dots, add random high Y offset
    if (Math.random() < 0.2) {
      y += 5 + Math.random() * 10; // random between 5 and 15
    }

    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function DotsAndLines() {
  const dots = useMemo(
    () => fibonacciSpherePoints(NUM_DOTS, SPHERE_RADIUS),
    []
  );
  const originalPositions = useMemo(() => dots.map((p) => p.clone()), [dots]);
  const dotRefs = useRef([]);
  const lineRefs = useRef([]);
  const connections = useMemo(() => {
    const result = [];
    dots.forEach((dot, idx) => {
      const neighbors = findNeighbors(
        dots,
        idx,
        MIN_CONNECTIONS,
        MAX_CONNECTIONS
      );
      neighbors.forEach((nIdx) => {
        if (nIdx > idx) result.push([idx, nIdx]);
      });
    });
    return result;
  }, [dots]);

  const lineGeometries = useMemo(
    () => connections.map(() => new THREE.BufferGeometry()),
    [connections]
  );

  useEffect(() => {
    dotRefs.current = dotRefs.current.slice(0, NUM_DOTS);
    lineRefs.current = lineRefs.current.slice(0, connections.length);
  }, [connections]);

  const circleTexture = useMemo(() => createCircleTexture(), []);

  useFrame(({ clock, camera }) => {
    const time = clock.getElapsedTime();

    // Update dot positions (your existing animation)
    dotRefs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const basePos = originalPositions[i];
      sprite.position.x = basePos.x + 0.5 * Math.sin(time * 1.5 + i);
      sprite.position.y = basePos.y + 0.5 * Math.cos(time * 1.2 + i * 1.1);
      sprite.position.z = basePos.z + 0.5 * Math.sin(time * 1.7 + i * 0.9);
    });

    // Calculate opacities for dots based on depth (z in camera space)
    dotRefs.current.forEach((sprite, i) => {
      if (!sprite) return;

      // Convert world position to camera space
      const posCamSpace = sprite.position
        .clone()
        .applyMatrix4(camera.matrixWorldInverse);

      // posCamSpace.z is negative in front of camera, positive behind
      // We map z from [-maxDepth, 0] → [1, 0], clamp
      // Assume maxDepth (furthest visible distance) as about SPHERE_RADIUS * 2
      const maxDepth = SPHERE_RADIUS * 2;
      const z = THREE.MathUtils.clamp(-posCamSpace.z, 0, maxDepth);
      const opacity = 1 - z / maxDepth / 4;

      sprite.material.opacity = opacity;
      sprite.material.transparent = true;
    });

    // Update lines positions and opacity
    lineRefs.current.forEach((line, idx) => {
      if (!line) return;

      const [idx1, idx2] = connections[idx];
      const p1 = dotRefs.current[idx1].position;
      const p2 = dotRefs.current[idx2].position;

      // Update geometry positions
      const dotRadius = 0.2; // adjust to your dot size radius

      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();
      const offset = dotRadius; // how far to shorten from each end
      dir.normalize();

      // Shortened start and end points:
      const start = p1.clone().add(dir.clone().multiplyScalar(offset));
      const end = p2.clone().add(dir.clone().multiplyScalar(-offset));

      const posArray = line.geometry.attributes.position.array;
      posArray[0] = start.x;
      posArray[1] = start.y;
      posArray[2] = start.z;
      posArray[3] = end.x;
      posArray[4] = end.y;
      posArray[5] = end.z;

      line.geometry.attributes.position.needsUpdate = true;

      // Compute average camera space z
      const posCam1 = p1.clone().applyMatrix4(camera.matrixWorldInverse);
      const posCam2 = p2.clone().applyMatrix4(camera.matrixWorldInverse);
      const avgZ = (posCam1.z + posCam2.z) / 2;

      // Map opacity same way as dots
      const maxDepth = SPHERE_RADIUS * 4; // bigger range, slower fade
      const z = THREE.MathUtils.clamp(-avgZ, 0, maxDepth);
      const opacity = THREE.MathUtils.clamp(1 - (z / maxDepth) * 1, 0, 0.8);
      // fades from 1 down to 0.2 (not fully invisible)

      line.material.opacity = opacity * 0.6; // Keep lines a bit more transparent overall
      line.material.transparent = true;
    });
  });

  return (
    <>
      {/* Dots as sprites with circle texture */}
      {dots.map((pos, i) => (
        <sprite
          key={i}
          ref={(el) => (dotRefs.current[i] = el)}
          position={pos}
          scale={[0.4, 0.4, 1]}
        >
          <spriteMaterial attach="material" map={circleTexture} />
        </sprite>
      ))}

      {/* Lines */}
      {connections.map(([idx1, idx2], i) => {
        const geometry = lineGeometries[i];
        if (geometry.attributes.position === undefined) {
          const positions = new Float32Array(6);
          geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
          );
          geometry.setDrawRange(0, 2);
        }
        return (
          <line
            key={i}
            ref={(el) => (lineRefs.current[i] = el)}
            geometry={geometry}
          >
            <lineBasicMaterial
              color="rgb(59, 92, 117)"
              transparent
              opacity={1}
            />
          </line>
        );
      })}
    </>
  );
}

export default function AnimatedSphere() {
  return (
    <Canvas
      style={{ height: "600px" }}
      camera={{ position: [0, 0, 50], fov: 60 }}
    >
      <ambientLight intensity={10} />
      <DotsAndLines />
    </Canvas>
  );
}
