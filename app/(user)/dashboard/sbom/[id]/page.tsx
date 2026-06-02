"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  Box,
  ShieldAlert,
  Download,
  ArrowLeft,
  FileText,
  Info,
  Layers,
} from "lucide-react";
import {
  downloadSbomCycloneDx,
  getSbomDetail,
  type SbomDetailResponse,
  type SbomThreat,
} from "@/lib/api";

const COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
  INFO: "#94a3b8",
};

export default function SbomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // 상태 관리가 단 하나로 통합됨!
  const [sbomData, setSbomData] = useState<SbomDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSbomDetail(id);
        setSbomData(data);
      } catch (error) {
        console.error("SBOM 데이터 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  // 💡 원형 그래프(PieChart)용 통계 데이터 직접 계산
  const pieChartData = useMemo(() => {
    if (!sbomData?.threats) return [];

    // 심각도별 카운트 집계
    const counts: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    sbomData.threats.forEach((threat) => {
      if (counts[threat.severity] !== undefined) {
        counts[threat.severity]++;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [sbomData]);

  // 💡 메인 명세 테이블용 중복 제거된 컴포넌트 리스트 추출
  const uniqueComponents = useMemo(() => {
    if (!sbomData?.threats) return [];
    const compMap = new Map<string, SbomThreat>();

    sbomData.threats.forEach((threat) => {
      const key = `${threat.componentName}-${threat.componentVersion}`;
      if (!compMap.has(key)) compMap.set(key, threat);
    });

    return Array.from(compMap.values());
  }, [sbomData]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400 font-medium">
        공급망 자산 및 SBOM 명세를 분석 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2">
      {/* 1. 상단 타이틀 네비게이션 바 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/scans")}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              SBOM 공급망 명세서 상세보기
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Target ID: {id} | 데이터 포맷: CycloneDX (JSON)
            </p>
          </div>
        </div>

        <button
          onClick={() => downloadSbomCycloneDx(id)}
          className="flex items-center gap-2 text-xs font-bold bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition shadow-sm"
        >
          <Download className="w-4 h-4" />
          CycloneDX 내보내기
        </button>
      </div>

      {/* 2. 메인 대시보드 스플릿 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 💻 왼쪽 칼럼 */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Box className="w-4 h-4 text-slate-500" /> 구성 현황 개요
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-xs text-slate-400 block mb-1 font-medium">
                  총 컴포넌트수
                </span>
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {sbomData?.componentCount || 0}{" "}
                  <span className="text-sm font-normal text-slate-500">개</span>
                </span>
              </div>
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-center">
                <span className="text-xs text-red-500 block mb-1 font-bold">
                  보안 위협 카운트
                </span>
                <span className="text-2xl font-black text-red-600 font-mono">
                  {sbomData?.threats?.length || 0}{" "}
                  <span className="text-sm font-normal text-red-400">건</span>
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs pt-2">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">명세서 버전</span>
                <span className="font-mono font-semibold text-slate-700">
                  v{sbomData?.specVersion || "1"}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">위험도 스코어</span>
                <span className="font-bold text-red-600">
                  {sbomData?.riskScore || 0} / 100
                </span>
              </div>
            </div>
          </div>

          {/* 원형 그래프 카드 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-[340px]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" /> 취약점 연계 비율
              현황
            </h3>

            {pieChartData.length > 0 ? (
              <div className="flex-1 flex items-center justify-center mt-2">
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              COLORS[entry.name as keyof typeof COLORS] ||
                              COLORS.INFO
                            }
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          fontSize: "12px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      />
                      <Legend
                        iconSize={8}
                        layout="horizontal"
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                <Info className="w-8 h-8 text-slate-200 mb-1" />
                탐지된 라이브러리 보안 위협이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 💻 오른쪽 칼럼: 전체 컴포넌트 명세 테이블 리스트 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              탐지된 컴포넌트 마스터 명세 ({uniqueComponents.length}개 내역)
            </h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5 font-bold">패키지명</th>
                  <th className="px-6 py-3.5 font-bold">버전</th>
                  <th className="px-6 py-3.5 font-bold">생태계(Ecosystem)</th>
                  <th className="px-6 py-3.5 font-bold">라이선스/유형</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {uniqueComponents.slice(0, 20).map((comp, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-3 font-bold text-slate-900">
                      {comp.componentName}
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-mono">
                      {comp.componentVersion || "-"}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold uppercase">
                        {comp.ecosystem || "library"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-semibold">
                      N/A
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {uniqueComponents.length > 20 && (
            <div className="px-6 py-3.5 text-center text-xs text-slate-400 font-medium border-t border-slate-100 bg-slate-50/30">
              보안 무결성 검증을 위해 상위 20개 핵심 컴포넌트만 대시보드에
              스크리닝 중입니다.
            </div>
          )}
        </div>
      </div>

      {/* 3. 하단 영역: 상세 보안 취약점 연계 리스트 피드 */}
      {sbomData?.threats && sbomData.threats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              보안 취약점 탐지 상세 내역 ({sbomData.threats.length}건)
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {sbomData.threats.map((finding, idx) => {
              const themeColor =
                COLORS[finding.severity as keyof typeof COLORS] || COLORS.INFO;
              return (
                <div
                  key={idx}
                  className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="px-2 py-0.5 text-[10px] font-black rounded text-white tracking-wider"
                        style={{ backgroundColor: themeColor }}
                      >
                        {finding.severity}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {finding.componentName}{" "}
                        <span className="text-slate-400 font-mono font-normal text-xs ml-1">
                          (v{finding.componentVersion})
                        </span>
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border px-2 py-0.5 rounded-md">
                      {finding.type === "missing_license_metadata"
                        ? "컴플라이언스 준수 미흡"
                        : "보안 결함 식별"}
                    </span>
                  </div>

                  <div className="pl-2 border-l-2 border-slate-200 space-y-2 text-xs">
                    <p className="text-slate-600 font-medium leading-relaxed">
                      {finding.message}
                    </p>

                    {/* 조치 권고 사항 가이드 연계 */}
                    {finding.recommendation && (
                      <div className="text-slate-600 bg-blue-50/40 p-3 rounded-xl border border-blue-100/70 mt-1">
                        <span className="text-blue-800 font-bold block mb-0.5 text-[11px]">
                          💡 안전 패치 권고
                        </span>
                        {finding.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
