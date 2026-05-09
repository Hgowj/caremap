import { NextRequest, NextResponse } from "next/server";

const DATASETS = {
  eldercare: "d_f0fd1b3643ed8bd34bd403dedd7c1533",
  gyms:      "d_b3ae090692ecf632116c9885cfbd3424",
  chas:      "d_548c33ea2d99e29ec63a7cc9edcccedc",
  pharmacy:  "d_bb92615f43de22933e4479558b1f6c36",
};

// Parse the HTML Description field from data.gov.sg GeoJSON
function parseDescription(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const matches = html.matchAll(/<th>([^<]+)<\/th>\s*<td>([^<]*)<\/td>/g);
  for (const m of matches) out[m[1].trim()] = m[2].trim();
  return out;
}

async function fetchDataset(id: string) {
  const pollRes = await fetch(
    `https://api-open.data.gov.sg/v1/public/api/datasets/${id}/poll-download`,
    { signal: AbortSignal.timeout(8000) }
  );
  const poll = await pollRes.json() as any;
  if (poll.code !== 0) throw new Error(poll.errMsg);
  const geoRes = await fetch(poll.data.url, { signal: AbortSignal.timeout(15000) });
  return geoRes.json() as any;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const types = searchParams.get("types")?.split(",") ?? Object.keys(DATASETS);

  const results: Record<string, any[]> = {};

  await Promise.allSettled(
    types.map(async (type) => {
      const datasetId = DATASETS[type as keyof typeof DATASETS];
      if (!datasetId) return;

      try {
        const geoJson = await fetchDataset(datasetId);

        results[type] = (geoJson.features ?? [])
          .filter((f: any) => f.geometry?.coordinates)
          .map((f: any) => {
            const props = parseDescription(f.properties?.Description ?? "");
            const [lng, lat] = f.geometry.coordinates;

            // Normalise fields by dataset type
            if (type === "eldercare") {
              return {
                id: f.properties.Name,
                name: props.NAME ?? "Senior Activity Centre",
                address: props.ADDRESSSTREETNAME ?? "",
                postal: props.ADDRESSPOSTALCODE ?? "",
                lat, lng, type,
              };
            }
            if (type === "gyms") {
              return {
                id: f.properties.Name,
                name: props.NAME ?? "Gym",
                address: props.ADDRESSSTREETNAME ?? "",
                description: props.DESCRIPTION ?? "",
                lat, lng, type,
              };
            }
            if (type === "chas") {
              return {
                id: props.HCI_CODE ?? f.properties.Name,
                name: props.HCI_NAME ?? "CHAS Clinic",
                address: [props.BLK_HSE_NO, props.STREET_NAME].filter(Boolean).join(" "),
                phone: props.HCI_TEL ?? "",
                programmes: props.CLINIC_PROGRAMME_CODE ?? "",
                postal: props.POSTAL_CD ?? "",
                lat, lng, type,
              };
            }
            if (type === "pharmacy") {
              const p = f.properties;
              return {
                id: `pharm-${p.OBJECTID_1}`,
                name: p.PHARMACY_NAME ?? "Pharmacy",
                address: [p.HOUSE_BLK_NO, p.ROAD_NAME].filter(Boolean).join(" "),
                postal: p.POSTAL_CODE ?? "",
                lat, lng, type,
              };
            }
            return { id: f.properties.Name, lat, lng, type };
          });

        console.log(`[Facilities] ${type}: ${results[type].length} loaded`);
      } catch (err) {
        console.error(`[Facilities] ${type} failed:`, err);
        results[type] = [];
      }
    })
  );

  return NextResponse.json(results);
}