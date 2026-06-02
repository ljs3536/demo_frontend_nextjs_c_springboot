"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft,
  Save,
  User,
  Building,
  Lock,
  ShieldCheck,
  Mail,
} from "lucide-react";

// DTO 규격에 맞춘 인터페이스 정의
interface UserProfile {
  userId: string;
  name: string;
  organization: string;
  role: string;
  status: string;
  lastLoginAt?: string;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();

  // URL에서 넘어온 이메일(userId) 디코딩 (예: jslee%40infob.co.kr -> jslee@infob.co.kr)
  const decodedUserId = decodeURIComponent(params.userId as string);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 수정용 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    password: "", // 빈 값이면 미변경
    status: "ACT",
  });

  useEffect(() => {
    fetchUserDetail();
  }, [decodedUserId]);

  const fetchUserDetail = async () => {
    try {
      // 관리자는 body에 userId를 담아서 특정 사용자를 조회
      const response = await api.post("/members/detail", {
        userId: decodedUserId,
      });
      const data = response.data;

      setProfile(data);
      setFormData({
        name: data.name,
        organization: data.organization || "",
        password: "", // 초기화
        status: data.status,
      });
    } catch (error) {
      console.error("사용자 정보 조회 실패:", error);
      alert("사용자 정보를 불러오는데 실패했습니다.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!confirm("사용자 정보를 수정하시겠습니까?")) return;

    try {
      const payload = {
        userId: decodedUserId,
        name: formData.name,
        organization: formData.organization,
        status: formData.status,
        ...(formData.password && { password: formData.password }), // 비밀번호가 있을 때만 포함
      };

      await api.post("/members/update", payload);
      alert("사용자 정보가 성공적으로 변경되었습니다.");
      fetchUserDetail(); // 변경된 정보 다시 불러오기
    } catch (error) {
      console.error("수정 실패:", error);
      alert("정보 수정 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mr-3" />
        정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 상단 네비게이션 */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> 목록으로 돌아가기
        </button>
        <button
          onClick={handleUpdate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" /> 저장하기
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* 헤더 프로필 영역 */}
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              {profile.name}{" "}
              <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                {profile.role}
              </span>
            </h1>
            <div className="text-slate-500 mt-2 flex items-center gap-2 font-mono text-sm">
              <Mail className="w-4 h-4" /> {profile.userId}
            </div>
          </div>
          {profile.lastLoginAt && (
            <div className="text-right text-xs text-slate-400">
              최근 접속일: <br />
              <span className="font-mono">
                {new Date(profile.lastLoginAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 수정 폼 영역 */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 이름 입력 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <User className="w-4 h-4 text-slate-400" /> 이름
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="이름을 입력하세요"
              />
            </div>

            {/* 소속 입력 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Building className="w-4 h-4 text-slate-400" /> 소속 기관
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) =>
                  setFormData({ ...formData, organization: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="예: 인포비정보기술"
              />
            </div>

            {/* 비밀번호 변경 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Lock className="w-4 h-4 text-slate-400" /> 비밀번호 변경
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                placeholder="변경시에만 입력하세요 (공백 유지 시 미변경)"
              />
            </div>

            {/* 계정 상태 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-slate-400" /> 계정 상태
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="ACT">활성 (ACT)</option>
                <option value="STP">정지 (STP)</option>
                <option value="PNDNG">승인 대기 (PNDNG)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
