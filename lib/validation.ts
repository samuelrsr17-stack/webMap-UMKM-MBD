import { z } from "zod";
import type { FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import type { PointCategory } from "@/lib/database.types";

export interface VillageProperties {
  code: string;
  name: string;
  kecamatan: string;
  kecCode: string;
  label: [number, number];
  areaKm2: number;
}

export type VillageCollection = FeatureCollection<Geometry, VillageProperties>;

const cleanText = (max: number, label: string) =>
  z.string().trim().min(1, `${label} wajib diisi.`).max(max, `${label} maksimal ${max} karakter.`);

const nonNegativeNumber = (label: string, integer = false) => {
  const schema = z.coerce.number().finite().min(0, `${label} tidak boleh negatif.`);
  return integer
    ? schema.int(`${label} harus bilangan bulat.`).max(2_147_483_647, `${label} terlalu besar.`)
    : schema.max(Number.MAX_SAFE_INTEGER, `${label} terlalu besar.`);
};

export const pointSchema = z.object({
  name: cleanText(100, "Nama titik"),
  village_code: cleanText(20, "Desa"),
  category: z.enum(["mikro", "kecil", "menengah"]),
  lat: z.coerce.number().finite().min(-10).max(-6),
  lng: z.coerce.number().finite().min(125).max(131),
  value: z.preprocess(
    (value) => value === "" || value == null ? null : Number(value),
    z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER, "Nilai terlalu besar.").nullable(),
  ),
  description: z.string().trim().max(500, "Keterangan maksimal 500 karakter."),
});

export const umkmSchema = z.object({
  village_code: cleanText(20, "Desa"),
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1),
  micro: nonNegativeNumber("Usaha mikro", true),
  small: nonNegativeNumber("Usaha kecil", true),
  medium: nonNegativeNumber("Usaha menengah", true),
  source: z.string().trim().max(160, "Sumber maksimal 160 karakter."),
  description_micro: z.string().trim().max(500, "Deskripsi mikro maksimal 500 karakter."),
  description_small: z.string().trim().max(500, "Deskripsi kecil maksimal 500 karakter."),
  description_medium: z.string().trim().max(500, "Deskripsi menengah maksimal 500 karakter."),
});

export const economySchema = z.object({
  village_code: cleanText(20, "Desa"),
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1),
  turnover: nonNegativeNumber("Omzet"),
  workers: nonNegativeNumber("Tenaga kerja", true),
  investment: nonNegativeNumber("Investasi"),
});

export type PointInput = z.infer<typeof pointSchema>;
export type UmkmInput = z.infer<typeof umkmSchema>;
export type EconomyInput = z.infer<typeof economySchema>;

export const categoryLabels: Record<PointCategory, string> = {
  mikro: "Mikro",
  kecil: "Kecil",
  menengah: "Menengah",
};

function isOnRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
    if (Math.abs(cross) < 1e-10 &&
        x >= Math.min(x1, x2) - 1e-10 && x <= Math.max(x1, x2) + 1e-10 &&
        y >= Math.min(y1, y2) - 1e-10 && y <= Math.max(y1, y2) + 1e-10) {
      return true;
    }
  }
  return false;
}

function isInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function geometryContainsPoint(
  geometry: Polygon | MultiPolygon,
  point: [number, number],
): boolean {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((rings) => {
    const [outer, ...holes] = rings;
    if (isOnRing(point, outer)) return true;
    if (!isInRing(point, outer)) return false;
    return !holes.some((hole) => isOnRing(point, hole) || isInRing(point, hole));
  });
}

export function isInsideMbd(
  lat: number,
  lng: number,
  villages: VillageCollection | null,
  villageCode?: string,
): boolean {
  if (!villages || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const point: [number, number] = [lng, lat];
  return villages.features.some((feature) => {
    if (villageCode && feature.properties.code !== villageCode) return false;
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") return false;
    return geometryContainsPoint(feature.geometry, point);
  });
}
