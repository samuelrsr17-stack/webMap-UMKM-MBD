"use client";

import { useEffect } from "react";
import * as L from "leaflet";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Feature, Geometry } from "geojson";
import type { MapPoint, UmkmRecord } from "@/lib/database.types";
import { categoryLabels, type VillageCollection, type VillageProperties } from "@/lib/validation";

interface MapCanvasProps {
  villages: VillageCollection | null;
  points: MapPoint[];
  umkm: UmkmRecord[];
  villageByCode: ReadonlyMap<string, VillageProperties>;
  canEdit: boolean;
  onMovePoint: (id: string, lat: number, lng: number) => Promise<boolean>;
}

const umkmCategories = [
  { field: "micro", descriptionField: "description_micro", category: "mikro", label: "Mikro", offset: -16 },
  { field: "small", descriptionField: "description_small", category: "kecil", label: "Kecil", offset: 0 },
  { field: "medium", descriptionField: "description_medium", category: "menengah", label: "Menengah", offset: 16 },
] as const;

function FitMbdBounds({ villages }: { villages: VillageCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!villages || villages.features.length === 0) return;
    const layer = L.geoJSON(villages);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 10 });
  }, [map, villages]);
  return null;
}

export default function MbdMap({ villages, points, umkm, villageByCode, canEdit, onMovePoint }: MapCanvasProps) {
  const latestUmkmByVillage = new Map<string, UmkmRecord>();
  for (const record of umkm) {
    const current = latestUmkmByVillage.get(record.village_code);
    if (!current || record.year > current.year) latestUmkmByVillage.set(record.village_code, record);
  }

  return (
    <MapContainer
      center={[-8.15, 127.9]}
      zoom={8}
      minZoom={7}
      maxZoom={18}
      scrollWheelZoom
      zoomControl
      preferCanvas
      className="leaflet-map"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        maxZoom={19}
      />
      {villages && (
        <>
          <GeoJSON
            key="mbd-villages"
            data={villages}
            style={(feature) => ({
              color: "#238877",
              weight: 1.15,
              opacity: 0.9,
              fillColor: districtColor((feature as Feature<Geometry, VillageProperties> | undefined)?.properties.kecCode ?? ""),
              fillOpacity: 0.24,
            })}
            onEachFeature={(feature, layer) => {
              const properties = feature.properties as VillageProperties;
              layer.bindTooltip(`${properties.name} · ${properties.kecamatan}`, { sticky: true });
            }}
          />
          <FitMbdBounds villages={villages} />
        </>
      )}

      {/* RENDER POIN / MARKER */}
      {points.map((point) => {
        const village = villageByCode.get(point.village_code);
        return (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={pointIcon(point.category)}
            // KUNCI KEAMANAN: Pengunjung tidak bisa menggeser marker (draggable bernilai false jika canEdit = false)
            draggable={canEdit}
            eventHandlers={{
              dragend: (event) => {
                if (!canEdit) return; // Mencegah pengunjung memindahkan data
                const marker = event.target as L.Marker;
                const { lat, lng } = marker.getLatLng();
                void onMovePoint(point.id, lat, lng).then((saved) => {
                  if (!saved) marker.setLatLng([point.lat, point.lng]);
                });
              },
            }}
          >
            <Tooltip direction="top">{point.name}</Tooltip>
            
            {/* POPUP YANG BERSIH: Hanya menampilkan informasi dan aman dari tombol hapus/edit */}
            <Popup>
              <div style={{ fontFamily: 'sans-serif' }}>
                <strong>{point.name}</strong>
                <br />{village?.name ?? point.village_code} · {categoryLabels[point.category]}
                {point.value != null && <><br />Nilai: {new Intl.NumberFormat("id-ID").format(point.value)}</>}
                {/* Tidak ada tombol Hapus atau Edit di sini untuk pengunjung */}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* RENDER UMKM */}
      {[...latestUmkmByVillage.values()].flatMap((record) => {
        const village = villageByCode.get(record.village_code);
        if (!village) return [];
        return umkmCategories
          .filter(({ field }) => record[field] > 0)
          .map(({ field, descriptionField, category, label, offset }) => (
            <Marker
              key={`umkm-${record.village_code}-${category}`}
              position={village.label}
              icon={pointIcon(category, offset)}
              zIndexOffset={offset}
            >
              <Tooltip direction="top">{village.name} · UMKM {label}</Tooltip>
              
              {/* POPUP UMKM: Hanya info murni */}
              <Popup>
                <div style={{ fontFamily: 'sans-serif' }}>
                  <strong>UMKM {label} · {new Intl.NumberFormat("id-ID").format(record[field])} usaha</strong>
                  <br />{village.name} · {village.kecamatan}
                  <br />Tahun data: {record.year}
                  {record[descriptionField] && <><br /><span className="umkm-map-description">{record[descriptionField]}</span></>}
                  {/* Tidak ada tombol Hapus atau Edit di sini untuk pengunjung */}
                </div>
              </Popup>
            </Marker>
          ));
      })}
    </MapContainer>
  );
}

function districtColor(code: string): string {
  const colors = ["#55b6a5", "#f0bf75", "#93aee8", "#db95b6", "#9dca8b", "#bb9be1"];
  let hash = 0;
  for (let index = 0; index < code.length; index += 1) hash = (hash * 31 + code.charCodeAt(index)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function pointIcon(category: MapPoint["category"], horizontalOffset = 0): L.DivIcon {
  return L.divIcon({
    className: `point-marker-icon point-marker-icon--${category}`,
    html: "<span></span>",
    iconSize: [18, 18],
    iconAnchor: [9 - horizontalOffset, 9],
  });
}