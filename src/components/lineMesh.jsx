import React, {useRef, useMemo} from "react"
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const LineMesh = ({ positions }) => {
    const lines = useRef()
  
    const geometry = useMemo(() => {
      const geo = new THREE.BufferGeometry()
      const vertices = []
  
      const totalPoints = Math.floor(positions.count / 3)
      
      const maxConnections = 6
      const minConnections = 4
  
      const connectionMap = new Array(totalPoints).fill(0)
      const connections = new Set()
  
      while (true) {
        let madeConnection = false
  
        for (let i = 0; i < totalPoints; i++) {
          for (let j = i + 1; j < totalPoints; j++) {
            if (
              i !== j &&
              connectionMap[i] < maxConnections &&
              connectionMap[j] < maxConnections
            ) {
              const key = `${i}-${j}`
              if (!connections.has(key)) {
                connections.add(key)
                connectionMap[i]++
                connectionMap[j]++
                madeConnection = true
  
                // Get position of point i
                const a = new THREE.Vector3(
                  positions.array[i * 3],
                  positions.array[i * 3 + 1],
                  positions.array[i * 3 + 2]
                )
  
                // Get position of point j
                const b = new THREE.Vector3(
                  positions.array[j * 3],
                  positions.array[j * 3 + 1],
                  positions.array[j * 3 + 2]
                )
  
                // Add the line segment [a -> b]
                vertices.push(a.x, a.y, a.z, b.x, b.y, b.z)
              }
            }
          }
        }
  
        if (connectionMap.every(c => c >= minConnections)) break
      }
  
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      return geo
    }, [positions])
  
    useFrame(() => {
      if (lines.current) {
        lines.current.rotation.y += 0.001
        lines.current.rotation.x += 0.0005
      }
    })
  
    return (
      <lineSegments ref={lines} geometry={geometry}>
        <lineBasicMaterial color="#88bbff" transparent opacity={0.4} />
      </lineSegments>
    )
  }
  