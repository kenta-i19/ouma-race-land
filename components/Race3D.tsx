"use client";

// WebGL(Three.js / react-three-fiber)で レースを 3DCG ひょうじ する。
// レースの しんこう(0..DISTANCE)は そのまま つかい、だ円(スタジアム)コースの
// うえに 3Dの うまを ならべて、ライティング・かげ・ほうそうカメラで えがく。

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Racer, DISTANCE } from "@/lib/race";

// ── スタジアムがた コースの 1てん（t:0..1）を (x,z) で かえす ──
function stadiumAt(t: number, halfW: number, halfD: number): { x: number; z: number } {
  const r = halfD;
  const sx = Math.max(0.001, halfW - r);
  const straight = sx;
  const turn = Math.PI * r;
  const total = 4 * straight + 2 * turn;
  let d = (((t % 1) + 1) % 1) * total;

  if (d <= straight) return { x: d, z: halfD };
  d -= straight;
  if (d <= turn) {
    const a = Math.PI / 2 - (d / turn) * Math.PI;
    return { x: sx + r * Math.cos(a), z: r * Math.sin(a) };
  }
  d -= turn;
  if (d <= 2 * straight) return { x: sx - 2 * sx * (d / (2 * straight)), z: -halfD };
  d -= 2 * straight;
  if (d <= turn) {
    const a = -Math.PI / 2 - (d / turn) * Math.PI;
    return { x: -sx + r * Math.cos(a), z: r * Math.sin(a) };
  }
  d -= turn;
  return { x: -sx + sx * Math.min(1, d / straight), z: halfD };
}

function laneHalves(lane: number, lanes: number) {
  const f = (lane + 0.5) / lanes;
  return { halfW: 14.6 - f * 4.6, halfD: 8.1 - f * 4.6 };
}

function shade(hex: string, amt: number): string {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  let r = parseInt(c.slice(0, 2), 16);
  let g = parseInt(c.slice(2, 4), 16);
  let b = parseInt(c.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hex;
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round(r + (target - r) * p);
  g = Math.round(g + (target - g) * p);
  b = Math.round(b + (target - b) * p);
  return `rgb(${r},${g},${b})`;
}

// スタジアムの ぬりつぶし Shape（あなあきで リングにも）
function stadiumShape(halfW: number, halfD: number, hole?: { w: number; d: number }): THREE.Shape {
  const shape = new THREE.Shape();
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const { x, z } = stadiumAt(i / N, halfW, halfD);
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  if (hole) {
    const path = new THREE.Path();
    for (let i = 0; i <= N; i++) {
      const { x, z } = stadiumAt(i / N, hole.w, hole.d);
      if (i === 0) path.moveTo(x, z);
      else path.lineTo(x, z);
    }
    shape.holes.push(path);
  }
  return shape;
}

// ── 3Dの うま（プリミティブで くみたて、ギャロップアニメつき）──
function Horse3D({
  index,
  count,
  racer,
  posRef,
  racing,
}: {
  index: number;
  count: number;
  racer: Racer;
  posRef: React.MutableRefObject<number[]>;
  racing: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const body = shade(racer.color, 0.06);
  const dark = shade(racer.color, -0.4);

  const init = useMemo(() => {
    const { halfW, halfD } = laneHalves(index, count);
    return stadiumAt(0, halfW, halfD);
  }, [index, count]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const prog = (posRef.current[index] ?? 0) / DISTANCE;
    const { halfW, halfD } = laneHalves(index, count);
    const cur = stadiumAt(prog, halfW, halfD);
    const ahead = stadiumAt(prog + 0.004, halfW, halfD);
    const dx = ahead.x - cur.x;
    const dz = ahead.z - cur.z;

    g.position.x = THREE.MathUtils.damp(g.position.x, cur.x, 9, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, cur.z, 9, delta);
    const heading = Math.atan2(-dz, dx);
    g.rotation.y = heading;

    const t = state.clock.elapsedTime;
    if (racing && prog < 1) {
      const sp = t * 13;
      legs.forEach((l, k) => {
        if (l.current) l.current.rotation.x = Math.sin(sp + k * (Math.PI / 2)) * 0.7;
      });
      g.position.y = 0.02 + Math.abs(Math.sin(sp)) * 0.12;
    } else {
      legs.forEach((l) => {
        if (l.current) l.current.rotation.x = THREE.MathUtils.damp(l.current.rotation.x, 0, 8, delta);
      });
      g.position.y = THREE.MathUtils.damp(g.position.y, 0, 6, delta);
    }
  });

  const legPos: [number, number, number][] = [
    [0.5, 0.42, 0.3],
    [0.5, 0.42, -0.3],
    [-0.5, 0.42, 0.3],
    [-0.5, 0.42, -0.3],
  ];

  return (
    <group ref={group} position={[init.x, 0, init.z]} scale={0.92}>
      {/* どうたい */}
      <mesh castShadow position={[0, 0.78, 0]} scale={[1.5, 0.92, 0.88]}>
        <sphereGeometry args={[0.55, 20, 16]} />
        <meshStandardMaterial color={body} roughness={0.75} />
      </mesh>
      {/* くび */}
      <mesh castShadow position={[0.62, 1.0, 0]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.17, 0.22, 0.7, 12]} />
        <meshStandardMaterial color={body} roughness={0.75} />
      </mesh>
      {/* あたま */}
      <mesh castShadow position={[0.98, 1.2, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.52, 0.3, 0.28]} />
        <meshStandardMaterial color={body} roughness={0.75} />
      </mesh>
      {/* みみ */}
      <mesh position={[0.86, 1.4, 0.08]}>
        <coneGeometry args={[0.07, 0.16, 8]} />
        <meshStandardMaterial color={dark} roughness={0.8} />
      </mesh>
      <mesh position={[0.86, 1.4, -0.08]}>
        <coneGeometry args={[0.07, 0.16, 8]} />
        <meshStandardMaterial color={dark} roughness={0.8} />
      </mesh>
      {/* め */}
      <mesh position={[1.12, 1.22, 0.13]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#15110d" />
      </mesh>
      <mesh position={[1.12, 1.22, -0.13]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#15110d" />
      </mesh>
      {/* たてがみ */}
      <mesh castShadow position={[0.58, 1.12, 0]} rotation={[0, 0, -0.7]}>
        <boxGeometry args={[0.12, 0.7, 0.34]} />
        <meshStandardMaterial color={dark} roughness={0.85} />
      </mesh>
      {/* しっぽ */}
      <mesh castShadow position={[-0.82, 0.78, 0]} rotation={[0, 0, 0.8]}>
        <coneGeometry args={[0.14, 0.7, 10]} />
        <meshStandardMaterial color={dark} roughness={0.85} />
      </mesh>
      {/* あし×4 */}
      {legPos.map((p, k) => (
        <group key={k} ref={legs[k]} position={p}>
          <mesh castShadow position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.62, 10]} />
            <meshStandardMaterial color={dark} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.62, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.08, 8]} />
            <meshStandardMaterial color={shade(racer.color, -0.6)} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Horses({ field, posRef, racing }: { field: Racer[]; posRef: React.MutableRefObject<number[]>; racing: boolean }) {
  return (
    <>
      {field.map((h, i) => (
        <Horse3D key={h.key} index={i} count={field.length} racer={h} posRef={posRef} racing={racing} />
      ))}
    </>
  );
}

function Track() {
  const trackShape = useMemo(() => stadiumShape(16.2, 9.7, { w: 8.6, d: 3.4 }), []);
  const infieldShape = useMemo(() => stadiumShape(8.4, 3.2), []);
  const railOuter = useMemo(() => stadiumShape(16.4, 9.9, { w: 16.0, d: 9.5 }), []);
  const railInner = useMemo(() => stadiumShape(8.7, 3.5, { w: 8.4, d: 3.2 }), []);

  return (
    <group>
      {/* じめん（しば）*/}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#5f9468" roughness={1} />
      </mesh>
      {/* コース（はしるめん）*/}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.0, 0]} receiveShadow>
        <shapeGeometry args={[trackShape]} />
        <meshStandardMaterial color="#4d8a61" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* なかにわ */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <shapeGeometry args={[infieldShape]} />
        <meshStandardMaterial color="#74b07f" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* レール（しろ）*/}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <shapeGeometry args={[railOuter]} />
        <meshStandardMaterial color="#f3efe6" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <shapeGeometry args={[railInner]} />
        <meshStandardMaterial color="#f3efe6" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* ゴールせん（まえの ちょくせん）*/}
      <mesh position={[0, 0.06, 6.45]}>
        <boxGeometry args={[0.5, 0.05, 6.1]} />
        <meshStandardMaterial color="#fbfbf8" roughness={0.5} />
      </mesh>
      {/* スタンド（おくの ちょくせん うしろ）*/}
      <mesh position={[0, 1.6, -13]} castShadow>
        <boxGeometry args={[30, 3.2, 1.4]} />
        <meshStandardMaterial color="#d9d3c6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.4, -13.4]}>
        <boxGeometry args={[31, 0.4, 2.4]} />
        <meshStandardMaterial color="#9c5b46" roughness={0.85} />
      </mesh>
    </group>
  );
}

