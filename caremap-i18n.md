# CareMap — Multilingual i18n Implementation

## Goal
Implement next-intl for EN / ZH / TH / TL / TA across all UI pages and components.
Language is stored in a cookie (`cm_locale`) and switched from the Settings page.
Do NOT use URL-based locale routing (no `/en/`, `/th/` prefixes). Cookie-based only.

---

## Step 0: Read these files first
Before making any changes, read ALL of the following:
- `package.json` (check if next-intl is already installed)
- `next.config.js` or `next.config.ts`
- `middleware.ts` (if it exists)
- `app/layout.tsx`
- `app/map/page.tsx`
- `app/notes/page.tsx`
- `app/facilities/page.tsx`
- `app/settings/page.tsx`
- `app/onboarding/page.tsx`
- `components/BottomNav.tsx`
- `components/ReportModal.tsx`
- `tsconfig.json`

---

## Step 1: Install next-intl

```bash
npm install next-intl
```

---

## Step 2: Create message files

Create the `messages/` directory in the project root with these 5 files.

### `messages/en.json`
```json
{
  "nav": {
    "map": "Map",
    "facilities": "Facilities",
    "saved": "Saved",
    "notes": "Notes",
    "settings": "Settings"
  },
  "map": {
    "searchPlaceholder": "Where would you like to go?",
    "recentSearches": "Recent searches",
    "savedLocation": "Saved location",
    "home": "Home",
    "howTravelling": "How are you travelling?",
    "walk": "Walking",
    "pt": "Bus / MRT",
    "drive": "Car",
    "travelPreferences": "Your travel preferences",
    "edit": "Edit",
    "wheelchair": "Wheelchair",
    "sheltered": "Sheltered",
    "restStops": "Rest stops",
    "flatOnly": "Flat only",
    "findRoutes": "Find routes",
    "findingRoutes": "Finding routes…",
    "chooseRoute": "Choose a route",
    "myLocation": "My location",
    "sortedByBestMatch": "Sorted by best match",
    "bestMatch": "Best match",
    "flattest": "Flattest path",
    "mostRestStops": "Most rest stops",
    "quickest": "Quickest route",
    "bestForYou": "BEST FOR YOU",
    "lessSuitable": "Less suitable",
    "arrive": "arrive",
    "mostlyFlat": "Mostly flat",
    "gentleSlope": "Gentle slope",
    "steep": "Steep",
    "shelterPct": "sheltered",
    "restStopCount": "rest stop",
    "restStopCountPlural": "rest stops",
    "washroomCount": "washroom",
    "washroomCountPlural": "washrooms",
    "communityReport": "community report",
    "communityReportPlural": "community reports",
    "alongThisRoute": "along this route",
    "noReports": "0 reports",
    "bestMatch_label": "✦ BEST MATCH",
    "flattest_label": "⟷ FLATTEST PATH",
    "restStops_label": "🪑 MOST REST STOPS",
    "quickest_label": "⚡ QUICKEST",
    "terrain": "Terrain",
    "shelter": "Shelter",
    "covered": "covered",
    "alongRoute": "along route",
    "noneOnRoute": "None on route",
    "startNavigation": "Start navigation",
    "tapToChange": "My location (tap to change)",
    "searchDestination": "Search destination",
    "recent": "Recent",
    "washroom": "Washroom",
    "reportCount": "report",
    "reportCountPlural": "reports"
  },
  "onboarding": {
    "step": "Step",
    "of": "of",
    "skip": "Skip",
    "createAccount": "Create your account",
    "welcomeBack": "Welcome back",
    "saveRoutesSub": "Save your routes, bookmarks, and preferences across devices.",
    "loginSub": "Log in to access your saved routes and preferences.",
    "emailPlaceholder": "Email address",
    "passwordPlaceholder": "Password (min 6 characters)",
    "createAccountBtn": "Create account",
    "loginBtn": "Log in",
    "switchToLogin": "Already have an account? Log in",
    "switchToSignup": "Don't have an account? Sign up",
    "continueAsGuest": "Continue as guest",
    "whoUsing": "Who's using CareMap?",
    "whoUsingSub": "We'll tailor routes to the right needs",
    "caregiver": "Caregiver",
    "caregiverSub": "I help someone get around",
    "other": "Other / General",
    "otherSub": "Accessibility-conscious user",
    "continue": "Continue",
    "homeLocation": "Your home location",
    "homeLocationSub": "We'll use this as a quick-pick starting point for routes.",
    "searchHomeAddress": "Search your home address or block...",
    "saved": "Saved",
    "yourPreferences": "Your preferences",
    "yourPreferencesSub": "Change these any time in Settings.",
    "yourCompanion": "Your Companion",
    "walks": "Walks slowly or needs support",
    "walksSub": "Frail, unsteady, or easily tired",
    "wheelchair": "Uses a wheelchair",
    "wheelchairSub": "I push or guide it",
    "frame": "Uses a walking frame",
    "frameSub": "Rollator or zimmer frame",
    "scooter": "Uses a mobility scooter",
    "scooterSub": "Electric scooter or power chair",
    "routePreferences": "Route Preferences",
    "hillsSlopes": "Hills and slopes",
    "hillsSlopesSub": "Choose what suits your companion",
    "anyIsFine": "Any is fine",
    "gentleSlopes": "Gentle slopes",
    "flatOnly": "Flat only",
    "stayShelteredLabel": "Stay sheltered from rain",
    "stayShelteredSub": "Favour covered walkways and linkways",
    "restStopsLabel": "Rest stops along the way",
    "restStopsSub": "Show benches and seating on the route",
    "washroomAccessLabel": "Washroom access",
    "washroomAccessSub": "Show accessible toilets on route",
    "washroomFreqSub": "How often does your companion need one?",
    "every500m": "Every 500m",
    "every1km": "Every 1km",
    "every1_5km": "Every 1.5km",
    "saveAndStart": "Save and start"
  },
  "notes": {
    "title": "Notes",
    "subtitle": "Community-reported conditions",
    "addNote": "Add Note",
    "noNotes": "No active notes",
    "noNotesSub": "Tap Add Note above or the flag icon on the map.",
    "comment": "Comment",
    "noComments": "No comments yet. Be the first to update.",
    "commentPlaceholder": "e.g. \"Elevator still not working as of 3pm\"",
    "post": "Post"
  },
  "facilities": {
    "title": "Facilities",
    "subtitle": "Nearby facilities and services",
    "medical": "Medical",
    "community": "Community",
    "eldercare": "Eldercare",
    "daily": "Daily",
    "all": "All",
    "gpClinics": "GP Clinics",
    "polyclinics": "Polyclinics",
    "pharmacies": "Pharmacies",
    "hospitals": "Hospitals",
    "gyms": "Gyms",
    "activeSG": "ActiveSG",
    "rcCC": "RC / CC",
    "parks": "Parks",
    "sac": "SAC",
    "toilets": "Toilets",
    "supermarkets": "Supermarkets",
    "navigate": "Navigate",
    "noResults": "No facilities found",
    "noResultsSub": "Try a different filter or search term",
    "result": "result",
    "results": "results",
    "public": "Public",
    "private": "Private"
  },
  "settings": {
    "title": "Settings",
    "subtitle": "Your preferences & accessibility",
    "noPrefs": "No preferences saved yet.",
    "setupPrefs": "Set up preferences →",
    "profile": "Profile",
    "usingAs": "Using as",
    "companionAid": "Companion aid",
    "caregiver": "Caregiver",
    "generalUser": "General user",
    "walks": "Walks slowly / needs support",
    "wheelchair": "Uses a wheelchair",
    "frame": "Uses a walking frame",
    "scooter": "Uses a mobility scooter",
    "notSet": "Not set",
    "routePrefs": "Route Preferences",
    "hillsSlopes": "Hills & slopes",
    "anyIsFine": "Any is fine",
    "gentleSlopes": "Gentle slopes",
    "flatOnly": "Flat only",
    "shelteredPaths": "Sheltered paths",
    "preferred": "Preferred",
    "notRequired": "Not required",
    "restStops": "Rest stops",
    "enabled": "Enabled",
    "disabled": "Disabled",
    "washroomAccess": "Washroom access",
    "every500m": "Every 500m",
    "every1km": "Every 1km",
    "every1_5km": "Every 1.5km",
    "homeLocation": "Home Location",
    "edit": "Edit",
    "set": "Set",
    "language": "Language",
    "editAll": "Edit all preferences",
    "version": "CareMap v0.1"
  },
  "reportModal": {
    "title": "Add a note",
    "useMyLocation": "📍 Use my location",
    "searchLocation": "🔍 Search location",
    "searchPlaceholder": "Search a location...",
    "saveNote": "Save note",
    "cancel": "Cancel"
  }
}
```

