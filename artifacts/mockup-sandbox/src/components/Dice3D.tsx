import { useMemo, useRef, Suspense, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import * as THREE from "three";

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

function FallbackD20() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="w-[55%] max-w-[380px] aspect-square rounded-3xl"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #3a1a08 0%, #120608 55%, #060305 100%)",
          boxShadow:
            "0 0 60px rgba(255,90,30,0.45), inset 0 0 80px rgba(255,80,20,0.25)",
          animation: "fallback-bob 6s ease-in-out infinite",
        }}
      >
        <style>{`@keyframes fallback-bob {0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-12px) rotate(6deg)}}`}</style>
      </div>
    </div>
  );
}

function D20Mesh() {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.4, 0), []);

  const faces = useMemo(() => {
    const positions = geometry.attributes.position;
    const out: { center: THREE.Vector3; quat: THREE.Quaternion }[] = [];
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < positions.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(positions, i);
      const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2);
      const center = new THREE.Vector3()
        .add(a)
        .add(b)
        .add(c)
        .divideScalar(3);
      const normal = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a))
        .normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
      out.push({ center, quat });
    }
    return out;
  }, [geometry]);

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += dt * 0.32;
      groupRef.current.rotation.y += dt * 0.45;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#0b0608"
          roughness={0.55}
          metalness={0.4}
          emissive="#260a02"
          emissiveIntensity={0.35}
          flatShading
        />
      </mesh>
      {faces.map((f, i) => {
        const offset = f.center.clone().normalize().multiplyScalar(0.012);
        const pos = f.center.clone().add(offset);
        return (
          <Text
            key={i}
            position={[pos.x, pos.y, pos.z]}
            quaternion={[f.quat.x, f.quat.y, f.quat.z, f.quat.w]}
            fontSize={0.34}
            color="#ff7a2a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#ff2200"
            fontWeight={900}
          >
            {i + 1}
          </Text>
        );
      })}
    </group>
  );
}

export function Dice3D() {
  const [hasWebGL] = useState<boolean>(() =>
    typeof window === "undefined" ? true : detectWebGL(),
  );
  if (!hasWebGL) return <FallbackD20 />;
  return (
    <Canvas
      camera={{ position: [0, 0, 4.6], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0a0812"]} />
      <fog attach="fog" args={["#0a0812", 3.2, 9]} />

      <ambientLight intensity={0.22} />
      <pointLight
        position={[3.2, 2.4, 4]}
        intensity={3.2}
        color="#ff7a2a"
        distance={12}
        decay={1.6}
      />
      <pointLight
        position={[-3.2, -1.5, 3]}
        intensity={1.6}
        color="#a855f7"
        distance={12}
        decay={1.6}
      />
      <pointLight
        position={[0, 4, -2]}
        intensity={0.7}
        color="#5eead4"
      />
      <directionalLight position={[0, 0, 6]} intensity={0.25} color="#ffffff" />

      <Suspense fallback={null}>
        <Float floatIntensity={0.55} rotationIntensity={0} speed={1.1}>
          <D20Mesh />
        </Float>
      </Suspense>
    </Canvas>
  );
}

export default Dice3D;
