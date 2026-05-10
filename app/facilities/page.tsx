"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Search, Loader2, MapPin, Phone, Navigation, ChevronRight } from "lucide-react";

type Category = "medical" | "community" | "eldercare" | "daily";
type SubCategory = "all" | "gp" | "polyclinic" | "pharmacy" | "hospital" | "eldercare" |
  "gym" | "activesg" | "rc" | "park" | "toilet" | "supermarket";

interface Facility {
  id: string;
  name: string;
  address: string;
  phone?: string;
  lat: number;
  lng: number;
  type: string;
  subType: SubCategory;
  badge?: string;
}

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "medical",   label: "Medical",   icon: "🏥" },
  { id: "community", label: "Community", icon: "🏘️" },
  { id: "eldercare", label: "Eldercare", icon: "👴" },
  { id: "daily",     label: "Daily",     icon: "🛒" },
];

const SUB_CATEGORIES: Record<Category, { id: SubCategory; label: string; icon: string }[]> = {
  medical: [
    { id: "all",        label: "All",        icon: "🔍" },
    { id: "gp",         label: "GP Clinics", icon: "🩺" },
    { id: "polyclinic", label: "Polyclinics",icon: "🏨" },
    { id: "pharmacy",   label: "Pharmacies", icon: "💊" },
    { id: "hospital",   label: "Hospitals",  icon: "🏥" },
  ],
  community: [
    { id: "all",      label: "All",       icon: "🔍" },
    { id: "gym",      label: "Gyms",      icon: "🏋️" },
    { id: "activesg", label: "ActiveSG",  icon: "⚽" },
    { id: "rc",       label: "RC / CC",   icon: "🏘️" },
    { id: "park",     label: "Parks",     icon: "🌳" },
  ],
  eldercare: [
    { id: "all",      label: "All",       icon: "🔍" },
    { id: "eldercare",label: "SAC",       icon: "👴" },
  ],
  daily: [
    { id: "all",        label: "All",         icon: "🔍" },
    { id: "toilet",     label: "Toilets",     icon: "🚽" },
    { id: "supermarket",label: "Supermarkets",icon: "🛒" },
  ],
};