### `messages/zh.json`
```json
{
  "nav": { "map": "地图", "facilities": "设施", "saved": "收藏", "notes": "笔记", "settings": "设置" },
  "map": {
    "searchPlaceholder": "您想去哪里？", "recentSearches": "最近搜索", "savedLocation": "已保存位置",
    "home": "家", "howTravelling": "您如何出行？", "walk": "步行", "pt": "公交/地铁", "drive": "驾车",
    "travelPreferences": "出行偏好", "edit": "编辑", "wheelchair": "轮椅", "sheltered": "有遮盖",
    "restStops": "休息站", "flatOnly": "仅平坦", "findRoutes": "查找路线", "findingRoutes": "查找中…",
    "chooseRoute": "选择路线", "myLocation": "我的位置", "sortedByBestMatch": "按最佳匹配排序",
    "bestMatch": "最佳匹配", "flattest": "最平坦路线", "mostRestStops": "最多休息站", "quickest": "最快路线",
    "bestForYou": "最适合您", "lessSuitable": "不太适合", "arrive": "到达", "mostlyFlat": "基本平坦",
    "gentleSlope": "缓坡", "steep": "陡坡", "shelterPct": "有遮盖", "restStopCount": "个休息站",
    "restStopCountPlural": "个休息站", "washroomCount": "个洗手间", "washroomCountPlural": "个洗手间",
    "communityReport": "条社区报告", "communityReportPlural": "条社区报告", "alongThisRoute": "沿途",
    "noReports": "0条报告", "bestMatch_label": "✦ 最佳匹配", "flattest_label": "⟷ 最平坦路线",
    "restStops_label": "🪑 最多休息站", "quickest_label": "⚡ 最快路线", "terrain": "地形", "shelter": "遮盖",
    "covered": "已覆盖", "alongRoute": "沿途", "noneOnRoute": "路线上没有", "startNavigation": "开始导航",
    "tapToChange": "我的位置（点击更改）", "searchDestination": "搜索目的地", "recent": "最近",
    "washroom": "洗手间", "reportCount": "条报告", "reportCountPlural": "条报告"
  },
  "onboarding": {
    "step": "第", "of": "步，共", "skip": "跳过", "createAccount": "创建账户", "welcomeBack": "欢迎回来",
    "saveRoutesSub": "在各设备上保存您的路线、书签和偏好设置。", "loginSub": "登录以访问您保存的路线和偏好。",
    "emailPlaceholder": "电子邮件", "passwordPlaceholder": "密码（至少6个字符）",
    "createAccountBtn": "创建账户", "loginBtn": "登录", "switchToLogin": "已有账户？登录",
    "switchToSignup": "没有账户？注册", "continueAsGuest": "以访客身份继续",
    "whoUsing": "谁在使用CareMap？", "whoUsingSub": "我们将根据需求定制路线",
    "caregiver": "照护者", "caregiverSub": "我帮助他人出行", "other": "其他/一般用户",
    "otherSub": "注重无障碍出行的用户", "continue": "继续", "homeLocation": "您的家庭位置",
    "homeLocationSub": "我们将以此作为路线的快速起始点。", "searchHomeAddress": "搜索您的家庭地址或楼栋...",
    "saved": "已保存", "yourPreferences": "您的偏好", "yourPreferencesSub": "可在设置中随时更改。",
    "yourCompanion": "您的同伴", "walks": "行走缓慢或需要支撑", "walksSub": "虚弱、不稳或容易疲劳",
    "wheelchair": "使用轮椅", "wheelchairSub": "我推或引导轮椅", "frame": "使用助行架",
    "frameSub": "助行器或zimmer架", "scooter": "使用电动代步车", "scooterSub": "电动代步车或电动轮椅",
    "routePreferences": "路线偏好", "hillsSlopes": "坡度", "hillsSlopesSub": "选择适合同伴的坡度",
    "anyIsFine": "任何都可以", "gentleSlopes": "缓坡", "flatOnly": "仅平坦",
    "stayShelteredLabel": "避免雨淋", "stayShelteredSub": "优先选择有遮盖的走道和连廊",
    "restStopsLabel": "途中休息站", "restStopsSub": "在路线上显示长椅和座位",
    "washroomAccessLabel": "洗手间", "washroomAccessSub": "在路线上显示无障碍洗手间",
    "washroomFreqSub": "同伴多久需要一次？", "every500m": "每500米", "every1km": "每1公里",
    "every1_5km": "每1.5公里", "saveAndStart": "保存并开始"
  },
  "notes": {
    "title": "笔记", "subtitle": "社区报告的情况", "addNote": "添加笔记", "noNotes": "暂无活跃笔记",
    "noNotesSub": "点击上方"添加笔记"或地图上的旗帜图标。", "comment": "评论",
    "noComments": "暂无评论。率先更新吧。", "commentPlaceholder": "例如：\"截至下午3点，电梯仍在维修\"", "post": "发布"
  },
  "facilities": {
    "title": "设施", "subtitle": "附近的设施和服务", "medical": "医疗", "community": "社区",
    "eldercare": "老年照护", "daily": "日常", "all": "全部", "gpClinics": "普通科诊所",
    "polyclinics": "综合诊疗所", "pharmacies": "药房", "hospitals": "医院", "gyms": "健身房",
    "activeSG": "ActiveSG", "rcCC": "居委会/民众联络所", "parks": "公园", "sac": "乐龄活动中心",
    "toilets": "厕所", "supermarkets": "超市", "navigate": "导航", "noResults": "未找到设施",
    "noResultsSub": "请尝试不同的筛选条件或搜索词", "result": "个结果", "results": "个结果",
    "public": "公立", "private": "私立"
  },
  "settings": {
    "title": "设置", "subtitle": "您的偏好和无障碍选项", "noPrefs": "尚未保存偏好设置。",
    "setupPrefs": "设置偏好 →", "profile": "个人资料", "usingAs": "使用身份", "companionAid": "辅助设备",
    "caregiver": "照护者", "generalUser": "一般用户", "walks": "行走缓慢/需要支撑",
    "wheelchair": "使用轮椅", "frame": "使用助行架", "scooter": "使用电动代步车", "notSet": "未设置",
    "routePrefs": "路线偏好", "hillsSlopes": "坡度", "anyIsFine": "任何都可以", "gentleSlopes": "缓坡",
    "flatOnly": "仅平坦", "shelteredPaths": "有遮盖路径", "preferred": "首选", "notRequired": "不需要",
    "restStops": "休息站", "enabled": "已启用", "disabled": "已禁用", "washroomAccess": "洗手间",
    "every500m": "每500米", "every1km": "每1公里", "every1_5km": "每1.5公里",
    "homeLocation": "家庭位置", "edit": "编辑", "set": "设置", "language": "语言",
    "editAll": "编辑所有偏好", "version": "CareMap v0.1"
  },
  "reportModal": {
    "title": "添加笔记", "useMyLocation": "📍 使用我的位置", "searchLocation": "🔍 搜索位置",
    "searchPlaceholder": "搜索位置...", "saveNote": "保存笔记", "cancel": "取消"
  }
}
```

