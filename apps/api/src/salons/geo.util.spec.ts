import { boundingBox, haversineKm } from './geo.util.js';

describe('haversineKm', () => {
  it('is zero for the same point and symmetric', () => {
    expect(haversineKm(35.7, 51.4, 35.7, 51.4)).toBe(0);
    expect(haversineKm(35.7, 51.4, 32.65, 51.67)).toBeCloseTo(haversineKm(32.65, 51.67, 35.7, 51.4), 9);
  });

  it('matches known distances', () => {
    // Tehran (Azadi) → Isfahan (Naqsh-e Jahan): ~340 km as the crow flies
    expect(haversineKm(35.6997, 51.338, 32.6575, 51.6776)).toBeGreaterThan(335);
    expect(haversineKm(35.6997, 51.338, 32.6575, 51.6776)).toBeLessThan(345);
    // One degree of latitude ≈ 111.2 km
    expect(haversineKm(30, 50, 31, 50)).toBeCloseTo(111.19, 1);
  });
});

describe('boundingBox', () => {
  it('contains every point within the radius', () => {
    const box = boundingBox(35.7, 51.4, 10);
    for (const bearing of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const b = (bearing * Math.PI) / 180;
      // a point ~9.9 km away in that direction
      const lat = 35.7 + (9.9 / 111.19) * Math.cos(b);
      const lng = 51.4 + (9.9 / (111.19 * Math.cos((35.7 * Math.PI) / 180))) * Math.sin(b);
      expect(haversineKm(35.7, 51.4, lat, lng)).toBeLessThan(10);
      expect(lat).toBeGreaterThanOrEqual(box.minLat);
      expect(lat).toBeLessThanOrEqual(box.maxLat);
      expect(lng).toBeGreaterThanOrEqual(box.minLng);
      expect(lng).toBeLessThanOrEqual(box.maxLng);
    }
  });
});
