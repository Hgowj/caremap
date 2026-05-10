import toiletList from "../public/toilets.json";

export interface ToiletLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hasBidet?: boolean;
  hasHandicap?: boolean;
  source: "osm" | "onemap";
}

export interface HawkerCentre {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
}

export interface Park {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export async function getToiletsNearby(
  lat: number,
  lng: number,
  radiusMetres: number = 800
): Promise<ToiletLocation[]> {
  try {
    const all = toiletList as Array<{
      id: string; lat: number; lng: number;
      name: string; wheelchair: boolean; bidet: boolean; free?: boolean;
    }>;
    const radiusDeg = radiusMetres / 111320;
    return all
      .filter(t => Math.sqrt((t.lat - lat) ** 2 + (t.lng - lng) ** 2) <= radiusDeg)
      .map(t => ({
        id: t.id,
        name: t.name ?? "Public Toilet",
        lat: t.lat,
        lng: t.lng,
        hasBidet: t.bidet ?? false,
        hasHandicap: t.wheelchair ?? false,
        isFree: t.free ?? false,
        source: "osm" as const,
      }));
  } catch (err) {
    console.error("[Toilets] Failed:", err);
    return [];
  }
}

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Hawker Centres ───────────────────────────────────────────────────────────

let _hawkerCache: HawkerCentre[] | null = null;

export async function getHawkerCentres(): Promise<HawkerCentre[]> {
  if (_hawkerCache) return _hawkerCache;

  try {
    const pollRes  = await fetch(
      "https://api-open.data.gov.sg/v1/public/api/datasets/d_4a086da0a5553be1d89383cd90d07ecd/poll-download",
      { signal: AbortSignal.timeout(6000) }
    );
    const pollJson = await pollRes.json() as any;
    if (pollJson.code !== 0) throw new Error(pollJson.errMsg);

    const dlRes   = await fetch(pollJson.data.url, { signal: AbortSignal.timeout(10000) });
    const geojson = await dlRes.json() as any;

    _hawkerCache = (geojson.features ?? [])
      .filter((f: any) => f.geometry?.coordinates && f.properties?.STATUS === "Existing")
      .map((f: any) => {
        const p         = f.properties;
        const [lng, lat] = f.geometry.coordinates;
        return {
          id:      `hc-${p.OBJECTID}`,
          name:    p.NAME ?? p.ADDRESSBUILDINGNAME ?? "Hawker Centre",
          address: p.ADDRESS_MYENV ?? p.ADDRESSSTREETNAME ?? "",
          lat, lng,
          status:  p.STATUS ?? "Existing",
        };
      });

    console.log(`[Hawkers] Loaded ${_hawkerCache!.length} from data.gov.sg`);
    return _hawkerCache!;
  } catch (err) {
    console.warn("[Hawkers] data.gov.sg failed, using fallback:", (err as Error).message);
    _hawkerCache = getHawkerFallback();
    return _hawkerCache;
  }
}

function getHawkerFallback(): HawkerCentre[] {
  return [
    { id: "hc-f1",  name: "Maxwell Food Centre",           address: "1 Kadayanallur St",        lat: 1.2801, lng: 103.8448, status: "Existing" },
    { id: "hc-f2",  name: "Lau Pa Sat",                   address: "18 Raffles Quay",           lat: 1.2808, lng: 103.8503, status: "Existing" },
    { id: "hc-f3",  name: "Newton Food Centre",           address: "500 Clemenceau Ave North",  lat: 1.3119, lng: 103.8384, status: "Existing" },
    { id: "hc-f4",  name: "Tiong Bahru Market",           address: "30 Seng Poh Rd",            lat: 1.2848, lng: 103.8322, status: "Existing" },
    { id: "hc-f5",  name: "Adam Road Food Centre",        address: "2 Adam Rd",                 lat: 1.3242, lng: 103.8142, status: "Existing" },
    { id: "hc-f6",  name: "Bishan North Food Centre",     address: "Bishan St 13",              lat: 1.3615, lng: 103.8486, status: "Existing" },
    { id: "hc-f7",  name: "Toa Payoh Lorong 8 Market",   address: "210 Lorong 8 Toa Payoh",    lat: 1.3385, lng: 103.8489, status: "Existing" },
    { id: "hc-f8",  name: "Whampoa Drive Makan Place",   address: "90 Whampoa Dr",             lat: 1.3231, lng: 103.8550, status: "Existing" },
    { id: "hc-f9",  name: "Old Airport Road Food Centre",address: "51 Old Airport Rd",         lat: 1.3074, lng: 103.8840, status: "Existing" },
    { id: "hc-f10", name: "Bedok North Street 4",        address: "Blk 85 Bedok North St 4",   lat: 1.3321, lng: 103.9387, status: "Existing" },
    { id: "hc-f11", name: "Tampines Round Market",       address: "137 Tampines St 11",         lat: 1.3528, lng: 103.9449, status: "Existing" },
    { id: "hc-f12", name: "Jurong West 505 Market",      address: "505 Jurong West St 52",      lat: 1.3479, lng: 103.7072, status: "Existing" },
    { id: "hc-f13", name: "Clementi 448 Market",         address: "448 Clementi Ave 3",         lat: 1.3149, lng: 103.7651, status: "Existing" },
    { id: "hc-f14", name: "Ang Mo Kio Ave 4 Market",    address: "Blk 160 Ang Mo Kio Ave 4",   lat: 1.3743, lng: 103.8390, status: "Existing" },
    { id: "hc-f15", name: "Geylang Serai Market",        address: "1 Geylang Serai",            lat: 1.3143, lng: 103.9003, status: "Existing" },
    { id: "hc-f16", name: "Chinatown Complex Market",   address: "335 Smith St",               lat: 1.2822, lng: 103.8437, status: "Existing" },
    { id: "hc-f17", name: "Commonwealth Crescent Market",address: "31 Commonwealth Cres",      lat: 1.3069, lng: 103.8004, status: "Existing" },
    { id: "hc-f18", name: "Bukit Timah Market",         address: "51 Upper Bukit Timah Rd",    lat: 1.3407, lng: 103.7756, status: "Existing" },
    { id: "hc-f19", name: "Marsiling Lane Market",      address: "Blk 20 Marsiling Lane",      lat: 1.4434, lng: 103.7770, status: "Existing" },
    { id: "hc-f20", name: "Sembawang Hills Food Centre",address: "590 Upper Thomson Rd",       lat: 1.3609, lng: 103.8268, status: "Existing" },
  ];
}

export async function getParksNearby(_lat: number, _lng: number, _r = 0.02): Promise<Park[]> {
  return [];
}