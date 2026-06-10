"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ShieldAlert,
  FileSearch,
  MessageSquareWarning,
  PackageSearch,
  Activity,
  Layers,
  FileCode2,
  Bell, // 💡 추가된 아이콘 (공지사항)
  HelpCircle, // 💡 추가된 아이콘 (문의)
  CheckCircle2, // 💡 상태 표시용 아이콘
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// --- 백엔드 DTO와 매핑되는 인터페이스 정의 ---
interface DashboardData {
  summary: {
    totalScans: number;
    totalVulnerabilities: number;
    pendingInquiries: number;
    totalSboms: number;
  };
  languageDistribution: { name: string; value: number }[];
  sbomInsights: {
    totalComponents: number;
    totalLicenses: number;
    averageRiskScore: number;
  };
  recentScans: any[];
  recentNotices: any[]; // 💡 추가됨
  recentInquiries: any[]; // 💡 추가됨
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/dashboard");
        setData(response.data.data);
      } catch (error) {
        console.error("대시보드 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mr-3" />
        대시보드 데이터를 불러오는 중입니다...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* --- 헤더 영역 --- */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" /> 통합 보안 관제 대시보드
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          프로젝트의 전반적인 보안 상태와 취약점 현황을 요약합니다.
        </p>
      </div>

      {/* --- 상단: 종합 요약 카드 (Grid 4열) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<FileSearch className="w-6 h-6 text-blue-600" />}
          title="총 스캔 횟수"
          value={data.summary?.totalScans}
          subtitle="누적된 전체 스캔 건수"
          bgColor="bg-blue-50"
          borderColor="border-blue-100"
        />
        <SummaryCard
          icon={<ShieldAlert className="w-6 h-6 text-rose-600" />}
          title="발견된 주요 취약점"
          value={data.summary?.totalVulnerabilities}
          subtitle="Critical & High 등급 합계"
          bgColor="bg-rose-50"
          borderColor="border-rose-100"
        />
        <SummaryCard
          icon={<PackageSearch className="w-6 h-6 text-emerald-600" />}
          title="관리 중인 SBOM"
          value={data.summary?.totalSboms}
          subtitle="생성 및 추적 중인 SBOM"
          bgColor="bg-emerald-50"
          borderColor="border-emerald-100"
        />
        <SummaryCard
          icon={<MessageSquareWarning className="w-6 h-6 text-amber-600" />}
          title="답변 대기 문의"
          value={data.summary?.pendingInquiries}
          subtitle="처리되지 않은 문의 수"
          bgColor="bg-amber-50"
          borderColor="border-amber-100"
        />
      </div>

      {/* --- 중앙: 언어 분포 & SBOM 리스크 & 스캔 내역 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 언어 분포 파이 차트 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-indigo-500" /> 언어별 스캔 분포
          </h3>
          <div className="flex-1 min-h-[250px]">
            {data.languageDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.languageDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.languageDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                스캔 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 중앙~우측: SBOM 인사이트 및 활동 */}
        <div className="lg:col-span-2 space-y-6">
          {/* SBOM 미니 대시보드 */}
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 text-white relative overflow-hidden">
            <Layers className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-800/50" />
            <h3 className="font-bold text-slate-100 mb-6 flex items-center gap-2 relative z-10">
              <PackageSearch className="w-5 h-5 text-emerald-400" />{" "}
              공급망(SBOM) 보안 리스크 요약
            </h3>
            <div className="grid grid-cols-3 gap-4 relative z-10">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-xs font-semibold mb-1">
                  식별된 컴포넌트
                </div>
                <div className="text-2xl font-black text-white">
                  {data.sbomInsights?.totalComponents.toLocaleString()}개
                </div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-xs font-semibold mb-1">
                  감지된 라이선스
                </div>
                <div className="text-2xl font-black text-white">
                  {data.sbomInsights?.totalLicenses.toLocaleString()}종
                </div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-xs font-semibold mb-1">
                  평균 위험도 (0-10)
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {data.sbomInsights?.averageRiskScore}
                </div>
              </div>
            </div>
          </div>

          {/* 최근 스캔 내역 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">최근 스캔 내역</h3>
              <button
                onClick={() => router.push("/scan")}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                전체보기
              </button>
            </div>
            <div className="space-y-3">
              {data.recentScans && data.recentScans.length > 0 ? (
                data.recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/scan/${scan.scanId}`)
                    }
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-800">
                        {scan.target}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(scan.startedAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                      위험 {scan.issuesCritical + scan.issuesHigh}건
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-sm text-slate-400">
                  최근 진행된 스캔이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- 💡 5. 하단: 최근 공지사항 & 문의 내역 (Grid 2열) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시스템 공지사항 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" /> 최근 공지사항
            </h3>
            <button
              onClick={() => router.push("/notice")}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              전체보기
            </button>
          </div>
          <div className="space-y-2">
            {data.recentNotices && data.recentNotices.length > 0 ? (
              data.recentNotices.map((notice, idx) => (
                <div
                  key={idx}
                  onClick={() => router.push(`/notice/${notice.noticeSeq}`)}
                  className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <div className="truncate pr-4 font-medium text-sm text-slate-700">
                    {notice.title}
                  </div>
                  <div className="text-xs text-slate-400 shrink-0 font-mono">
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-slate-400">
                등록된 공지사항이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 내 문의 내역 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-500" /> 내 문의 내역
            </h3>
            <button
              onClick={() => router.push("/inquiry")}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              전체보기
            </button>
          </div>
          <div className="space-y-3">
            {data.recentInquiries && data.recentInquiries.length > 0 ? (
              data.recentInquiries.map((inquiry, idx) => (
                <div
                  key={idx}
                  onClick={() => router.push(`/inquiry/${inquiry.inquirySeq}`)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors cursor-pointer"
                >
                  <div className="shrink-0">
                    {inquiry.status === "CMPLT" ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                        <CheckCircle2 className="w-3 h-3" /> 답변완료
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">
                        <Clock className="w-3 h-3" /> 접수대기
                      </span>
                    )}
                  </div>
                  <div className="truncate flex-1 font-medium text-sm text-slate-700">
                    {inquiry.title}
                  </div>
                  <div className="text-xs text-slate-400 shrink-0 font-mono">
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-slate-400">
                최근 등록한 문의가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 공통 카드 컴포넌트 ---
function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  bgColor,
  borderColor,
}: any) {
  return (
    <div
      className={`p-6 rounded-2xl shadow-sm border ${borderColor} bg-white flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgColor}`}>{icon}</div>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-800 mb-1">
          {value ? value.toLocaleString() : 0}
        </div>
        <div className="font-bold text-slate-700 text-sm">{title}</div>
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