// Hardcoded fallbacks for categories without API data
const HARDCODED: Partial<Record<SubCategory, Facility[]>> = {
  polyclinic: [
    { id: "poly-1", name: "Ang Mo Kio Polyclinic",    address: "21 Ang Mo Kio Central 2",           lat: 1.3691, lng: 103.8454, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-2", name: "Bedok Polyclinic",          address: "Gordon Rd, Bedok",                  lat: 1.3236, lng: 103.9302, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-3", name: "Bishan Polyclinic",         address: "Bishan Street 13",                  lat: 1.3521, lng: 103.8488, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-4", name: "Bukit Batok Polyclinic",    address: "50 Bukit Batok West Ave 3",         lat: 1.3490, lng: 103.7490, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-5", name: "Clementi Polyclinic",       address: "451 Clementi Ave 3",                lat: 1.3151, lng: 103.7651, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-6", name: "Geylang Polyclinic",        address: "21 Geylang East Central",           lat: 1.3191, lng: 103.8881, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-7", name: "Hougang Polyclinic",        address: "89 Hougang Ave 4",                  lat: 1.3702, lng: 103.8930, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-8", name: "Jurong Polyclinic",         address: "190 Jurong East Ave 1",             lat: 1.3441, lng: 103.7413, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-9", name: "Marine Parade Polyclinic",  address: "80 Marine Parade Central",          lat: 1.3020, lng: 103.9063, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-10",name: "Outram Polyclinic",         address: "3 Second Hospital Ave",             lat: 1.2796, lng: 103.8355, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-11",name: "Pasir Ris Polyclinic",      address: "1 Pasir Ris Drive 4",               lat: 1.3724, lng: 103.9490, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-12",name: "Queenstown Polyclinic",     address: "580 Stirling Road",                 lat: 1.3020, lng: 103.8010, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-13",name: "Toa Payoh Polyclinic",      address: "2003 Toa Payoh Lor 8",              lat: 1.3380, lng: 103.8500, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-14",name: "Woodlands Polyclinic",      address: "10 Woodlands Street 31",            lat: 1.4352, lng: 103.7868, type: "Polyclinic", subType: "polyclinic" },
    { id: "poly-15",name: "Yishun Polyclinic",         address: "2 Yishun Ave 9",                    lat: 1.4290, lng: 103.8352, type: "Polyclinic", subType: "polyclinic" },
  ],
  hospital: [
    { id: "hosp-1", name: "Singapore General Hospital",       address: "Outram Road",                lat: 1.2796, lng: 103.8355, type: "Public Hospital",   subType: "hospital", badge: "Public" },
    { id: "hosp-2", name: "Changi General Hospital",          address: "2 Simei Street 3",           lat: 1.3401, lng: 103.9497, type: "Public Hospital",   subType: "hospital", badge: "Public" },
    { id: "hosp-3", name: "Tan Tock Seng Hospital",           address: "11 Jalan Tan Tock Seng",     lat: 1.3211, lng: 103.8458, type: "Public Hospital",   subType: "hospital", badge: "Public" },
    { id: "hosp-4", name: "National University Hospital",     address: "5 Lower Kent Ridge Rd",      lat: 1.2941, lng: 103.7831, type: "Public Hospital",   subType: "hospital", badge: "Public" },
    { id: "hosp-5", name: "Khoo Teck Puat Hospital",          address: "90 Yishun Central",          lat: 1.4241, lng: 103.8381, type: "Public Hospital",   subType: "hospital", badge: "Public" },
    { id: "hosp-6", name: "Sengkang General Hospital",        address: "110 Sengkang E Way",         lat: 1.3951, lng: 103.8940, type: "Public Hospital",   subType: "hospital", badge: "Public" },
    { id: "hosp-7", name: "Ng Teng Fong General Hospital",    address: "1 Jurong East Street 21",    lat: 1.3440, lng: 103.7460, type: "Public Hospital",   subType: "hospital", badge: "Public" },
    { id: "hosp-8", name: "Gleneagles Hospital",              address: "6A Napier Road",             lat: 1.3071, lng: 103.8155, type: "Private Hospital",  subType: "hospital", badge: "Private" },
    { id: "hosp-9", name: "Mount Elizabeth Hospital",         address: "3 Mount Elizabeth",          lat: 1.3071, lng: 103.8328, type: "Private Hospital",  subType: "hospital", badge: "Private" },
    { id: "hosp-10",name: "Parkway East Hospital",            address: "321 Joo Chiat Place",        lat: 1.3133, lng: 103.9033, type: "Private Hospital",  subType: "hospital", badge: "Private" },
  ],
  activesg: [
    { id: "asg-1", name: "ActiveSG Bishan Sport Centre",      address: "5 Bishan Street 14",         lat: 1.3509, lng: 103.8488, type: "ActiveSG", subType: "activesg" },
    { id: "asg-2", name: "ActiveSG Bukit Timah Sport Centre", address: "920 Upper Bukit Timah Rd",   lat: 1.3590, lng: 103.7760, type: "ActiveSG", subType: "activesg" },
    { id: "asg-3", name: "ActiveSG Clementi Sport Centre",    address: "520 Clementi Ave 3",         lat: 1.3149, lng: 103.7651, type: "ActiveSG", subType: "activesg" },
    { id: "asg-4", name: "ActiveSG Jurong East Sport Centre", address: "21 Jurong East Street 31",   lat: 1.3351, lng: 103.7430, type: "ActiveSG", subType: "activesg" },
    { id: "asg-5", name: "ActiveSG Tampines Sport Centre",    address: "1 Tampines Street 29",       lat: 1.3531, lng: 103.9430, type: "ActiveSG", subType: "activesg" },
    { id: "asg-6", name: "ActiveSG Yishun Sport Centre",      address: "51 Yishun Ave 11",           lat: 1.4249, lng: 103.8361, type: "ActiveSG", subType: "activesg" },
  ],
  rc: [
    { id: "cc-1", name: "Bishan Community Club",              address: "51 Bishan Street 13",        lat: 1.3512, lng: 103.8488, type: "Community Club", subType: "rc" },
    { id: "cc-2", name: "Toa Payoh Community Club",           address: "93 Toa Payoh Central",       lat: 1.3341, lng: 103.8490, type: "Community Club", subType: "rc" },
    { id: "cc-3", name: "Tampines Community Club",            address: "Tampines Street 11",         lat: 1.3530, lng: 103.9450, type: "Community Club", subType: "rc" },
    { id: "cc-4", name: "Jurong Spring Community Club",       address: "jurong West",                lat: 1.3480, lng: 103.7080, type: "Community Club", subType: "rc" },
    { id: "cc-5", name: "Buona Vista Community Club",         address: "42 Holland Drive",           lat: 1.3080, lng: 103.7960, type: "Community Club", subType: "rc" },
  ],
  park: [
    { id: "park-1", name: "Bishan-Ang Mo Kio Park",           address: "1384 Ang Mo Kio Ave 1",      lat: 1.3601, lng: 103.8390, type: "Park", subType: "park" },
    { id: "park-2", name: "East Coast Park",                  address: "East Coast Park Service Rd", lat: 1.3003, lng: 103.9121, type: "Park", subType: "park" },
    { id: "park-3", name: "Botanic Gardens",                  address: "1 Cluny Road",               lat: 1.3138, lng: 103.8159, type: "Park", subType: "park" },
    { id: "park-4", name: "Jurong Lake Gardens",              address: "Yuan Ching Road",            lat: 1.3440, lng: 103.7260, type: "Park", subType: "park" },
    { id: "park-5", name: "Pasir Ris Park",                   address: "Pasir Ris",                  lat: 1.3810, lng: 103.9490, type: "Park", subType: "park" },
    { id: "park-6", name: "West Coast Park",                  address: "West Coast Ferry Road",      lat: 1.2951, lng: 103.7680, type: "Park", subType: "park" },
  ],
  supermarket: [
    { id: "sm-1",  name: "FairPrice Finest (Bishan)",         address: "Junction 8, Bishan",         lat: 1.3501, lng: 103.8481, type: "Supermarket", subType: "supermarket" },
    { id: "sm-2",  name: "NTUC FairPrice (Tampines)",         address: "Tampines Mall",              lat: 1.3530, lng: 103.9450, type: "Supermarket", subType: "supermarket" },
    { id: "sm-3",  name: "Cold Storage (Clementi)",           address: "321 Clementi Ave 3",         lat: 1.3151, lng: 103.7651, type: "Supermarket", subType: "supermarket" },
    { id: "sm-4",  name: "Giant (Toa Payoh)",                 address: "Toa Payoh Central",          lat: 1.3340, lng: 103.8491, type: "Supermarket", subType: "supermarket" },
    { id: "sm-5",  name: "Sheng Siong (Woodlands)",           address: "Woodlands Centre Rd",        lat: 1.4360, lng: 103.7870, type: "Supermarket", subType: "supermarket" },
  ],
};

export default function FacilitiesPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("medical");
  const [subCat, setSubCat]     = useState<SubCategory>("all");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    setSubCat("all");
    loadFacilities(category, "all");
  }, [category]);

  useEffect(() => {
    loadFacilities(category, subCat);
  }, [subCat]);

  const loadFacilities = async (cat: Category, sub: SubCategory) => {
    setLoading(true);
    setFacilities([]);

    try {
      // Map category+subcat to API types and hardcoded data
      const apiTypeMap: Partial<Record<SubCategory, string>> = {
        gp:       "chas",
        pharmacy: "pharmacy",
        eldercare:"eldercare",
        gym:      "gyms",
      };

      const results: Facility[] = [];

      // Determine which subcategories to load
      const subsToLoad: SubCategory[] = sub === "all"
        ? SUB_CATEGORIES[cat].filter(s => s.id !== "all").map(s => s.id as SubCategory)
        : [sub];

      await Promise.allSettled(subsToLoad.map(async (s) => {
        const apiType = apiTypeMap[s];

        if (apiType) {
          // Fetch from real API
          try {
            const res = await fetch(`/api/facilities?types=${apiType}`);
            const data = await res.json() as any;
            const items = data[apiType] ?? [];
            items.forEach((f: any) => results.push({ ...f, subType: s }));
          } catch {}
        }

        // Add hardcoded data for this subtype
        const hardcoded = HARDCODED[s] ?? [];
        hardcoded.forEach(f => results.push(f));
      }));

      setFacilities(results);
    } finally {
      setLoading(false);
    }
  };

  const filtered = facilities.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.address.toLowerCase().includes(search.toLowerCase())
  );

  const navigateTo = (f: Facility) => {
    router.push(`/map?destLat=${f.lat}&destLng=${f.lng}&destName=${encodeURIComponent(f.name)}`);
  };

  const subCatIcon = (s: SubCategory) =>
    SUB_CATEGORIES[category].find(x => x.id === s)?.icon ?? "📍";

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-3 bg-white border-b border-gray-100 shrink-0">
        <h1 className="font-bold text-xl text-gray-800">Facilities</h1>
        <p className="text-sm text-gray-400 mt-0.5">Nearby facilities and services</p>
      </div>

      {/* Category tabs */}
      <div className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-2 py-2">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                category === c.id
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Sub-category chips */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-2 pb-2">
          {SUB_CATEGORIES[category].map(s => (
            <button
              key={s.id}
              onClick={() => setSubCat(s.id as SubCategory)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                subCat === s.id
                  ? "border-brand-500 bg-brand-50 text-brand-600"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${CATEGORIES.find(c => c.id === category)?.label.toLowerCase() ?? "facilities"}...`}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-3xl mb-3">{CATEGORIES.find(c => c.id === category)?.icon}</p>
            <p className="text-gray-500 font-medium">No facilities found</p>
            <p className="text-gray-400 text-xs mt-1">Try a different filter or search term</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 px-1 pb-1">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-base flex-shrink-0">
                    {subCatIcon(f.subType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-800 leading-tight">{f.name}</p>
                      {f.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${
                          f.badge === "Public" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        }`}>{f.badge}</span>
                      )}
                    </div>
                    {f.address && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={10} className="text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500 truncate">{f.address}</p>
                      </div>
                    )}
                    {f.phone && (
                      <p className="text-xs text-gray-400 mt-0.5">📞 {f.phone}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        onClick={() => navigateTo(f)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Navigation size={11} />
                        Navigate
                      </button>
                      <span className="text-xs text-gray-400">{f.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}