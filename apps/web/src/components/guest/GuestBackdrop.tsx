import type { CSSProperties } from "react";

// Orbs: size, position, colour, drift distance and period. Radial gradients, not blurred
// elements — as soft as filter: blur() at a fraction of the GPU cost on phones.
type Orb = Pick<CSSProperties, "top" | "right" | "bottom" | "left"> & { size: string; orb: string; dx: string; dy: string; dur: string };

const ORBS: Orb[] = [
  { size: "46rem", top: "-18rem", right: "-14rem", orb: "rgb(242 135 106 / 0.30)", dx: "-60px", dy: "50px", dur: "22s" },
  { size: "38rem", top: "30%", left: "-16rem", orb: "rgb(224 80 122 / 0.22)", dx: "70px", dy: "-40px", dur: "26s" },
  { size: "30rem", bottom: "-12rem", right: "20%", orb: "rgb(126 88 210 / 0.22)", dx: "-40px", dy: "-60px", dur: "30s" },
  { size: "18rem", top: "18%", left: "38%", orb: "rgb(246 180 107 / 0.12)", dx: "50px", dy: "40px", dur: "19s" },
];

/** Fixed ambient layer behind every guest page: drifting mesh, glowing spheres, fading grid. */
export default function GuestBackdrop() {
  return (
    <div className="g-backdrop" aria-hidden>
      <div className="g-mesh" />
      {ORBS.map(({ size, orb, dx, dy, dur, ...pos }, i) => (
        <div
          key={i}
          className="g-orb"
          style={{ width: size, height: size, ...pos, "--orb": orb, "--dx": dx, "--dy": dy, "--dur": dur } as CSSProperties}
        />
      ))}
      <div className="g-grid" />
      <div className="g-noise" />
    </div>
  );
}