### `messages/th.json`
```json
{
  "nav": { "map": "แผนที่", "facilities": "สิ่งอำนวยความสะดวก", "saved": "บันทึก", "notes": "บันทึกชุมชน", "settings": "การตั้งค่า" },
  "map": {
    "searchPlaceholder": "คุณต้องการไปที่ไหน?", "recentSearches": "การค้นหาล่าสุด", "savedLocation": "ตำแหน่งที่บันทึก",
    "home": "บ้าน", "howTravelling": "คุณเดินทางอย่างไร?", "walk": "เดินเท้า", "pt": "รถเมล์/MRT", "drive": "รถยนต์",
    "travelPreferences": "ความต้องการการเดินทาง", "edit": "แก้ไข", "wheelchair": "รถเข็น", "sheltered": "มีหลังคา",
    "restStops": "จุดพัก", "flatOnly": "เส้นทางราบเท่านั้น", "findRoutes": "ค้นหาเส้นทาง", "findingRoutes": "กำลังค้นหา…",
    "chooseRoute": "เลือกเส้นทาง", "myLocation": "ตำแหน่งของฉัน", "sortedByBestMatch": "เรียงตามความเหมาะสม",
    "bestMatch": "เหมาะสมที่สุด", "flattest": "ราบเรียบที่สุด", "mostRestStops": "จุดพักมากที่สุด", "quickest": "เร็วที่สุด",
    "bestForYou": "เหมาะสมที่สุดสำหรับคุณ", "lessSuitable": "ไม่ค่อยเหมาะ", "arrive": "ถึง", "mostlyFlat": "ราบเรียบส่วนใหญ่",
    "gentleSlope": "ลาดชันเล็กน้อย", "steep": "ลาดชันมาก", "shelterPct": "มีหลังคา", "restStopCount": "จุดพัก",
    "restStopCountPlural": "จุดพัก", "washroomCount": "ห้องน้ำ", "washroomCountPlural": "ห้องน้ำ",
    "communityReport": "รายงานชุมชน", "communityReportPlural": "รายงานชุมชน", "alongThisRoute": "ตามเส้นทาง",
    "noReports": "0 รายงาน", "bestMatch_label": "✦ เหมาะสมที่สุด", "flattest_label": "⟷ ราบเรียบที่สุด",
    "restStops_label": "🪑 จุดพักมากที่สุด", "quickest_label": "⚡ เร็วที่สุด", "terrain": "ภูมิประเทศ", "shelter": "ที่กำบัง",
    "covered": "มีหลังคา", "alongRoute": "ตามเส้นทาง", "noneOnRoute": "ไม่มีในเส้นทาง", "startNavigation": "เริ่มการนำทาง",
    "tapToChange": "ตำแหน่งของฉัน (แตะเพื่อเปลี่ยน)", "searchDestination": "ค้นหาปลายทาง", "recent": "ล่าสุด",
    "washroom": "ห้องน้ำ", "reportCount": "รายงาน", "reportCountPlural": "รายงาน"
  },
  "onboarding": {
    "step": "ขั้นตอนที่", "of": "จาก", "skip": "ข้าม", "createAccount": "สร้างบัญชี", "welcomeBack": "ยินดีต้อนรับกลับ",
    "saveRoutesSub": "บันทึกเส้นทาง บุ๊กมาร์ก และการตั้งค่าของคุณในทุกอุปกรณ์", "loginSub": "เข้าสู่ระบบเพื่อเข้าถึงเส้นทางและการตั้งค่าของคุณ",
    "emailPlaceholder": "อีเมล", "passwordPlaceholder": "รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)",
    "createAccountBtn": "สร้างบัญชี", "loginBtn": "เข้าสู่ระบบ", "switchToLogin": "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ",
    "switchToSignup": "ยังไม่มีบัญชี? สมัครสมาชิก", "continueAsGuest": "ดำเนินการในฐานะผู้เยี่ยมชม",
    "whoUsing": "ใครกำลังใช้ CareMap?", "whoUsingSub": "เราจะปรับแต่งเส้นทางให้เหมาะสม",
    "caregiver": "ผู้ดูแล", "caregiverSub": "ฉันช่วยผู้อื่นในการเดินทาง", "other": "อื่นๆ / ทั่วไป",
    "otherSub": "ผู้ใช้ที่ใส่ใจการเข้าถึง", "continue": "ดำเนินการต่อ", "homeLocation": "ที่อยู่บ้านของคุณ",
    "homeLocationSub": "เราจะใช้นี้เป็นจุดเริ่มต้นด่วนสำหรับเส้นทาง", "searchHomeAddress": "ค้นหาที่อยู่บ้านหรือตึก...",
    "saved": "บันทึกแล้ว", "yourPreferences": "ความต้องการของคุณ", "yourPreferencesSub": "เปลี่ยนได้ทุกเมื่อในการตั้งค่า",
    "yourCompanion": "ผู้ร่วมเดินทาง", "walks": "เดินช้าหรือต้องการการพยุง", "walksSub": "อ่อนแอ ไม่มั่นคง หรือเหนื่อยง่าย",
    "wheelchair": "ใช้รถเข็น", "wheelchairSub": "ฉันผลักหรือนำทางรถเข็น", "frame": "ใช้วอล์กเกอร์",
    "frameSub": "วอล์กเกอร์แบบล้อหรือซิมเมอร์เฟรม", "scooter": "ใช้สกู๊ตเตอร์", "scooterSub": "สกู๊ตเตอร์หรือรถเข็นไฟฟ้า",
    "routePreferences": "ความต้องการเส้นทาง", "hillsSlopes": "เนินและทางลาด", "hillsSlopesSub": "เลือกที่เหมาะกับผู้ร่วมเดินทาง",
    "anyIsFine": "อะไรก็ได้", "gentleSlopes": "ลาดชันเล็กน้อย", "flatOnly": "ราบเรียบเท่านั้น",
    "stayShelteredLabel": "มีหลังคาป้องกันฝน", "stayShelteredSub": "เลือกเส้นทางที่มีหลังคาและทางเดินมีหลังคา",
    "restStopsLabel": "จุดพักระหว่างทาง", "restStopsSub": "แสดงม้านั่งและที่นั่งบนเส้นทาง",
    "washroomAccessLabel": "การเข้าถึงห้องน้ำ", "washroomAccessSub": "แสดงห้องน้ำที่เข้าถึงได้บนเส้นทาง",
    "washroomFreqSub": "ผู้ร่วมเดินทางต้องการห้องน้ำบ่อยแค่ไหน?", "every500m": "ทุก 500 เมตร",
    "every1km": "ทุก 1 กิโลเมตร", "every1_5km": "ทุก 1.5 กิโลเมตร", "saveAndStart": "บันทึกและเริ่มต้น"
  },
  "notes": {
    "title": "บันทึก", "subtitle": "สภาพการณ์จากชุมชน", "addNote": "เพิ่มบันทึก", "noNotes": "ไม่มีบันทึกที่ใช้งานอยู่",
    "noNotesSub": "แตะ เพิ่มบันทึก ด้านบนหรือไอคอนธงบนแผนที่", "comment": "ความคิดเห็น",
    "noComments": "ยังไม่มีความคิดเห็น เป็นคนแรกที่อัปเดต", "commentPlaceholder": "เช่น \"ลิฟต์ยังไม่ทำงานจนถึงบ่าย 3 โมง\"", "post": "โพสต์"
  },
  "facilities": {
    "title": "สิ่งอำนวยความสะดวก", "subtitle": "สิ่งอำนวยความสะดวกและบริการใกล้เคียง", "medical": "การแพทย์",
    "community": "ชุมชน", "eldercare": "ดูแลผู้สูงอายุ", "daily": "ประจำวัน", "all": "ทั้งหมด",
    "gpClinics": "คลินิกแพทย์ทั่วไป", "polyclinics": "โพลีคลินิก", "pharmacies": "ร้านขายยา", "hospitals": "โรงพยาบาล",
    "gyms": "ฟิตเนส", "activeSG": "ActiveSG", "rcCC": "RC / CC", "parks": "สวนสาธารณะ", "sac": "SAC",
    "toilets": "ห้องน้ำ", "supermarkets": "ซูเปอร์มาร์เก็ต", "navigate": "นำทาง", "noResults": "ไม่พบสิ่งอำนวยความสะดวก",
    "noResultsSub": "ลองเปลี่ยนตัวกรองหรือคำค้นหา", "result": "ผลลัพธ์", "results": "ผลลัพธ์", "public": "รัฐบาล", "private": "เอกชน"
  },
  "settings": {
    "title": "การตั้งค่า", "subtitle": "ความต้องการและการเข้าถึงของคุณ", "noPrefs": "ยังไม่ได้บันทึกความต้องการ",
    "setupPrefs": "ตั้งค่าความต้องการ →", "profile": "โปรไฟล์", "usingAs": "ใช้ในฐานะ", "companionAid": "อุปกรณ์ช่วยเหลือ",
    "caregiver": "ผู้ดูแล", "generalUser": "ผู้ใช้ทั่วไป", "walks": "เดินช้า/ต้องการการพยุง",
    "wheelchair": "ใช้รถเข็น", "frame": "ใช้วอล์กเกอร์", "scooter": "ใช้สกู๊ตเตอร์", "notSet": "ยังไม่ได้ตั้งค่า",
    "routePrefs": "ความต้องการเส้นทาง", "hillsSlopes": "เนินและทางลาด", "anyIsFine": "อะไรก็ได้",
    "gentleSlopes": "ลาดชันเล็กน้อย", "flatOnly": "ราบเรียบเท่านั้น", "shelteredPaths": "เส้นทางมีหลังคา",
    "preferred": "ต้องการ", "notRequired": "ไม่จำเป็น", "restStops": "จุดพัก", "enabled": "เปิดใช้งาน",
    "disabled": "ปิดใช้งาน", "washroomAccess": "ห้องน้ำ", "every500m": "ทุก 500 เมตร",
    "every1km": "ทุก 1 กิโลเมตร", "every1_5km": "ทุก 1.5 กิโลเมตร", "homeLocation": "ที่อยู่บ้าน",
    "edit": "แก้ไข", "set": "ตั้งค่า", "language": "ภาษา", "editAll": "แก้ไขความต้องการทั้งหมด", "version": "CareMap v0.1"
  },
  "reportModal": {
    "title": "เพิ่มบันทึก", "useMyLocation": "📍 ใช้ตำแหน่งของฉัน", "searchLocation": "🔍 ค้นหาตำแหน่ง",
    "searchPlaceholder": "ค้นหาตำแหน่ง...", "saveNote": "บันทึก", "cancel": "ยกเลิก"
  }
}
```

