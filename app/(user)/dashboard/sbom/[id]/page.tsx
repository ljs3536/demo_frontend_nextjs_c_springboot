"use client";

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
  Download,
  ArrowLeft,
  FileText,
  Info,
  Layers,
  ShieldCheck,
  CheckCircle2,
  PackageOpen,
  Scale,
  Activity,
  ShieldAlert,
} from "lucide-react";
import api from "@/lib/api";

const COLORS = {
  CRITICAL: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    hex: "#ef4444",
  },
  HIGH: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
    hex: "#f97316",
  },
  MEDIUM: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-200",
    hex: "#eab308",
  },
  LOW: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    hex: "#3b82f6",
  },
  INFO: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    hex: "#94a3b8",
  },
};

// --- 인터페이스 정의 ---
export interface SbomThreat {
  threatId: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  componentRef: string;
  componentName: string;
  componentVersion?: string | null;
  ecosystem: string;
  message: string;
  recommendation?: string;
}

export interface SbomDetailResponse {
  sbomId: string;
  status: string;
  format: string;
  specVersion: string;
  ecosystems: string;
  componentCount: number;
  licenseCount: number;
  vulnerabilityCount: number;
  riskScore: number;
  threats: SbomThreat[];
}

export default function SbomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sbomData, setSbomData] = useState<SbomDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeThreatId, setActiveThreatId] = useState<string | null>(null);

  // 💡 다운로드 로딩 상태 추가
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.post("/sbom/detail", { sbomId: `${id}` });
        const rawData = response.data.data ? response.data.data : response.data;

        const mappedData: SbomDetailResponse = {
          sbomId: rawData.sbom_id || rawData.metadata?.sbomId,
          status: rawData.status || rawData.metadata?.status,
          format: rawData.format || rawData.metadata?.format,
          specVersion: rawData.spec_version || rawData.metadata?.specVersion,
          ecosystems: rawData.ecosystems || rawData.metadata?.ecosystems,
          componentCount:
            rawData.component_count || rawData.metadata?.componentCount || 0,
          licenseCount:
            rawData.license_count || rawData.metadata?.licenseCount || 0,
          vulnerabilityCount:
            rawData.vulnerability_count ||
            rawData.metadata?.vulnerabilityCount ||
            0,
          riskScore: rawData.risk_score || rawData.metadata?.riskScore || 0,
          threats: (rawData.threats || []).map((t: any) => ({
            threatId: t.id || t.threatId,
            type: t.type,
            severity: t.severity || "INFO",
            componentRef: t.component_ref || t.componentRef,
            componentName: t.component_name || t.componentName,
            componentVersion: t.component_version || t.componentVersion,
            ecosystem: t.ecosystem,
            message: t.message,
            recommendation: t.recommendation,
          })),
        };

        setSbomData(mappedData);
        if (mappedData.threats.length > 0) {
          setActiveThreatId(mappedData.threats[0].threatId);
        }
      } catch (error) {
        console.error("SBOM 데이터 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleDownloadJsonReport = async (sbomId: string) => {
    //  다운로드 시작 시 로딩 상태 true로 변경
    setIsDownloading(true);
    try {
      const response = await api.post(
        "/sbom/report",
        { sbomId: sbomId },
        { responseType: "blob" },
      );
      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `scan-report-${sbomId}.cdx.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      alert(
        "다운로드 실패: 서버에 데이터가 없거나 파일 형식이 올바르지 않습니다.",
      );
    } finally {
      // 💡 다운로드 완료/실패 시 상태 복구
      setIsDownloading(false);
    }
  };

  const pieChartData = useMemo(() => {
    if (!sbomData?.threats) return [];
    const counts: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    sbomData.threats.forEach((threat) => {
      if (counts[threat.severity] !== undefined) counts[threat.severity]++;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [sbomData]);

  const activeThreatDetail = useMemo(() => {
    return sbomData?.threats.find((t) => t.threatId === activeThreatId) || null;
  }, [sbomData, activeThreatId]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 font-medium bg-slate-50">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
        공급망 자산 및 SBOM 명세를 분석 중입니다...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] max-w-[1920px] mx-auto p-4 flex flex-col gap-4 bg-slate-50/50">
      {/* 1. 상단 네비게이션 및 타이틀 바 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/scans")}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              공급망 보안 분석(SBOM) 결과
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Target ID: {sbomData?.sbomId || id} | 포맷:{" "}
              {sbomData?.format || "CycloneDX"}
            </p>
          </div>
        </div>

        {/* 2. 로딩 상태에 따른 버튼 변경 */}
        <button
          onClick={() => void handleDownloadJsonReport(sbomData?.sbomId || id)}
          disabled={isDownloading}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm ${
            isDownloading
              ? "bg-slate-700 text-slate-300 cursor-not-allowed"
              : "bg-slate-800 text-white hover:bg-slate-900"
          }`}
        >
          {isDownloading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
              다운로드 중...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> 리포트 내보내기
            </>
          )}
        </button>
      </div>

      {/* 2. 메인 스플릿 뷰 */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* ========================================================= */}
        {/* 3. 좌측 영역 구조 변경 (테이블 영역만 스크롤 되도록 flex-col 최적화) */}
        {/* ========================================================= */}
        <div className="w-2/3 flex flex-col gap-4 h-full overflow-hidden">
          {/* A. 4대 핵심 요약 지표 (고정 크기: shrink-0) */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">
                  구성요소 개수
                </span>
                <Box className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-800 font-mono">
                {sbomData?.componentCount || 0}{" "}
                <span className="text-sm font-medium text-slate-400">개</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <div className="flex items-center justify-between mb-2 pl-2">
                <span className="text-xs font-bold text-red-600">
                  취약점 발견
                </span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-black text-red-600 font-mono pl-2">
                {sbomData?.vulnerabilityCount || 0}{" "}
                <span className="text-sm font-medium text-red-400">건</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">
                  라이선스 (종류)
                </span>
                <Scale className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-800 font-mono">
                {sbomData?.licenseCount || 0}{" "}
                <span className="text-sm font-medium text-slate-400">종</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">
                  공급망 위험도
                </span>
                <Activity className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-600 font-mono">
                {Math.floor(sbomData?.riskScore || 0)}{" "}
                <span className="text-sm font-medium text-slate-400">
                  / 100
                </span>
              </div>
            </div>
          </div>

          {/* B. 심각도 분포 차트 (고정 크기: shrink-0) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 shrink-0 flex flex-col h-[280px]">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> 위협 심각도
              분포 현황
            </h3>
            {pieChartData.length > 0 ? (
              <div className="flex-1 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            COLORS[entry.name as keyof typeof COLORS]?.hex ||
                            COLORS.INFO.hex
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
                      iconSize={10}
                      layout="horizontal"
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: "12px", fontWeight: "bold" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                분포를 표시할 위협 데이터가 없습니다.
              </div>
            )}
          </div>

          {/* C. 위협 목록 테이블 (유동 크기: flex-1, 내부에만 스크롤 생성) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* 고정 헤더 영역 */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" /> 탐지된 위협 상세
                목록
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                총 {sbomData?.threats.length || 0}건
              </span>
            </div>

            {/* 리스트 영역 */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-white sticky top-0 border-b border-slate-200 shadow-sm">
                  <tr className="text-[11px] uppercase text-slate-500 font-bold bg-slate-50/50">
                    <th className="py-3 px-4 w-24 text-center">심각도</th>
                    <th className="py-3 px-4 w-40">취약점 ID</th>
                    <th className="py-3 px-4">패키지명 (버전)</th>
                    <th className="py-3 px-4 w-48">유형</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sbomData?.threats && sbomData.threats.length > 0 ? (
                    sbomData.threats.map((threat) => {
                      const isSelected = activeThreatId === threat.threatId;
                      const sevColor = COLORS[threat.severity] || COLORS.INFO;

                      return (
                        <tr
                          key={threat.threatId}
                          onClick={() => setActiveThreatId(threat.threatId)}
                          className={`cursor-pointer transition-colors text-sm ${isSelected ? "bg-blue-50/60 border-l-2 border-l-blue-500" : "hover:bg-slate-50 border-l-2 border-l-transparent"}`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-1 rounded text-[10px] font-black border ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}
                            >
                              {threat.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs font-bold text-slate-700 truncate">
                            {threat.threatId}
                          </td>
                          <td className="py-2.5 px-4 truncate">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <PackageOpen className="w-3.5 h-3.5 text-slate-400" />
                              {threat.componentName}
                              <span className="font-normal text-[11px] text-slate-400 ml-1 font-mono">
                                v{threat.componentVersion || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-xs font-medium text-slate-600 truncate">
                            {threat.type}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-16 text-center text-slate-400 text-sm"
                      >
                        탐지된 취약점이 없습니다. 안전한 상태입니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 우측 영역: 상세 정보 패널 */}
        {/* ========================================================= */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
          {activeThreatDetail ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wider border ${COLORS[activeThreatDetail.severity]?.bg} ${COLORS[activeThreatDetail.severity]?.text} ${COLORS[activeThreatDetail.severity]?.border}`}
                  >
                    {activeThreatDetail.severity}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {activeThreatDetail.threatId}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                  {activeThreatDetail.type}
                </h2>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden text-sm">
                <div className="grid grid-cols-3 border-b border-slate-100">
                  <div className="col-span-1 bg-slate-100/50 p-3 text-xs font-bold text-slate-500 flex items-center">
                    대상 컴포넌트
                  </div>
                  <div className="col-span-2 p-3 font-bold text-slate-800">
                    {activeThreatDetail.componentName}
                  </div>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100">
                  <div className="col-span-1 bg-slate-100/50 p-3 text-xs font-bold text-slate-500 flex items-center">
                    버전 정보
                  </div>
                  <div className="col-span-2 p-3 font-mono font-medium text-slate-700">
                    {activeThreatDetail.componentVersion || "N/A"}
                  </div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="col-span-1 bg-slate-100/50 p-3 text-xs font-bold text-slate-500 flex items-center">
                    생태계 (Env)
                  </div>
                  <div className="col-span-2 p-3 font-bold text-blue-600 uppercase">
                    {activeThreatDetail.ecosystem || "-"}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2.5">
                  <Info className="w-4 h-4 text-blue-500" /> 상세 탐지 원인
                </h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed shadow-sm">
                  {activeThreatDetail.message}
                </div>
              </div>

              {activeThreatDetail.recommendation && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2.5 mt-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 보안
                    패치 권고안
                  </h4>
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-sm text-emerald-800 leading-relaxed font-medium">
                    {activeThreatDetail.recommendation}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30">
              <Info className="w-12 h-12 mb-4 text-slate-200" />
              <p className="text-sm font-medium">
                좌측 위협 목록에서 항목을 선택하시면
                <br />
                상세 분석 정보가 이 영역에 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
