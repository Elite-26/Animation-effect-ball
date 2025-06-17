import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// export const PointMesh = ({ count = 100 }) => {
//     const meshRef = useRef()
//     const positions = useMemo(() => {
//       const arr = new Float32Array(count * 3)
//       for (let i = 0; i < count * 3; i++) {
//         arr[i] = (Math.random() - 0.5) * 4
//       }
//       return arr
//     }, [count])

//     const geometry = useMemo(() => {
//       const geo = new THREE.BufferGeometry()
//       geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
//       return geo
//     }, [positions])

//     // Animate rotation
//     useFrame(() => {
//       meshRef.current.rotation.y += 0.001
//       meshRef.current.rotation.x += 0.0005
//     })

//     return (
//       <points ref={meshRef} geometry={geometry}>
//         <pointsMaterial color="#77aadd" size={0.05} />
//       </points>
//     )
//   }

export const PointMesh = ({ count, positions }) => {
  useEffect(() => {
    const radius = 1.5;
    const arr = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Distribute using spherical coordinates
      const theta = Math.acos(2 * Math.random() - 1); // polar angle
      const phi = 2 * Math.PI * Math.random(); // azimuthal angle

      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(theta);

      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }

    positions.set(arr);
    positions.needsUpdate = true;
  }, [count, positions]);

  return (
    <points>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          array={positions.array}
          count={positions.count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.025} />
    </points>
  );
};
