"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  Server,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Activity,
} from "lucide-react";
import api from "@/lib/api";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const response = await api.get("/admin/dashboard/stats");
        setStats(response.data);
      } catch (error) {
        console.error("관리자 통계 획득 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (isLoading)
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        종합 관제 데이터를 연산 중입니다...
      </div>
    );
  if (!stats)
    return (
      <div className="p-8 text-red-500 text-center">데이터 허브 통신 실패</div>
    );

  const { summary, recent_users, recent_scans } = stats;

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-6">
      {/* 관리자 메인 타이틀 헤더 */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" /> 시스템 보안 관제 센터
            (Admin)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            플랫폼 전체 유저 활성 지표와 정적 진단 큐를 실시간 모니터링합니다.
          </p>
        </div>
        {/* 기존에 만들었던 상세 계정 관리 페이지로 이동하는 버튼 링크 */}
        <button
          onClick={() => router.push("/admin/register")} // 경로에 맞게 조율 가능
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-100 transition"
        >
          계정 발급 및 권한 설정 <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. 시스템 스코어 매트릭 보드 */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              전체 등록 유저
            </p>
            <p className="text-3xl font-black text-slate-800 mt-1">
              {summary.total_users}
              <span className="text-xs font-normal text-slate-400 ml-1">
                명
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              총 소스코드 스캔 건수
            </p>
            <p className="text-3xl font-black text-slate-800 mt-1">
              {summary.total_scans}
              <span className="text-xs font-normal text-slate-400 ml-1">
                회
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              누적 탐지 보안 취약점
            </p>
            <p className="text-3xl font-black text-rose-600 mt-1">
              {summary.total_issues}
              <span className="text-xs font-normal text-slate-400 ml-1">
                개
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. 하단 2분할 실시간 이벤트 트래킹 리스트 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 최근 가입 유저 목록 (user_id 반영) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <UserCheck className="w-4 h-4 text-emerald-500" /> 신규 등록 사용자
            계정 (최근 5건)
          </h3>
          <div className="divide-y divide-slate-100">
            {recent_users.map((user: any) => (
              <div
                key={user.user_seq}
                className="py-3 flex justify-between items-center text-sm"
              >
                <div>
                  {/* 💡 name 대신 시스템 식별자인 user_id를 뚜렷하게 노출 */}
                  <span className="font-bold text-slate-800">
                    {user.user_id}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    [{user.role}]
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 가동된 스캔 엔진 큐 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Activity className="w-4 h-4 text-indigo-500" /> 실시간 엔진 스캔
            스트림 (최근 5건)
          </h3>
          <div className="divide-y divide-slate-100">
            {recent_scans.map((scan: any) => (
              <div
                key={scan.scan_id}
                className="py-3 flex justify-between items-center text-sm"
              >
                <div className="truncate max-w-[70%]">
                  <p className="font-medium text-slate-800 truncate">
                    {scan.target_name}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    UUID: {scan.scan_id}
                  </p>
                </div>
                <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md min-w-[55px] text-center">
                  {scan.issues_count} 결함
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
