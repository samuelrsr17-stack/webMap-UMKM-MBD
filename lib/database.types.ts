export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PointCategory = "mikro" | "kecil" | "menengah";

export type MapPoint = {
  id: string;
  user_id: string;
  name: string;
  village_code: string;
  category: PointCategory;
  lat: number;
  lng: number;
  value: number | null;
  description: string;
  created_at: string;
  updated_at: string;
};

export type UmkmRecord = {
  id: string;
  user_id: string;
  village_code: string;
  year: number;
  micro: number;
  small: number;
  medium: number;
  source: string;
  description_micro: string;
  description_small: string;
  description_medium: string;
  updated_at: string;
};

export type UmkmBusinessTypeRecord = {
  id: string;
  user_id: string;
  village_code: string;
  year: number;
  culinary: number;
  fashion: number;
  handicraft: number;
  agribusiness_fisheries: number;
  trade: number;
  services_tourism: number;
  creative_digital: number;
  source: string;
  updated_at: string;
};

export type EconomyRecord = {
  id: string;
  user_id: string;
  village_code: string;
  year: number;
  turnover: number;
  workers: number;
  investment: number;
  updated_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      mbd_villages: Table<
        { code: string; name: string; district_code: string; district_name: string },
        { code: string; name: string; district_code: string; district_name: string },
        { name?: string; district_code?: string; district_name?: string }
      >;
      map_points: Table<
        MapPoint,
        Omit<MapPoint, "id" | "user_id" | "created_at" | "updated_at">,
        Partial<Omit<MapPoint, "id" | "user_id" | "created_at" | "updated_at">>
      >;
      umkm_records: Table<
        UmkmRecord,
        Omit<UmkmRecord, "id" | "user_id" | "updated_at">,
        Partial<Omit<UmkmRecord, "id" | "user_id" | "updated_at">>
      >;
      umkm_business_type_records: Table<
        UmkmBusinessTypeRecord,
        Omit<UmkmBusinessTypeRecord, "id" | "user_id" | "updated_at">,
        Partial<Omit<UmkmBusinessTypeRecord, "id" | "user_id" | "updated_at">>
      >;
      economy_records: Table<
        EconomyRecord,
        Omit<EconomyRecord, "id" | "user_id" | "updated_at">,
        Partial<Omit<EconomyRecord, "id" | "user_id" | "updated_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_app_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      upsert_mbd_villages: {
        Args: { features: Json };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
