"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  Layers,
  LogOut,
  Cpu,
  User,
  LayersPlus,
  FileBoxIcon,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: "대시보드", href: "/dashboard", icon: LayoutDashboard },
    { name: "소스코드 스캔", href: "/scan", icon: Shield },
    { name: "스캔 내역", href: "/scans", icon: Layers },
    { name: "문의 내역", href: "/inquiry", icon: LayersPlus },
    { name: "공지 사항", href: "/notice", icon: FileBoxIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 h-screen flex flex-col fixed left-0 top-0 text-slate-300">
      {/* 로고 영역 */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-blue-400">
          <Cpu className="w-6 h-6" />
          <span className="font-bold text-white tracking-tight">
            Security Platform
          </span>
        </div>
      </div>

      {/* 메뉴 영역 */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              pathname === item.href
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* 하단 로그아웃 */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => {
            localStorage.clear();
            router.push("/");
          }}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-400 hover:text-red-400 transition"
        >
          <LogOut className="w-5 h-5" /> 로그아웃
        </button>
      </div>
    </aside>
  );
}