function CameraRig({ field, posRef }: { field: Racer[]; posRef: React.MutableRefObject<number[]> }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 1, 4));
  useFrame((_, delta) => {
    // パックの ちゅうしんを みる（すこし せんとうよりに）
    let sx = 0;
    let sz = 0;
    let lead = -1;
    let leadIdx = 0;
    field.forEach((_, i) => {
      const { halfW, halfD } = laneHalves(i, field.length);
      const p = (posRef.current[i] ?? 0) / DISTANCE;
      const { x, z } = stadiumAt(p, halfW, halfD);
      sx += x;
      sz += z;
      if (p > lead) {
        lead = p;
        leadIdx = i;
      }
    });
    const n = Math.max(1, field.length);
    const lh = laneHalves(leadIdx, field.length);
    const lp = stadiumAt(lead < 0 ? 0 : lead, lh.halfW, lh.halfD);
    const tx = (sx / n) * 0.5 + lp.x * 0.5;
    const tz = (sz / n) * 0.5 + lp.z * 0.5;
    look.current.x = THREE.MathUtils.damp(look.current.x, tx, 3, delta);
    look.current.z = THREE.MathUtils.damp(look.current.z, tz, 3, delta);
    camera.lookAt(look.current);
  });
  return null;
}

export default function Race3D({
  field,
  positions,
  racing,
}: {
  field: Racer[];
  positions: number[];
  racing: boolean;
}) {
  const posRef = useRef<number[]>(positions);
  posRef.current = positions;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 16, 26], fov: 42 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#bfe3f0"]} />
      <fog attach="fog" args={["#bfe3f0", 42, 86]} />
      <hemisphereLight args={["#dff0ff", "#5a7a55", 0.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[14, 24, 10]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      <Track />
      <Horses field={field} posRef={posRef} racing={racing} />
      <CameraRig field={field} posRef={posRef} />
    </Canvas>
  );
}
