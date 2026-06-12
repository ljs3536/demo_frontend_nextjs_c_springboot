"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 💡 로그인 없이 접근 가능한 '공개 페이지' 목록
  const publicPaths = ["/login", "/signup", "/"];

  useEffect(() => {
    // 1. 토큰 확인
    const token = localStorage.getItem("access_token");
    const isPublicPath = publicPaths.includes(pathname);

    if (!token && !isPublicPath) {
      // 2. 비로그인 사용자가 보호된 페이지 접근 시 튕겨냄
      alert("로그인이 필요한 서비스입니다.");
      router.push("/");
    } else if (token && pathname === "/") {
      // 3. 이미 로그인한 사용자가 로그인 페이지로 오면 대시보드로 보냄
      router.push("/dashboard");
    } else {
      // 4. 정상적인 접근인 경우 화면을 렌더링하도록 허용
      setIsAuthorized(true);
    }
  }, [pathname, router]);

  // 검증이 끝나기 전까지는 화면을 렌더링하지 않음 (깜빡임 방지)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        보안 검증 중...
      </div>
    );
  }

  return <>{children}</>;
}
