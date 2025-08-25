import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useControls } from 'leva';

// This component holds the core logic
function MorphingParticles() {
  const pointsRef = useRef();
  const count = 5000; // Number of particles

  // 1. Create different geometries for our shapes
  const shapes = useMemo(() => {
    const temp = [];
    const sphereGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const boxGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5, 16, 16, 16);
    const torusGeo = new THREE.TorusKnotGeometry(1, 0.3, 128, 16);

    // Sample points from the surface of each geometry
    for (let i = 0; i < count; i++) {
      const s = THREE.MathUtils.randFloat(
        0,
        sphereGeo.attributes.position.count - 1
      );
      const b = THREE.MathUtils.randFloat(
        0,
        boxGeo.attributes.position.count - 1
      );
      const t = THREE.MathUtils.randFloat(
        0,
        torusGeo.attributes.position.count - 1
      );

      temp.push(
        new THREE.Vector3().fromBufferAttribute(
          sphereGeo.attributes.position,
          s
        )
      );
      temp.push(
        new THREE.Vector3().fromBufferAttribute(boxGeo.attributes.position, b)
      );
      temp.push(
        new THREE.Vector3().fromBufferAttribute(torusGeo.attributes.position, t)
      );
    }
    return temp;
  }, []);

  // 2. Create the initial buffer of points
  const particles = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      p[i3] = (Math.random() - 0.5) * 5;
      p[i3 + 1] = (Math.random() - 0.5) * 5;
      p[i3 + 2] = (Math.random() - 0.5) * 5;
    }
    return p;
  }, []);

  // 3. Set up Leva controls to switch shapes
  const { shape } = useControls({
    shape: {
      value: 'sphere',
      options: ['sphere', 'box', 'torus knot'],
    },
  });

  // 4. This is our animation loop
  useFrame((state, delta) => {
    const { clock, mouse } = state;
    const positions = pointsRef.current.geometry.attributes.position.array;
    const shapeIndex = shape === 'sphere' ? 0 : shape === 'box' ? 1 : 2;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const target = shapes[i * 3 + shapeIndex];

      // Animate particles towards their target shape position
      positions[i3] += (target.x - positions[i3]) * delta * 0.5;
      positions[i3 + 1] += (target.y - positions[i3 + 1]) * delta * 0.5;
      positions[i3 + 2] += (target.z - positions[i3 + 2]) * delta * 0.5;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Rotate the whole system slowly and react to mouse
    pointsRef.current.rotation.y += delta * 0.1 + mouse.x * 0.1 * delta;
    pointsRef.current.rotation.x += delta * 0.1 + mouse.y * 0.1 * delta;
  });

  return (
    <Points
      ref={pointsRef}
      positions={particles}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        color="#bb9af7"
        size={0.015}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

export default function ParticleSystemBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    >
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <MorphingParticles />
      </Canvas>
    </div>
  );
}