### `messages/tl.json`
```json
{
  "nav": { "map": "Mapa", "facilities": "Mga Pasilidad", "saved": "Naka-save", "notes": "Mga Tala", "settings": "Mga Setting" },
  "map": {
    "searchPlaceholder": "Saan ka pupunta?", "recentSearches": "Mga kamakailang paghahanap", "savedLocation": "Naka-save na lokasyon",
    "home": "Tahanan", "howTravelling": "Paano ka maglalakbay?", "walk": "Paglalakad", "pt": "Bus / MRT", "drive": "Sasakyan",
    "travelPreferences": "Mga kagustuhan sa paglalakbay", "edit": "I-edit", "wheelchair": "Wheelchair",
    "sheltered": "May bubong", "restStops": "Pahingahan", "flatOnly": "Patag lamang", "findRoutes": "Maghanap ng ruta",
    "findingRoutes": "Naghahanap…", "chooseRoute": "Pumili ng ruta", "myLocation": "Aking lokasyon",
    "sortedByBestMatch": "Pinagsunod-sunod ayon sa pinakamainam", "bestMatch": "Pinakamainam", "flattest": "Pinaka-patag",
    "mostRestStops": "Maraming pahingahan", "quickest": "Pinakamabilis", "bestForYou": "PINAKAMAINAM PARA SA IYO",
    "lessSuitable": "Hindi masyadong angkop", "arrive": "Darating", "mostlyFlat": "Karamihang patag",
    "gentleSlope": "Banayad na pagtaas", "steep": "Matarik", "shelterPct": "may bubong", "restStopCount": "pahingahan",
    "restStopCountPlural": "mga pahingahan", "washroomCount": "banyo", "washroomCountPlural": "mga banyo",
    "communityReport": "ulat ng komunidad", "communityReportPlural": "mga ulat ng komunidad", "alongThisRoute": "sa rutang ito",
    "noReports": "0 ulat", "bestMatch_label": "✦ PINAKAMAINAM", "flattest_label": "⟷ PINAKA-PATAG",
    "restStops_label": "🪑 MARAMING PAHINGAHAN", "quickest_label": "⚡ PINAKAMABILIS", "terrain": "Lupain", "shelter": "Bubong",
    "covered": "may takip", "alongRoute": "sa ruta", "noneOnRoute": "Wala sa ruta", "startNavigation": "Simulan ang nabigasyon",
    "tapToChange": "Aking lokasyon (i-tap para baguhin)", "searchDestination": "Hanapin ang destinasyon", "recent": "Kamakailang",
    "washroom": "Banyo", "reportCount": "ulat", "reportCountPlural": "mga ulat"
  },
  "onboarding": {
    "step": "Hakbang", "of": "ng", "skip": "Laktawan", "createAccount": "Gumawa ng account", "welcomeBack": "Maligayang pagbabalik",
    "saveRoutesSub": "I-save ang iyong mga ruta, bookmark, at mga kagustuhan sa lahat ng device.",
    "loginSub": "Mag-login para ma-access ang iyong mga naka-save na ruta at kagustuhan.",
    "emailPlaceholder": "Email address", "passwordPlaceholder": "Password (min 6 na karakter)",
    "createAccountBtn": "Gumawa ng account", "loginBtn": "Mag-login", "switchToLogin": "May account na? Mag-login",
    "switchToSignup": "Wala pang account? Mag-sign up", "continueAsGuest": "Magpatuloy bilang panauhin",
    "whoUsing": "Sino ang gumagamit ng CareMap?", "whoUsingSub": "Ita-tailor namin ang mga ruta sa tamang pangangailangan",
    "caregiver": "Tagapag-alaga", "caregiverSub": "Tinutulungan ko ang iba na maglakbay", "other": "Iba pa / Pangkalahatan",
    "otherSub": "Gumagamit na may malasakit sa accessibility", "continue": "Magpatuloy",
    "homeLocation": "Iyong tirahan", "homeLocationSub": "Gagamitin namin ito bilang mabilis na panimulang punto para sa mga ruta.",
    "searchHomeAddress": "Hanapin ang iyong address o bloke...", "saved": "Naka-save",
    "yourPreferences": "Iyong mga kagustuhan", "yourPreferencesSub": "Maaaring baguhin anumang oras sa Mga Setting.",
    "yourCompanion": "Iyong kasama", "walks": "Mabagal maglakad o kailangan ng suporta",
    "walksSub": "Mahina, hindi matatag, o madaling mapagod", "wheelchair": "Gumagamit ng wheelchair",
    "wheelchairSub": "Itutulak o gagabayan ko ito", "frame": "Gumagamit ng walker", "frameSub": "Rollator o zimmer frame",
    "scooter": "Gumagamit ng mobility scooter", "scooterSub": "Electric scooter o power chair",
    "routePreferences": "Mga Kagustuhan sa Ruta", "hillsSlopes": "Mga burol at dalisdis",
    "hillsSlopesSub": "Piliin ang angkop para sa iyong kasama", "anyIsFine": "Kahit ano ay ayos",
    "gentleSlopes": "Banayad na dalisdis", "flatOnly": "Patag lamang",
    "stayShelteredLabel": "Manatiling protektado sa ulan", "stayShelteredSub": "Unahin ang mga may bubong na daanan",
    "restStopsLabel": "Mga pahingahan sa daan", "restStopsSub": "Ipakita ang mga bangko at upuan sa ruta",
    "washroomAccessLabel": "Access sa banyo", "washroomAccessSub": "Ipakita ang mga accessible na banyo sa ruta",
    "washroomFreqSub": "Gaano kadalas kailangan ng iyong kasama?", "every500m": "Bawat 500m",
    "every1km": "Bawat 1km", "every1_5km": "Bawat 1.5km", "saveAndStart": "I-save at simulan"
  },
  "notes": {
    "title": "Mga Tala", "subtitle": "Mga kondisyong iniulat ng komunidad", "addNote": "Magdagdag ng tala",
    "noNotes": "Walang aktibong tala", "noNotesSub": "I-tap ang Magdagdag ng tala sa itaas o ang icon ng bandila sa mapa.",
    "comment": "Komento", "noComments": "Walang komento pa. Maging una.", "commentPlaceholder": "hal. \"Hindi pa gumagana ang elevator hanggang 3pm\"", "post": "Mag-post"
  },
  "facilities": {
    "title": "Mga Pasilidad", "subtitle": "Mga pasilidad at serbisyo sa malapit", "medical": "Medikal", "community": "Komunidad",
    "eldercare": "Pag-aalaga sa Matatanda", "daily": "Pang-araw-araw", "all": "Lahat", "gpClinics": "Mga GP Clinic",
    "polyclinics": "Mga Polyclinic", "pharmacies": "Mga Botika", "hospitals": "Mga Ospital", "gyms": "Mga Gym",
    "activeSG": "ActiveSG", "rcCC": "RC / CC", "parks": "Mga Parke", "sac": "SAC", "toilets": "Mga CR",
    "supermarkets": "Mga Supermarket", "navigate": "Mag-navigate", "noResults": "Walang nahanap na pasilidad",
    "noResultsSub": "Subukan ang ibang filter o salitang hinahanap", "result": "resulta", "results": "mga resulta",
    "public": "Pampubliko", "private": "Pribado"
  },
  "settings": {
    "title": "Mga Setting", "subtitle": "Iyong mga kagustuhan at accessibility", "noPrefs": "Walang naka-save na kagustuhan.",
    "setupPrefs": "I-set up ang mga kagustuhan →", "profile": "Profile", "usingAs": "Gumagamit bilang",
    "companionAid": "Kagamitang pantulong", "caregiver": "Tagapag-alaga", "generalUser": "Pangkalahatang gumagamit",
    "walks": "Mabagal maglakad / kailangan ng suporta", "wheelchair": "Gumagamit ng wheelchair",
    "frame": "Gumagamit ng walker", "scooter": "Gumagamit ng scooter", "notSet": "Hindi nakatakda",
    "routePrefs": "Mga Kagustuhan sa Ruta", "hillsSlopes": "Mga burol at dalisdis", "anyIsFine": "Kahit ano ay ayos",
    "gentleSlopes": "Banayad na dalisdis", "flatOnly": "Patag lamang", "shelteredPaths": "Mga landas na may bubong",
    "preferred": "Ginusto", "notRequired": "Hindi kailangan", "restStops": "Mga pahingahan",
    "enabled": "Pinagana", "disabled": "Hindi pinagana", "washroomAccess": "Access sa banyo",
    "every500m": "Bawat 500m", "every1km": "Bawat 1km", "every1_5km": "Bawat 1.5km",
    "homeLocation": "Tirahan", "edit": "I-edit", "set": "I-set", "language": "Wika",
    "editAll": "I-edit ang lahat ng kagustuhan", "version": "CareMap v0.1"
  },
  "reportModal": {
    "title": "Magdagdag ng tala", "useMyLocation": "📍 Gamitin ang aking lokasyon", "searchLocation": "🔍 Maghanap ng lokasyon",
    "searchPlaceholder": "Maghanap ng lokasyon...", "saveNote": "I-save ang tala", "cancel": "Kanselahin"
  }
}
```

