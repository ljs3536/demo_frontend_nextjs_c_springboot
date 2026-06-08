"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
export interface SbomMetadata {
  authors: string;
  timestamp: string;
  tools: string;
  lifecycles: string;
}

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
  metadata: SbomMetadata;
  threats: SbomThreat[];
}

export default function SbomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sbomData, setSbomData] = useState<SbomDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 선택된 취약점 상태 관리
  const [activeThreatId, setActiveThreatId] = useState<string | null>(null);

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
          metadata: {
            authors: rawData.metadata?.authors || "",
            timestamp:
              rawData.metadata?.timestamp || rawData.metadata?.createdAt || "",
            tools: rawData.metadata?.tools || "",
            lifecycles: rawData.metadata?.lifecycles || "",
          },
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
        // 데이터 로드 시 첫 번째 위협을 기본으로 선택
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
        "다운로드 실패: 파일 형식이 올바르지 않거나 서버에 데이터가 없습니다.",
      );
    }
  };

  const activeThreatDetail = useMemo(() => {
    return sbomData?.threats.find((t) => t.threatId === activeThreatId) || null;
  }, [sbomData, activeThreatId]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400 font-medium">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
        공급망 자산 및 SBOM 명세를 분석 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1920px] mx-auto px-4 py-6 h-[calc(100vh-2rem)] flex flex-col">
      {/* 1. 상단 타이틀 및 요약 정보 바 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/scans")}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              SBOM 분석 결과: {sbomData?.metadata?.tools || "Project"}
            </h1>
            <div className="flex gap-4 mt-1 text-xs text-slate-500 font-mono">
              <span>ID: {sbomData?.sbomId || id}</span>
              <span className="border-l border-slate-300 pl-4">
                위험도 스코어:{" "}
                <span className="font-bold text-red-500">
                  {Math.floor(sbomData?.riskScore || 0)}
                </span>
              </span>
              <span className="border-l border-slate-300 pl-4">
                컴포넌트:{" "}
                <span className="font-bold text-slate-700">
                  {sbomData?.componentCount || 0}
                </span>
              </span>
              <span className="border-l border-slate-300 pl-4">
                탐지된 위협:{" "}
                <span className="font-bold text-red-500">
                  {sbomData?.vulnerabilityCount || 0}
                </span>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleDownloadJsonReport(sbomData?.sbomId || id)}
          className="flex items-center gap-2 text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <Download className="w-4 h-4" /> 내보내기 (JSON)
        </button>
      </div>

      {/* 2. 메인 스플릿 뷰 (좌: 테이블, 우: 상세정보) */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* 좌측: 위협 목록 테이블 (약 65% 너비) */}
        <div className="w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              보안 위협 목록 ({sbomData?.threats.length || 0}건)
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-slate-200">
                <tr className="text-[11px] uppercase text-slate-500 font-bold">
                  <th className="py-3 px-4 w-24 text-center">심각도</th>
                  <th className="py-3 px-4 w-36">취약점 ID</th>
                  <th className="py-3 px-4">패키지 (컴포넌트)</th>
                  <th className="py-3 px-4 w-40">유형</th>
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
                        className={`cursor-pointer transition-colors group text-sm ${isSelected ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
                      >
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-black border ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}
                          >
                            {threat.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700 truncate">
                          {threat.threatId}
                        </td>
                        <td className="py-3 px-4 truncate">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <PackageOpen className="w-3.5 h-3.5 text-slate-400" />
                            {threat.componentName}
                            <span className="font-normal text-xs text-slate-400 ml-1 font-mono">
                              v{threat.componentVersion || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-600 truncate">
                          {threat.type}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 text-center text-slate-400 text-sm"
                    >
                      <ShieldCheck className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                      탐지된 취약점이 없습니다. 안전한 상태입니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 우측: 상세 정보 패널 (약 35% 너비) */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-y-auto">
          {activeThreatDetail ? (
            <div className="p-6 space-y-6">
              {/* 헤더 부분 */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-black border ${COLORS[activeThreatDetail.severity]?.bg} ${COLORS[activeThreatDetail.severity]?.text} ${COLORS[activeThreatDetail.severity]?.border}`}
                  >
                    {activeThreatDetail.severity}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-600">
                    {activeThreatDetail.threatId}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 break-words leading-tight">
                  {activeThreatDetail.type}
                </h2>
              </div>

              {/* 대상 컴포넌트 정보 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">
                    대상 패키지
                  </span>
                  <span className="font-bold text-slate-800">
                    {activeThreatDetail.componentName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">버전</span>
                  <span className="font-mono text-slate-700">
                    {activeThreatDetail.componentVersion || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">
                    생태계(Ecosystem)
                  </span>
                  <span className="uppercase font-bold text-blue-600">
                    {activeThreatDetail.ecosystem || "-"}
                  </span>
                </div>
              </div>

              {/* 상세 내용 (Message) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
                  <FileText className="w-4 h-4 text-slate-500" /> 상세 설명
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {activeThreatDetail.message}
                </p>
              </div>

              {/* 조치 권고 (Recommendation) */}
              {activeThreatDetail.recommendation && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <h4 className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 조치
                    권고안
                  </h4>
                  <p className="text-sm text-emerald-800 leading-relaxed font-medium">
                    {activeThreatDetail.recommendation}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full items-center justify-center text-slate-400 p-8 text-center">
              <Info className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm font-medium">
                좌측 목록에서 취약점을 선택하시면
                <br />
                상세 분석 정보가 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
