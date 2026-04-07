"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Text } from "@react-three/drei";
import * as THREE from "three";
import type { FlightState } from "@/types/flight";
import { getCategoryColor } from "./CanvasPlaneLayer";
import { metersToFeet, msToKnots, msToFpm, formatCallsign } from "@/lib/mapUtils";

// ---------- types ----------

interface Flight3DViewerProps {
  flight: FlightState;
  onClose: () => void;
}

// ---------- 3D Airplane Model ----------

function AirplaneModel({
  flight,
  color,
}: {
  flight: FlightState;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ y: 0, x: 0 });

  // Update target rotation from flight data
  useEffect(() => {
    if (flight.trueTrack !== null) {
      // Convert heading to radians, negate because Three.js Y rotation is CW from top
      targetRotation.current.y = -THREE.MathUtils.degToRad(flight.trueTrack);
    }
    if (flight.verticalRate !== null) {
      // Pitch up for climb, down for descent — clamp to ±15°
      const pitchDeg = Math.max(-15, Math.min(15, (flight.verticalRate / 20) * 15));
      targetRotation.current.x = THREE.MathUtils.degToRad(pitchDeg);
    }
  }, [flight.trueTrack, flight.verticalRate]);

  // Smooth rotation animation
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotation.current.y,
      0.05
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotation.current.x,
      0.05
    );
  });

  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const darkColor = useMemo(
    () => new THREE.Color(color).multiplyScalar(0.6),
    [color]
  );
  const accentColor = useMemo(
    () => new THREE.Color(color).multiplyScalar(0.8),
    [color]
  );

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.2, 4, 16]} />
        <meshStandardMaterial color={threeColor} metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 0, -2.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.3, 0.8, 16]} />
        <meshStandardMaterial color={accentColor} metalness={0.5} roughness={0.2} />
      </mesh>

      {/* Main wings */}
      <mesh position={[0, 0, -0.2]}>
        <boxGeometry args={[6, 0.08, 1]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Wing tips (angled up slightly) */}
      <mesh position={[3.1, 0.15, -0.2]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.3, 0.08, 0.6]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[-3.1, 0.15, -0.2]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.3, 0.08, 0.6]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Vertical stabilizer (tail) */}
      <mesh position={[0, 0.6, 1.7]}>
        <boxGeometry args={[0.08, 1.2, 0.7]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Horizontal stabilizers */}
      <mesh position={[0, 0.05, 1.7]}>
        <boxGeometry args={[2.2, 0.06, 0.5]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Engine nacelles (under wings) */}
      <mesh position={[1.5, -0.3, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.8, 12]} />
        <meshStandardMaterial color={darkColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[-1.5, -0.3, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.8, 12]} />
        <meshStandardMaterial color={darkColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Cockpit windows */}
      <mesh position={[0, 0.15, -1.9]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.35, 0.12, 0.3]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.1} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// ---------- Heading Arrow ----------

function HeadingArrow({ heading }: { heading: number | null }) {
  if (heading === null) return null;
  const rad = -THREE.MathUtils.degToRad(heading);

  return (
    <group rotation={[0, rad, 0]} position={[0, -2.49, 0]}>
      {/* Arrow shaft */}
      <mesh position={[0, 0, -3]}>
        <boxGeometry args={[0.08, 0.02, 4]} />
        <meshStandardMaterial color="#94a3b8" emissive="#94a3b8" emissiveIntensity={0.3} />
      </mesh>
      {/* Arrow head */}
      <mesh position={[0, 0, -5.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.25, 0.6, 8]} />
        <meshStandardMaterial color="#94a3b8" emissive="#94a3b8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ---------- Ground Grid ----------

function GroundPlane() {
  return (
    <group position={[0, -2.5, 0]}>
      <gridHelper args={[40, 40, "#333333", "#1c1c1c"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a0a0a" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// ---------- Compass Rose ----------

function CompassRose() {
  const labels = [
    { text: "N", pos: [0, -2.45, -18] as [number, number, number] },
    { text: "S", pos: [0, -2.45, 18] as [number, number, number] },
    { text: "E", pos: [18, -2.45, 0] as [number, number, number] },
    { text: "W", pos: [-18, -2.45, 0] as [number, number, number] },
  ];

  return (
    <>
      {labels.map((l) => (
        <Text
          key={l.text}
          position={l.pos}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.8}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          {l.text}
        </Text>
      ))}
    </>
  );
}

// ---------- Scene ----------

function Scene({ flight }: { flight: FlightState }) {
  const color = getCategoryColor(flight.category);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 5, -3]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#cbd5e1" />

      {/* Environment for reflections */}
      <Environment preset="night" />

      {/* Airplane */}
      <AirplaneModel flight={flight} color={color} />

      {/* Heading arrow on ground */}
      <HeadingArrow heading={flight.trueTrack} />

      {/* Ground */}
      <GroundPlane />
      <CompassRose />

      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={3}
        maxDistance={25}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={0.1}
        target={[0, 0, 0]}
      />
    </>
  );
}

// ---------- HUD Overlay ----------

function HUD({ flight }: { flight: FlightState }) {
  const altitude =
    flight.baroAltitude !== null
      ? `${metersToFeet(flight.baroAltitude).toLocaleString()} ft`
      : "N/A";
  const speed =
    flight.velocity !== null ? `${msToKnots(flight.velocity)} kts` : "N/A";
  const heading =
    flight.trueTrack !== null ? `${Math.round(flight.trueTrack)}\u00b0` : "N/A";
  const vRate =
    flight.verticalRate !== null
      ? `${msToFpm(flight.verticalRate) >= 0 ? "+" : ""}${msToFpm(flight.verticalRate)} fpm`
      : "N/A";

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-10">
      <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
        <HUDItem label="ALT" value={altitude} />
        <HUDItem label="SPD" value={speed} />
        <HUDItem label="HDG" value={heading} />
        <HUDItem label="V/S" value={vRate} />
      </div>
    </div>
  );
}

function HUDItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold text-slate-400/80 tracking-wider">
        {label}
      </div>
      <div className="text-sm font-mono font-semibold text-white">{value}</div>
    </div>
  );
}

// ---------- Main Component ----------

export default function Flight3DViewer({ flight, onClose }: Flight3DViewerProps) {
  const callsign = formatCallsign(flight.callsign);
  const categoryColor = getCategoryColor(flight.category);

  return (
    <div className="fixed inset-0 z-[2000] bg-gray-950 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90 border-b border-gray-800 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-white font-bold text-lg tracking-wide">{callsign}</span>
          </div>
          <span
            className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
            style={{
              backgroundColor: categoryColor + "30",
              color: categoryColor,
            }}
          >
            {flight.originCountry}
          </span>
          {flight.onGround && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/20 text-slate-400">
              ON GROUND
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 mr-2">
            <span>Drag to orbit</span>
            <span className="text-gray-700">&middot;</span>
            <span>Scroll to zoom</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [8, 4, 8], fov: 50 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#080808"]} />
          <fog attach="fog" args={["#080808", 20, 40]} />
          <Scene flight={flight} />
        </Canvas>

        {/* Live HUD */}
        <HUD flight={flight} />

        {/* ICAO badge */}
        <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg px-2.5 py-1 text-[10px] text-gray-400 font-mono">
          ICAO {flight.icao24.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
