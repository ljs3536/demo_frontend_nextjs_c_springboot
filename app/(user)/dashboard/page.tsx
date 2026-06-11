"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ShieldAlert,
  FileSearch,
  MessageSquareWarning,
  Activity,
  FileCode2,
  Bell,
  HelpCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// --- 백엔드 DTO 매핑 인터페이스 ---
interface ScanStatistics {
  issuesCritical: number;
  issuesHigh: number;
  issuesMedium: number;
  issuesLow: number;
  scanCountByLanguage: { language: string; scanCount: number }[];
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

  // 💡 상태를 데이터 도메인별로 분리하여 관리
  const [stats, setStats] = useState<ScanStatistics | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 💡 Promise.all을 활용한 병렬 API 호출 (로딩 시간 단축)
        // 실제 백엔드 엔드포인트 URL에 맞춰 수정이 필요할 수 있습니다.
        const [statsRes, noticeRes, inquiryRes] = await Promise.all([
          api.post("/scans/statistics"), // 새로 만든 통계 API (최근 30일)
          api.post("/notices/list", { outputCount: 5 }), // 공지사항 API (예시)
          api.post("/inquiries/list", { outputCount: 5 }), // 문의내역 API (예시)
        ]);
        console.log(statsRes.data.data);
        console.log(noticeRes.data.data);
        console.log(inquiryRes.data.data);
        // 응답 데이터 세팅 (ApiResponse 래핑 여부에 따라 .data.data 처리)
        const statsData = statsRes.data?.data || statsRes.data;
        setStats(statsData);

        const noticeData = noticeRes.data?.data || noticeRes.data;
        setNotices(noticeData?.content || []); // .content를 명시적으로 지정

        const inquiryData = inquiryRes.data?.data || inquiryRes.data;
        setInquiries(inquiryData?.content || []); // .content를 명시적으로 지정
      } catch (error) {
        console.error("대시보드 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 💡 파이 차트용 언어 분포 데이터 가공
  const languageDistribution = useMemo(() => {
    if (!stats?.scanCountByLanguage) return [];

    return stats.scanCountByLanguage
      .map((item) => ({
        name: item.language || "Unknown",
        value: Number(item.scanCount || 0), // 💡 무조건 숫자로 강제 변환
      }))
      .filter((item) => item.value > 0); // 💡 값이 0인 항목은 파이 차트에서 그릴 수 없으므로 제외
  }, [stats]);

  // 💡 총 스캔 횟수 계산 (언어별 스캔 횟수의 합)
  const totalScans = useMemo(() => {
    if (!stats?.scanCountByLanguage) return 0;
    return stats.scanCountByLanguage.reduce(
      (acc, curr) => acc + curr.scanCount,
      0,
    );
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mr-3" />
        대시보드 데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* --- 헤더 영역 --- */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" /> 통합 보안 관제 대시보드
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          최근 30일간의 스캔 통계 및 프로젝트 보안 상태를 요약합니다.
        </p>
      </div>

      {/* --- 상단: 통계 요약 카드 (Grid 4열) --- */}
      {/* 백엔드 StatisticsResponse 데이터(Critical, High 등)를 직관적으로 배치 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<FileSearch className="w-6 h-6 text-blue-600" />}
          title="최근 30일 스캔 횟수"
          value={totalScans}
          subtitle="언어별 누적 스캔 건수"
          bgColor="bg-blue-50"
          borderColor="border-blue-100"
        />
        <SummaryCard
          icon={<ShieldAlert className="w-6 h-6 text-red-600" />}
          title="치명적 (Critical) 결함"
          value={stats?.issuesCritical || 0}
          subtitle="즉시 조치 필요"
          bgColor="bg-red-50"
          borderColor="border-red-100"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
          title="고위험 (High) 결함"
          value={stats?.issuesHigh || 0}
          subtitle="빠른 시일 내 패치 권고"
          bgColor="bg-orange-50"
          borderColor="border-orange-100"
        />
        <SummaryCard
          icon={<Info className="w-6 h-6 text-amber-600" />}
          title="중/저위험 (Med/Low)"
          value={(stats?.issuesMedium || 0) + (stats?.issuesLow || 0)}
          subtitle="일반적인 보안 경고 합계"
          bgColor="bg-amber-50"
          borderColor="border-amber-100"
        />
      </div>

      {/* --- 중앙: 언어 분포 파이 차트 --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <FileCode2 className="w-5 h-5 text-indigo-500" /> 프로젝트 언어별 스캔
          분포 (최근 30일)
        </h3>

        {/* 💡 핵심 수정 1: flex-1 min-h-[300px] 대신 명시적인 고정 높이 부여 */}
        <div className="h-[300px] w-full">
          {languageDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  // 💡 핵심 수정 2: Next.js 렌더링 버그를 막기 위해 초기 애니메이션 비활성화
                  isAnimationActive={false}
                >
                  {languageDistribution.map((entry, index) => (
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

      {/* --- 하단: 최근 공지사항 & 문의 내역 (Grid 2열) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시스템 공지사항 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" /> 시스템 공지사항
            </h3>
            <button
              onClick={() => router.push("/notice")}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              전체보기
            </button>
          </div>
          <div className="space-y-2">
            {notices.length > 0 ? (
              notices.slice(0, 5).map((notice: any, idx: number) => (
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
                새로운 공지사항이 없습니다.
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
            {inquiries.length > 0 ? (
              inquiries.slice(0, 5).map((inquiry: any, idx: number) => (
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
