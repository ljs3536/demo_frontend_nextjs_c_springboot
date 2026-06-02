"use client"; // 상태 관리와 이벤트 헨들러를 쓰기 위해 클라이언트 컴포넌트로 선언

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // 1. FastAPI 로그인 엔드포인트 호출
      const response = await api.post("/auth/login", {
        id: userId,
        password: password,
      });

      // 2. 토큰 및 권한 정보를 로컬 스토리지에 저장
      console.log(response);
      localStorage.setItem("access_token", response.data.data.jwtToken);
      localStorage.setItem("userId", userId);
      localStorage.setItem("role", response.data.data.role);
      localStorage.setItem("status", response.data.data.userStatus);

      // 💡 3. 권한(Role)에 따른 동적 페이지 이동 처리
      const userRole = response.data.role?.toUpperCase();

      if (userRole === "ADMIN") {
        // 관리자는 전체 통계 메인 관제 화면으로 이동
        router.push("/admin");
      } else {
        // 일반 사용자는 개인 스캔 대시보드로 이동
        router.push("/dashboard");
      }
    } catch (error: any) {
      // 에러 처리
      if (error.response?.status === 401) {
        setErrorMsg("아이디 또는 비밀번호가 일치하지 않습니다.");
      } else {
        setErrorMsg("서버와 연결할 수 없습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">데모</h1>
          <p className="text-slate-500 mt-2">
            베타 테스터 계정으로 로그인해주세요
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              아이디
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="아이디 입력"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="비밀번호 입력"
              required
            />
          </div>

          {errorMsg && (
            <div className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-blue-400"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
