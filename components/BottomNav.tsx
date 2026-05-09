"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, AlertTriangle, Calendar, Settings } from "lucide-react";

const NAV = [
  { href: "/map",      label: "Navigate", Icon: Map },
  { href: "/reports",  label: "Reports",  Icon: AlertTriangle },
  { href: "/events",   label: "Events",   Icon: Calendar },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav
      className="w-full bg-white border-t border-gray-100 shrink-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {NAV.map(({ href, label, Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative ${
                active ? "text-teal-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}