import React, { useEffect, useRef } from 'react';
import styles from './legacy-background.module.css';

import ParticleSystem from '@/legacy-three/ParticleSystem.ts';
import AtmosphereParticle from '@/legacy-three/atmosphere.ts';
import GetFlatGeometry from '@/legacy-three/utils/GetFlatGeometry.ts';
import VerticesDuplicateRemove from '@/legacy-three/utils/VerticesDuplicateRemove.ts';

// We need these loaders from the three.js library
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as Tween from '@tweenjs/tween.js'; // Your code uses this
import { BufferGeometry, Float32BufferAttribute } from 'three';

// This is the React component that will wrap your code
export default function LegacyParticleBackground() {
  const wrapperRef = useRef(null);
  const particleSystemRef = useRef(null);

  // useEffect runs after the component mounts, so the div exists.
  // The empty dependency array [] means it only runs ONCE.
  useEffect(() => {
    // Prevent re-initialization on hot-reloads
    if (particleSystemRef.current || !wrapperRef.current) {
      return;
    }

    // --- This is your logic, adapted for this component ---
    const TurnBasicNum = { firefly: 0.002 };
    const al = 1500;
    const tween2 = new Tween.Tween(TurnBasicNum).easing(
      Tween.Easing.Exponential.In
    );
    const tween1 = new Tween.Tween(TurnBasicNum).easing(
      Tween.Easing.Exponential.In
    );

    const Atomsphere1 = new AtmosphereParticle({
      longestDistance: al,
      particleSum: 500,
      renderUpdate: (Point) => {
        Point.rotation.x -= TurnBasicNum.firefly;
      },
      callback: (Point) => {
        Point.position.z = -1 * al;
      },
      onChangeModel: () => {
        tween2.stop();
        tween1.stop().to({ firefly: 0.04 }, 1500).chain(tween2);
        tween2.to({ firefly: 0.002 }, 1500);
        tween1.start();
      },
    });
    // ... (Atmosphere2 and Atmosphere3 are identical to your code)
    const Atomsphere2 = new AtmosphereParticle({
      longestDistance: al,
      particleSum: 500,
      renderUpdate: (Point) => {
        Point.rotation.y += TurnBasicNum.firefly;
      },
      callback: (Point) => {
        Point.position.y = -0.2 * al;
        Point.position.z = -1 * al;
      },
    });
    const Atomsphere3 = new AtmosphereParticle({
      longestDistance: al,
      particleSum: 500,
      renderUpdate: (Point) => {
        Point.rotation.z += TurnBasicNum.firefly / 2;
      },
      callback: (Point) => {
        Point.position.z = -1.2 * al;
      },
    });

    const scaleNum = 600;
    let Q = 0;
    const Models = [
      {
        name: 'cube',
        // path: '/src/legacy-three/models/examples/cube.fbx', // Use public paths
        path: new URL(
          '../legacy-three/models/examples/cube.fbx',
          import.meta.url
        ).href, // Use new URL() to get the correct path to the asset
        onLoadComplete(Geometry) {
          const s = 400;
          Geometry.scale(s, s, s);
        },
        loader: {
          loaderInstance: new FBXLoader(),
          load(group) {
            const g = new BufferGeometry();
            let arr = new Float32Array([]);
            for (const i of group.children) {
              arr = new Float32Array([
                ...arr,
                ...i.geometry.attributes.position.array,
              ]);
            }
            g.setAttribute(
              'position',
              new Float32BufferAttribute(VerticesDuplicateRemove(arr), 3)
            );
            return g;
          },
        },
      },
      {
        name: 'ball',
        // path: '/src/legacy-three/models/examples/ball.obj',
        path: new URL(
          '../legacy-three/models/examples/ball.obj',
          import.meta.url
        ).href, // Use new URL() to get the correct path to the asset
        // loader: { loaderInstance: new OBJLoader() }, // Add OBJLoader instance
        onLoadComplete(Geometry) {
          Geometry.scale(scaleNum, scaleNum, scaleNum);
          Geometry.translate(-600, 0, -100);
        },
        onEnterStart(PointGeometry) {
          console.log('ball enter start');
        },
        onEnterEnd(PointGeometry) {
          console.log('ball enter end');
        },
      },
      {
        name: 'wave',
        geometry: GetFlatGeometry(),
        onAnimationFrameUpdate(PerfromPoint) {
          const p = PerfromPoint.geometry.getAttribute('position');
          for (let i = 0; i < p.count; i++) {
            p.setY(
              i,
              Math.sin((i + 1 + Q) * 0.3) * 50 +
                Math.sin((i + Q) * 0.5) * 50 -
                500
            );
          }
          Q += 0.08;
          return true;
        },
      },
      {
        name: 'cone',
        // path: '/src/legacy-three/models/examples/cone.obj',
        path: new URL(
          '../legacy-three/models/examples/cone.obj',
          import.meta.url
        ).href, // Use new URL() to get the correct path to the asset
        // loader: { loaderInstance: new OBJLoader() }, // Add OBJLoader instance
        onLoadComplete(Geometry) {
          Geometry.scale(scaleNum, scaleNum, scaleNum);
          Geometry.translate(600, 100, -100);
        },
      },
    ];

    // Instantiate your class and store it in the ref
    particleSystemRef.current = new ParticleSystem({
      CanvasWrapper: wrapperRef.current, // Pass the DOM element here
      Models,
      addons: [Atomsphere1, Atomsphere2, Atomsphere3],
      onModelsFinishedLoad: () => {
        particleSystemRef.current?.ListenMouseMove();
      },
    });

    // Cleanup function: This will be called when the component unmounts
    return () => {
      // particleSystemRef.current?.destroy(); // Assuming your class has a destroy method
      particleSystemRef.current = null;
    };
  }, []); // Empty array ensures this effect runs only once

  const changeModel = (name) => {
    particleSystemRef.current?.ChangeModel(name);
  };

  return (
    <div className={styles.container}>
      {/* This div is the mount point for particle system */}
      <div className={styles.canvasWrapper} ref={wrapperRef}></div>

      {/* This is the UI to control the background */}
      <ul className={styles.controlsList}>
        <li onClick={() => changeModel('cube')}>cube</li>
        <li onClick={() => changeModel('ball')}>ball</li>
        <li onClick={() => changeModel('wave')}>wave</li>
        <li onClick={() => changeModel('cone')}>cone</li>
      </ul>
    </div>
  );
}
