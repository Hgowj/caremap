"use client";

import { usePathname, useRouter } from "next/navigation";
import { Map, Building2, BookmarkCheck, StickyNote, Settings } from "lucide-react";

const NAV = [
  { href: "/map",        label: "Map",        icon: Map },
  { href: "/facilities", label: "Facilities",  icon: Building2 },
  { href: "/saved",      label: "Saved",       icon: BookmarkCheck },
  { href: "/notes",      label: "Notes",       icon: StickyNote },
  { href: "/settings",   label: "Settings",    icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav className="shrink-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 pb-safe"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/map" && pathname.startsWith(href));
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-xl transition-all min-w-[52px] ${
              active ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[10px] font-medium ${active ? "text-brand-600" : "text-gray-400"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}