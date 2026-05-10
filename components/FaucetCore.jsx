"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function CoreShape() {
  const group = useRef();
  const halo = useRef();
  const shell = useRef();
  const [hovered, setHovered] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;

    const speed = pulsing ? 1.15 : 0.3;
    group.current.rotation.y += delta * speed;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      hovered ? -0.12 : 0.1,
      0.04,
    );
    group.current.position.y = Math.sin(clock.elapsedTime * 1.8) * 0.08;

    if (halo.current) {
      halo.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3.2) * 0.04 + (hovered ? 0.08 : 0));
    }

    if (shell.current) {
      shell.current.material.emissiveIntensity = hovered ? 1.1 : 0.72;
    }
  });

  return (
    <group
      ref={group}
      onClick={() => setPulsing((value) => !value)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          color="#07110a"
          metalness={0.95}
          roughness={0.18}
          emissive="#0f6b32"
          emissiveIntensity={0.7}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} ref={halo}>
        <torusGeometry args={[1.5, 0.08, 16, 120]} />
        <meshStandardMaterial
          color="#aaffaa"
          emissive="#36ff72"
          emissiveIntensity={1.1}
          metalness={0.86}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.42, 0.62, 2.35, 6, 1, false]} />
        <meshStandardMaterial
          color="#0f1711"
          metalness={0.72}
          roughness={0.34}
          emissive="#123c20"
          emissiveIntensity={0.44}
        />
      </mesh>

      <mesh position={[0, 0, 0.92]}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial
          color="#dcffd9"
          emissive="#b6ff9f"
          emissiveIntensity={2}
          roughness={0.1}
          metalness={0.25}
        />
      </mesh>

      <mesh position={[0, -1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.1, 12, 80]} />
        <meshStandardMaterial color="#103519" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function FaucetCore() {
  return (
    <div className="core-frame">
      <Canvas camera={{ position: [0, 1.2, 4.4], fov: 42 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#020402"]} />
        <fog attach="fog" args={["#020402", 5, 12]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 4, 5]} intensity={2.3} color="#89ff95" />
        <directionalLight position={[-4, -2, 1]} intensity={0.75} color="#13572b" />
        <pointLight position={[0, 2, 2]} intensity={1.5} color="#30ff6b" />
        <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.55}>
          <CoreShape />
        </Float>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3.2}
          maxPolarAngle={Math.PI / 1.75}
          autoRotate
          autoRotateSpeed={0.6}
        />
      </Canvas>
      <div className="core-caption">Drag to inspect. Click the core to pulse it.</div>
    </div>
  );
}
