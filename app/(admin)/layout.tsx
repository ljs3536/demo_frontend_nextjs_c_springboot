"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  LayoutDashboard,
  UserPlus,
  LogOut,
  User,
  Menu,
  X,
  LayersPlus,
  FileBoxIcon,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminId, setAdminId] = useState("");

  // 1. 클라이언트 사이드 권한 검증 (일반 유저 유입 방어)
  useEffect(() => {
    const role = localStorage.getItem("role");
    const storedId = localStorage.getItem("user_id");

    // if (role !== "ADMIN") {
    //   alert("관리자 권한이 필요한 페이지입니다.");
    //   router.push("/dashboard"); // 일반 사용자 대시보드로 리다이렉트
    // } else {
    setIsAuthorized(true);
    if (storedId) setAdminId(storedId);
    // }
  }, [router]);

  // 로그아웃 처리
  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        권한을 확인 중입니다...
      </div>
    );
  }

  // 내비게이션 메뉴 정의
  const menuItems = [
    { name: "관제 대시보드", href: "/admin", icon: LayoutDashboard },
    { name: "계정 발급 관리", href: "/admin/register", icon: UserPlus },
    { name: "문의 내역", href: "/admin/inquiry", icon: LayersPlus },
    { name: "공지 사항", href: "/admin/notice", icon: FileBoxIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      {/* 📁 1. 좌측 고정 사이드바 (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* 사이드바 상단 로고 영역 */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-800 bg-slate-950">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="font-black text-sm tracking-wider text-white uppercase">
              Core Scanner Admin
            </span>
          </div>

          {/* 내비게이션 링크 루프 */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "hover:bg-slate-800 hover:text-slate-100 text-slate-400"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 사이드바 하단 관리자 프로필 정보 탭 */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Administrator
              </p>
              <p className="text-sm font-bold text-slate-300 truncate">
                {adminId || "Admin User"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 💻 2. 우측 메인 콘텐츠 영역 (Main Content Wrapper) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 우측 상단 유틸리티 글로벌 바 (Top Global Bar) */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
              System Mode
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 로그아웃 액션 버튼 */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        </header>

        {/* 하위 내부 동적 페이지 콘텐츠 스크롤 뷰 */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