### `messages/ta.json`
```json
{
  "nav": { "map": "வரைபடம்", "facilities": "வசதிகள்", "saved": "சேமித்தவை", "notes": "குறிப்புகள்", "settings": "அமைப்புகள்" },
  "map": {
    "searchPlaceholder": "நீங்கள் எங்கே செல்ல விரும்புகிறீர்கள்?", "recentSearches": "சமீபத்திய தேடல்கள்",
    "savedLocation": "சேமித்த இருப்பிடம்", "home": "வீடு", "howTravelling": "நீங்கள் எப்படி பயணிக்கிறீர்கள்?",
    "walk": "நடைப்பயணம்", "pt": "பேருந்து / MRT", "drive": "கார்",
    "travelPreferences": "பயண விருப்பங்கள்", "edit": "திருத்து", "wheelchair": "சக்கர நாற்காலி",
    "sheltered": "மூடப்பட்டது", "restStops": "ஓய்வு இடங்கள்", "flatOnly": "தட்டையான மட்டுமே",
    "findRoutes": "பாதைகளை கண்டறி", "findingRoutes": "தேடுகிறோம்…", "chooseRoute": "பாதையை தேர்ந்தெடு",
    "myLocation": "என் இருப்பிடம்", "sortedByBestMatch": "சிறந்த பொருத்தத்தின்படி வரிசைப்படுத்தப்பட்டது",
    "bestMatch": "சிறந்த பொருத்தம்", "flattest": "மிகவும் தட்டையான பாதை", "mostRestStops": "அதிக ஓய்வு இடங்கள்",
    "quickest": "வேகமான பாதை", "bestForYou": "உங்களுக்கு சிறந்தது", "lessSuitable": "குறைவாக பொருத்தமானது",
    "arrive": "வருகை", "mostlyFlat": "பெரும்பாலும் தட்டையானது", "gentleSlope": "மென்மையான சரிவு",
    "steep": "செங்குத்தான சரிவு", "shelterPct": "மூடப்பட்டது", "restStopCount": "ஓய்வு இடம்",
    "restStopCountPlural": "ஓய்வு இடங்கள்", "washroomCount": "கழிவறை", "washroomCountPlural": "கழிவறைகள்",
    "communityReport": "சமூக அறிக்கை", "communityReportPlural": "சமூக அறிக்கைகள்", "alongThisRoute": "இந்த பாதையில்",
    "noReports": "0 அறிக்கைகள்", "bestMatch_label": "✦ சிறந்த பொருத்தம்", "flattest_label": "⟷ மிகவும் தட்டையானது",
    "restStops_label": "🪑 அதிக ஓய்வு இடங்கள்", "quickest_label": "⚡ வேகமானது", "terrain": "நிலப்பரப்பு",
    "shelter": "கூரை", "covered": "மூடப்பட்டது", "alongRoute": "பாதையில்", "noneOnRoute": "பாதையில் இல்லை",
    "startNavigation": "வழிகாட்டலை தொடங்கு", "tapToChange": "என் இருப்பிடம் (மாற்ற தட்டவும்)",
    "searchDestination": "இடத்தை தேடு", "recent": "சமீபத்திய", "washroom": "கழிவறை",
    "reportCount": "அறிக்கை", "reportCountPlural": "அறிக்கைகள்"
  },
  "onboarding": {
    "step": "படி", "of": "இல்", "skip": "தவிர்", "createAccount": "கணக்கை உருவாக்கு",
    "welcomeBack": "மீண்டும் வரவேற்கிறோம்",
    "saveRoutesSub": "அனைத்து சாதனங்களிலும் உங்கள் பாதைகள், புக்மார்க்குகள் மற்றும் விருப்பங்களை சேமிக்கவும்.",
    "loginSub": "உங்கள் சேமித்த பாதைகள் மற்றும் விருப்பங்களை அணுக உள்நுழைக.",
    "emailPlaceholder": "மின்னஞ்சல் முகவரி", "passwordPlaceholder": "கடவுச்சொல் (குறைந்தது 6 எழுத்துக்கள்)",
    "createAccountBtn": "கணக்கை உருவாக்கு", "loginBtn": "உள்நுழை",
    "switchToLogin": "கணக்கு இருக்கிறதா? உள்நுழை", "switchToSignup": "கணக்கு இல்லையா? பதிவு செய்",
    "continueAsGuest": "விருந்தினராக தொடர்", "whoUsing": "CareMap-ஐ யார் பயன்படுத்துகிறார்கள்?",
    "whoUsingSub": "சரியான தேவைகளுக்கு பாதைகளை தனிப்பயனாக்குவோம்",
    "caregiver": "பராமரிப்பாளர்", "caregiverSub": "நான் மற்றவர்களுக்கு பயண உதவி செய்கிறேன்",
    "other": "மற்றவை / பொதுவானது", "otherSub": "அணுகல்தன்மையில் அக்கறை கொண்ட பயனர்",
    "continue": "தொடர்", "homeLocation": "உங்கள் வீட்டு இருப்பிடம்",
    "homeLocationSub": "பாதைகளுக்கான விரைவு தொடக்க புள்ளியாக இதை பயன்படுத்துவோம்.",
    "searchHomeAddress": "உங்கள் வீட்டு முகவரி அல்லது தொகுதியை தேடுங்கள்...", "saved": "சேமிக்கப்பட்டது",
    "yourPreferences": "உங்கள் விருப்பங்கள்", "yourPreferencesSub": "அமைப்புகளில் எந்த நேரத்திலும் மாற்றலாம்.",
    "yourCompanion": "உங்கள் தோழர்", "walks": "மெதுவாக நடக்கிறார் அல்லது ஆதரவு தேவை",
    "walksSub": "பலவீனமான, நிலையற்ற, அல்லது எளிதில் சோர்வடைபவர்",
    "wheelchair": "சக்கர நாற்காலி பயன்படுத்துகிறார்", "wheelchairSub": "நான் தள்ளுகிறேன் அல்லது வழிநடத்துகிறேன்",
    "frame": "நடை சட்டகம் பயன்படுத்துகிறார்", "frameSub": "ரோலேட்டர் அல்லது சிம்மர் பிரேம்",
    "scooter": "மொபிலிட்டி ஸ்கூட்டர் பயன்படுத்துகிறார்", "scooterSub": "மின்சார ஸ்கூட்டர் அல்லது பவர் சேர்",
    "routePreferences": "பாதை விருப்பங்கள்", "hillsSlopes": "மலைகள் மற்றும் சரிவுகள்",
    "hillsSlopesSub": "உங்கள் தோழருக்கு ஏற்றதை தேர்ந்தெடுங்கள்", "anyIsFine": "எதுவும் சரி",
    "gentleSlopes": "மென்மையான சரிவுகள்", "flatOnly": "தட்டையான மட்டுமே",
    "stayShelteredLabel": "மழையிலிருந்து பாதுகாப்பாக இருங்கள்", "stayShelteredSub": "மூடப்பட்ட நடைபாதைகளை விரும்புங்கள்",
    "restStopsLabel": "வழியில் ஓய்வு இடங்கள்", "restStopsSub": "பாதையில் இருக்கைகளை காட்டு",
    "washroomAccessLabel": "கழிவறை அணுகல்", "washroomAccessSub": "பாதையில் அணுகக்கூடிய கழிவறைகளை காட்டு",
    "washroomFreqSub": "உங்கள் தோழருக்கு எவ்வளவு அடிக்கடி தேவை?", "every500m": "ஒவ்வொரு 500 மீட்டர்",
    "every1km": "ஒவ்வொரு 1 கிலோமீட்டர்", "every1_5km": "ஒவ்வொரு 1.5 கிலோமீட்டர்", "saveAndStart": "சேமித்து தொடங்கு"
  },
  "notes": {
    "title": "குறிப்புகள்", "subtitle": "சமூகம் தெரிவித்த நிலைமைகள்", "addNote": "குறிப்பு சேர்",
    "noNotes": "செயலில் உள்ள குறிப்புகள் இல்லை",
    "noNotesSub": "மேலே குறிப்பு சேர் அல்லது வரைபடத்தில் கொடி ஐகானை தட்டவும்.",
    "comment": "கருத்து", "noComments": "இன்னும் கருத்துகள் இல்லை. முதலில் புதுப்பியுங்கள்.",
    "commentPlaceholder": "எ.கா. \"மதியம் 3 மணி வரை லிஃப்ட் இன்னும் வேலை செய்யவில்லை\"", "post": "பதிவிடு"
  },
  "facilities": {
    "title": "வசதிகள்", "subtitle": "அருகிலுள்ள வசதிகள் மற்றும் சேவைகள்", "medical": "மருத்துவம்",
    "community": "சமூகம்", "eldercare": "முதியோர் பராமரிப்பு", "daily": "அன்றாடம்", "all": "அனைத்தும்",
    "gpClinics": "GP கிளினிக்கள்", "polyclinics": "பாலிகிளினிக்கள்", "pharmacies": "மருந்தகங்கள்",
    "hospitals": "மருத்துவமனைகள்", "gyms": "உடற்பயிற்சி மையங்கள்", "activeSG": "ActiveSG",
    "rcCC": "RC / CC", "parks": "பூங்காக்கள்", "sac": "SAC", "toilets": "கழிவறைகள்",
    "supermarkets": "சூப்பர்மார்க்கெட்டுகள்", "navigate": "வழிகாட்டு", "noResults": "வசதிகள் எதுவும் கிடைக்கவில்லை",
    "noResultsSub": "வேறு வடிகட்டி அல்லது தேடல் சொல்லை முயற்சிக்கவும்", "result": "முடிவு", "results": "முடிவுகள்",
    "public": "பொது", "private": "தனியார்"
  },
  "settings": {
    "title": "அமைப்புகள்", "subtitle": "உங்கள் விருப்பங்கள் மற்றும் அணுகல்தன்மை",
    "noPrefs": "இன்னும் விருப்பங்கள் சேமிக்கப்படவில்லை.", "setupPrefs": "விருப்பங்களை அமை →",
    "profile": "சுயவிவரம்", "usingAs": "பயன்படுத்துவது", "companionAid": "உதவி சாதனம்",
    "caregiver": "பராமரிப்பாளர்", "generalUser": "பொதுவான பயனர்",
    "walks": "மெதுவாக நடக்கிறார் / ஆதரவு தேவை", "wheelchair": "சக்கர நாற்காலி",
    "frame": "நடை சட்டகம்", "scooter": "மொபிலிட்டி ஸ்கூட்டர்", "notSet": "அமைக்கப்படவில்லை",
    "routePrefs": "பாதை விருப்பங்கள்", "hillsSlopes": "மலைகள் மற்றும் சரிவுகள்", "anyIsFine": "எதுவும் சரி",
    "gentleSlopes": "மென்மையான சரிவுகள்", "flatOnly": "தட்டையான மட்டுமே",
    "shelteredPaths": "மூடப்பட்ட பாதைகள்", "preferred": "விரும்பப்படுகிறது", "notRequired": "தேவையில்லை",
    "restStops": "ஓய்வு இடங்கள்", "enabled": "இயக்கப்பட்டது", "disabled": "முடக்கப்பட்டது",
    "washroomAccess": "கழிவறை அணுகல்", "every500m": "ஒவ்வொரு 500 மீ", "every1km": "ஒவ்வொரு 1 கிமீ",
    "every1_5km": "ஒவ்வொரு 1.5 கிமீ", "homeLocation": "வீட்டு இருப்பிடம்", "edit": "திருத்து",
    "set": "அமை", "language": "மொழி", "editAll": "அனைத்து விருப்பங்களையும் திருத்து", "version": "CareMap v0.1"
  },
  "reportModal": {
    "title": "குறிப்பு சேர்", "useMyLocation": "📍 என் இருப்பிடத்தை பயன்படுத்து",
    "searchLocation": "🔍 இருப்பிடத்தை தேடு", "searchPlaceholder": "இருப்பிடத்தை தேடுங்கள்...",
    "saveNote": "குறிப்பை சேமி", "cancel": "ரத்து செய்"
  }
}
```

