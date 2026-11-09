import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local.");
}

const file = new URL("../public/data/mbd-villages.geojson", import.meta.url);
const collection = JSON.parse(await readFile(file, "utf8"));
if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features) || collection.features.length !== 118) {
  throw new Error("GeoJSON desa tidak valid: diharapkan FeatureCollection dengan 118 fitur.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data, error } = await supabase.rpc("upsert_mbd_villages", {
  features: collection.features,
});
if (error) throw new Error(`Gagal memuat batas desa ke Supabase: ${error.message}`);
console.log(`Berhasil memuat ${data} batas desa.`);
