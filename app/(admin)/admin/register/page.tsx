"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Shield,
  User,
  Mail,
  Calendar,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "@/lib/api";

interface AdminUserItem {
  userSeq: number;
  id: string;
  name: string;
  organization: string;
  lastLoginAt: string;
}

export default function AdminUserManagementPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // 새 계정 생성 폼 토글 및 상태 관리
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [showPassword, setShowPassword] = useState(false);

  // 유저 목록 리로드 함수
  const loadUsers = async () => {
    try {
      const response = await api.post("/members/list");
      console.log(response.data);
      setUsers(response.data.data.content);
    } catch (error: any) {
      console.error(error);
      alert(
        error.response?.data?.detail || "관리자 데이터 동기화에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 계정 생성 서브밋 핸들러
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !userId || !password)
      return alert("모든 필드를 입력해 주세요.");

    try {
      await api.post("/admin/users", {
        email: email,
        user_id: userId,
        password: password,
        role: role,
      });
      alert(`성공적으로 ${name} 계정이 발급되었습니다.`);

      // 폼 초기화 및 리로드
      setEmail("");
      setUserId("");
      setPassword("");
      setRole("USER");
      setShowForm(false);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.detail || "계정 생성에 실패했습니다.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-6">
      {/* 관리자 탑 배너 명세 */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" /> 통합 시스템 관리자 패널
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            보안 스캐너 플랫폼 계정 권한 관리를 제어합니다.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
        >
          <UserPlus className="w-4 h-4" />{" "}
          {showForm ? "생성 창 닫기" : "새로운 계정 발급"}
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* 👥 좌측 영역: 전체 사용자 계정 현황 테이블 */}
        <div
          className={`transition-all bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${showForm ? "w-2/3" : "w-full"}`}
        >
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">이메일 계정 (Email)</th>
                <th className="px-6 py-3.5">성명 (Name)</th>
                <th className="px-6 py-3.5">소속기관</th>
                <th className="px-6 py-3.5">최종 로그인일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-400">
                    계정 인벤토리를 불러오는 중...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-400">
                    등록된 유저가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.userSeq}
                    onClick={() =>
                      router.push(
                        `/admin/register/${encodeURIComponent(user.id)}`,
                      )
                    }
                    className="hover:bg-slate-50/80 transition font-sans cursor-pointer" // cursor-pointer 추가
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" /> {user.id}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-300" />{" "}
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full border">
                        {user.organization}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-300" />{" "}
                        {new Date(user.lastLoginAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 📝 우측 영역: 계정 즉시 발급 사이드 카드 (ShowForm 활성화 시 토글) */}
        {showForm && (
          <div className="w-1/3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 animate-in slide-in-from-right duration-200">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              ➕ 새로운 계정 즉시 발급
            </h3>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  사용자 아이디
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="홍길동"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 transition font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  이메일 주소 (ID 역할)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@infobi.co.kr"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 transition font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  초기 임시 비밀번호
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 transition font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  시스템 권한 등급
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="USER">USER (일반 사용자 등급)</option>
                  <option value="ADMIN">ADMIN (최고 관리자 등급)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition mt-2 shadow-sm"
              >
                시스템 계정 정식 등록
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
