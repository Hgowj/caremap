# CareMap 🗺️

Accessible navigation for caregivers of seniors and PWDs in Singapore.

## Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Map**: Leaflet + OneMap tiles (Singapore-optimised)
- **PWA**: next-pwa (installable on mobile)
- **Data**: OneMap API, data.gov.sg, OpenStreetMap/Overpass
- **AI (Phase 2)**: Cloudflare Workers AI + SEA-LION

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in ONEMAP_EMAIL and ONEMAP_PASSWORD

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

> **Note:** The app runs without OneMap credentials in dev mode.
> Map tiles and POIs will use mock data. Register at:
> https://www.onemap.gov.sg/apidocs/register

## Key Pages
| Route | Description |
|---|---|
| `/map` | Main map + route planning |
| `/reports` | Community reports feed |
| `/saved` | Saved routes (placeholder) |
| `/settings` | Accessibility preferences (placeholder) |

## Key API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/api/search?q=bishan` | GET | Address search via OneMap |
| `/api/route?startLat=&startLng=&endLat=&endLng=` | GET | Walking route |
| `/api/pois?lat=&lng=&radius=500&types=toilet,hawker` | GET | POIs near point |
| `/api/reports` | GET | Active community reports |
| `/api/reports` | POST | Submit new report |
| `/api/reports/:id/confirm` | POST | Confirm a report |

## Next Steps
- [ ] Connect real OneMap token (register + add to .env.local)
- [ ] Decode OneMap encoded polyline for actual route geometry
- [ ] Integrate Cloudflare D1 for persistent report storage
- [ ] Add SEA-LION route description generation
- [ ] PWA icons (add 192×192 and 512×512 PNGs to public/icons/)
