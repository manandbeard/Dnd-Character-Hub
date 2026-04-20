import { useEffect, useMemo, useRef, Suspense, useState } from "react";
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

type Phase = "idle" | "rolling" | "settled";

const ROLL_DURATION = 1.6;
const SETTLE_HOLD = 2.2;

function D20Mesh({
  rollSignal,
  onResult,
}: {
  rollSignal: number;
  onResult: (n: number) => void;
}) {
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

  const phaseRef = useRef<Phase>("idle");
  const rollStartRef = useRef(0);
  const settleEndRef = useRef(0);
  const startQuatRef = useRef(new THREE.Quaternion());
  const targetQuatRef = useRef(new THREE.Quaternion());
  const spinAxisRef = useRef(new THREE.Vector3(1, 1, 0).normalize());
  const pendingFaceRef = useRef(1);
  const lastSignalRef = useRef(rollSignal);

  useFrame((state, dt) => {
    const g = groupRef.current;
    if (!g) return;

    if (rollSignal !== lastSignalRef.current) {
      lastSignalRef.current = rollSignal;
      const faceIdx = Math.floor(Math.random() * faces.length);
      pendingFaceRef.current = faceIdx + 1;
      // To make face normal point toward +Z (camera), set group rotation
      // such that R * n = +Z. Since q_face takes (0,0,1) -> n, R = q_face^-1
      // produces a valid landing orientation.
      targetQuatRef.current.copy(faces[faceIdx].quat).invert();
      startQuatRef.current.copy(g.quaternion);
      spinAxisRef.current
        .set(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() * 0.4 - 0.2,
        )
        .normalize();
      rollStartRef.current = state.clock.elapsedTime;
      phaseRef.current = "rolling";
    }

    const phase = phaseRef.current;

    if (phase === "idle") {
      g.rotation.x += dt * 0.32;
      g.rotation.y += dt * 0.45;
      return;
    }

    if (phase === "rolling") {
      const t = Math.min(
        1,
        (state.clock.elapsedTime - rollStartRef.current) / ROLL_DURATION,
      );
      if (t >= 1) {
        g.quaternion.copy(targetQuatRef.current);
        phaseRef.current = "settled";
        settleEndRef.current = state.clock.elapsedTime + SETTLE_HOLD;
        onResult(pendingFaceRef.current);
        return;
      }
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const totalAngle = Math.PI * 6;
      const spinQ = new THREE.Quaternion().setFromAxisAngle(
        spinAxisRef.current,
        totalAngle * eased,
      );
      const spunStart = startQuatRef.current.clone().multiply(spinQ);
      g.quaternion.copy(spunStart).slerp(targetQuatRef.current, eased);
      return;
    }

    // settled — hold position, then return to idle
    if (state.clock.elapsedTime >= settleEndRef.current) {
      // Sync Euler from current quaternion so idle increments continue smoothly
      g.rotation.setFromQuaternion(g.quaternion);
      phaseRef.current = "idle";
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
  const [rollSignal, setRollSignal] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [rolled, setRolled] = useState<number | null>(null);
  const labelTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (labelTimerRef.current !== null) {
        window.clearTimeout(labelTimerRef.current);
      }
    },
    [],
  );

  if (!hasWebGL) return <FallbackD20 />;

  const triggerRoll = () => {
    if (rolling) return;
    setRolling(true);
    setRolled(null);
    setRollSignal((s) => s + 1);
  };

  const handleResult = (n: number) => {
    setRolled(n);
    if (labelTimerRef.current !== null) {
      window.clearTimeout(labelTimerRef.current);
    }
    labelTimerRef.current = window.setTimeout(() => {
      setRolled(null);
      setRolling(false);
      labelTimerRef.current = null;
    }, SETTLE_HOLD * 1000);
  };

  return (
    <div
      className="absolute inset-0 cursor-pointer select-none touch-manipulation"
      role="button"
      tabIndex={0}
      aria-label="Roll the d20"
      data-testid="button-roll-dice"
      onClick={triggerRoll}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerRoll();
        }
      }}
    >
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
        <pointLight position={[0, 4, -2]} intensity={0.7} color="#5eead4" />
        <directionalLight
          position={[0, 0, 6]}
          intensity={0.25}
          color="#ffffff"
        />

        <Suspense fallback={null}>
          <Float floatIntensity={0.55} rotationIntensity={0} speed={1.1}>
            <D20Mesh rollSignal={rollSignal} onResult={handleResult} />
          </Float>
        </Suspense>
      </Canvas>

      {rolled !== null && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-8 z-30 px-5 py-2 rounded-full bg-black/65 backdrop-blur-md border border-orange-400/50 text-orange-100 font-extrabold text-base md:text-lg tracking-wide shadow-[0_0_30px_rgba(255,120,40,0.45)] dice-roll-popup"
          data-testid="text-roll-result"
        >
          You rolled a {rolled}!
        </div>
      )}

      <style>{`
        @keyframes dice-roll-popup-in {
          0%   { opacity: 0; transform: translate(-50%, -8px) scale(0.85); }
          60%  { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .dice-roll-popup { animation: dice-roll-popup-in 320ms ease-out both; }
      `}</style>
    </div>
  );
}

export default Dice3D;