---

## Step 3: Create i18n configuration

### `i18n/request.ts`
```typescript
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("cm_locale")?.value ?? "en";
  const validLocales = ["en", "zh", "th", "tl", "ta"];
  const resolved = validLocales.includes(locale) ? locale : "en";

  return {
    locale: resolved,
    messages: (await import(`../messages/${resolved}.json`)).default,
  };
});
```

---

## Step 4: Update `next.config.js` (or `.ts`)

Read the existing next.config file first. Then wrap it with next-intl plugin. The exact syntax depends on whether it uses CommonJS or ESM and whether next-pwa is already wrapping it.

If CommonJS with next-pwa:
```javascript
const withPWA = require("next-pwa")({ dest: "public", disable: process.env.NODE_ENV === "development" });
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

module.exports = withNextIntl(withPWA({
  // existing config options here — copy from current file
}));
```

If TypeScript ESM:
```typescript
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl({ /* existing config */ });
```

---

## Step 5: Update `app/layout.tsx`

Add `NextIntlClientProvider` so client components can use translations. Read the current layout first, then add the provider.

```typescript
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <html lang="en" className={inter.variable}>
      <head>...</head>
      <body className="font-sans bg-gray-100 antialiased">
        <NextIntlClientProvider messages={messages}>
          <div className="w-full bg-white relative overflow-hidden md:max-w-[430px] md:mx-auto md:shadow-2xl" style={{ height: "100dvh" }}>
            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## Step 6: Update each file to use translations

For EVERY file listed below, read the file first, then replace ALL hardcoded UI strings with `useTranslations`. Follow the exact pattern shown.

### Pattern for client components:
```typescript
"use client";
import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations("namespace");
  // Replace: <p>Some text</p>
  // With:    <p>{t("someText")}</p>
}
```

### Files to update:

**`components/BottomNav.tsx`** — namespace: `"nav"`
Replace each label string: `"Map"` → `t("map")`, `"Facilities"` → `t("facilities")`, etc.
The component needs `"use client"` directive and `const t = useTranslations("nav")`.

**`app/map/page.tsx`** — namespace: `"map"`
Replace ALL hardcoded strings. Key mappings:
- `"Where would you like to go?"` → `t("searchPlaceholder")`
- `"Recent searches"` → `t("recentSearches")`
- `"How are you travelling?"` → `t("howTravelling")`
- `"Walking"` → `t("walk")`, `"Bus / MRT"` → `t("pt")`, `"Car"` → `t("drive")`
- `"Your travel preferences"` → `t("travelPreferences")`
- `"Edit"` → `t("edit")`
- `"Find routes"` → `t("findRoutes")`
- `"Finding routes…"` → `t("findingRoutes")`
- `"Choose a route"` → `t("chooseRoute")`
- `"My location"` → `t("myLocation")`
- `"Sorted by best match"` → `t("sortedByBestMatch")`
- `"Best match"` → `t("bestMatch")`, `"Flattest path"` → `t("flattest")`, etc.
- `"BEST FOR YOU"` → `t("bestForYou")`
- `"Less suitable"` → `t("lessSuitable")`
- `"Mostly flat"` → `t("mostlyFlat")`, `"Gentle slope"` → `t("gentleSlope")`, `"Steep"` → `t("steep")`
- `"Start navigation"` → `t("startNavigation")`
- All plural strings for rest stops, washrooms, reports — use the count to pick singular/plural key
- `"0 reports"` → `t("noReports")`
- terrain/shelter/restStops/washroom grid labels

**`app/notes/page.tsx`** — namespace: `"notes"`
- `"Notes"` → `t("title")`
- `"Community-reported conditions"` → `t("subtitle")`
- `"Add Note"` → `t("addNote")`
- `"No active notes"` → `t("noNotes")`
- Empty state sub-text → `t("noNotesSub")`
- `"Comment"` → `t("comment")`
- `"No comments yet..."` → `t("noComments")`
- Comment placeholder → `t("commentPlaceholder")`
- `"Post"` → `t("post")`

**`app/facilities/page.tsx`** — namespace: `"facilities"`
- All category labels, sub-category labels, `"Navigate"`, `"No facilities found"`, result count, `"Public"`, `"Private"`

**`app/settings/page.tsx`** — namespace: `"settings"`
- All section headers, row labels, values (Caregiver, General user, mobility aid labels, slope labels, washroom freq labels)
- Language section stays as-is (flags/names don't need translation)

**`app/onboarding/page.tsx`** — namespace: `"onboarding"`
- All step labels, button text, option labels, descriptions, toggle labels

**`components/ReportModal.tsx`** — namespace: `"reportModal"`
- `"Add a note"` → `t("title")`
- `"Use my location"` → `t("useMyLocation")`  
- `"Search location"` → `t("searchLocation")`
- `"Save note"` → `t("saveNote")`
- `"Cancel"` → `t("cancel")`

---

## Step 7: Build and test

```bash
npx @opennextjs/cloudflare build
npx wrangler deploy
```

Test by:
1. Going to Settings
2. Tapping a non-English language
3. Navigating to Map, Notes, Facilities — all strings should change
4. Going back to Settings → English — strings revert

---

## Important notes for Claude Code

- Do NOT add a `middleware.ts` for locale routing. Cookie-based switching only.
- Do NOT add locale prefixes to any routes (`/en/map`, `/th/map` etc.)
- The `useTranslations` hook works in client components because `NextIntlClientProvider` wraps the app in layout.tsx
- For server components, use `import { getTranslations } from "next-intl/server"` instead
- All pages in this app use `"use client"` so `useTranslations` is the right hook everywhere
- If a string has a count (e.g. "1 report" vs "2 reports"), check the translation JSON for the correct key and use a ternary: `count === 1 ? t("communityReport") : t("communityReportPlural")`
- Do not change any logic, routing, or API calls — only string replacements and adding the translation hook
