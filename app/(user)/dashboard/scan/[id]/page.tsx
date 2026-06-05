"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  Info,
  CheckCircle2,
  FileCode,
  Terminal,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Brain,
  Sparkles,
  Code2,
  FileText,
  Cpu,
  MessageSquarePlus,
  X,
  Paperclip,
  Send,
  Download,
  AlertTriangle,
  Search,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import api from "@/lib/api";

type AiTaskMode = "explain" | "fix";
type AiProvider = "core" | "openai";

const COLORS = {
  CRITICAL: {
    hex: "#dc2626",
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
  },
  HIGH: {
    hex: "#ea580c",
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
  },
  MEDIUM: {
    hex: "#ca8a04",
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    border: "border-yellow-200",
  },
  LOW: {
    hex: "#2563eb",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
  },
  INFO: {
    hex: "#64748b",
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
  },
};

export interface CodeSnippetRequest {
  seq: number;
  vulnerability_type: string;
  cwe_id: string;
  severity: string;
  file_path: string;
  line_number: number;
  code_snippet: string;
  framework: string;
  language: string;
}
export default function AdvancedScanReportPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  // 데이터 상태 관리
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 선택된 이슈 관리를 위한 상태
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [activeIssueDetail, setActiveIssueDetail] = useState<any>(null); // API로 받아온 상세 정보
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // 필터 및 검색 상태
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  // AI 관련 상태
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiActiveTab, setAiActiveTab] = useState<AiTaskMode>("explain");
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("core");

  const [aiResponses, setAiResponses] = useState<{
    core: { explain: string | null; fix: string | null };
    openai: { explain: string | null; fix: string | null };
  }>({
    core: { explain: null, fix: null },
    openai: { explain: null, fix: null },
  });

  // 문의 관련 상태
  const [isInquiryDrawerOpen, setIsInquiryDrawerOpen] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [inquiryFile, setInquiryFile] = useState<File | null>(null);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryTitle.trim() || !inquiryContent.trim()) {
      return alert("제목과 내용을 모두 입력해주세요.");
    }

    setIsSubmittingInquiry(true);
    try {
      const formData = new FormData();
      formData.append("title", inquiryTitle);
      formData.append("content", inquiryContent);
      formData.append("scanId", scanId);

      if (inquiryFile) {
        formData.append("file", inquiryFile);
      }

      await api.post("/inquiries", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("오탐/장애 문의가 성공적으로 접수되었습니다.");
      setInquiryTitle("");
      setInquiryContent("");
      setInquiryFile(null);
      setIsInquiryDrawerOpen(false);
    } catch (error) {
      console.error("문의 등록 실패:", error);
      alert("문의 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  // 1. 초기 데이터 로드 (요약 및 리스트)
  useEffect(() => {
    if (!scanId) return;
    const fetchReport = async () => {
      try {
        const response = await api.post("/scans/detail", { scanId });
        const data = response.data.data || response.data;
        setReportData(data);
        console.log(data);
        // 첫 번째 아이템 자동 선택
        if (data.vulnerabilities?.length > 0) {
          handleSelectIssue(data.vulnerabilities[0].vulnerabilityId);
        }
      } catch (error) {
        console.error("리포트 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [scanId]);

  // 2. 항목 클릭 시 상세 정보 단건 조회 API 호출
  const handleSelectIssue = async (vulnerabilityId: string) => {
    if (selectedIssueId === vulnerabilityId) return; // 동일 항목 클릭 방지

    setSelectedIssueId(vulnerabilityId);
    setIsDetailLoading(true);
    setAiResponses({
      core: { explain: null, fix: null },
      openai: { explain: null, fix: null },
    });

    try {
      // 💡 진석님이 작성하신 Controller 엔드포인트 호출
      const response = await api.post("/vulnerabilities/detail", {
        vulnerabilityId: vulnerabilityId,
      });
      setActiveIssueDetail(response.data.data || response.data);
    } catch (error) {
      console.error("취약점 상세 조회 실패:", error);
      // API 실패 시 리스트의 기본 데이터라도 매핑 (임시 폴백)
      const fallback = reportData?.vulnerabilities?.find(
        (i: any) => i.vulnerabilityId === vulnerabilityId,
      );
      setActiveIssueDetail(fallback);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // 통계 데이터 산출 (차트용)
  const severityChartData = useMemo(() => {
    if (!reportData) return [];
    return [
      {
        name: "심각",
        value: reportData.issuesCritical || 0,
        color: COLORS.CRITICAL.hex,
      },
      {
        name: "높음",
        value: reportData.issuesHigh || 0,
        color: COLORS.HIGH.hex,
      },
      {
        name: "중간",
        value: reportData.issuesMedium || 0,
        color: COLORS.MEDIUM.hex,
      },
      { name: "낮음", value: reportData.issuesLow || 0, color: COLORS.LOW.hex },
    ].filter((item) => item.value > 0);
  }, [reportData]);

  // Top 5 취약점 유형 산출
  const top5Vulnerabilities = useMemo(() => {
    if (!reportData?.vulnerabilities) return [];
    const counts = reportData.vulnerabilities.reduce((acc: any, curr: any) => {
      const type = curr.typeKo || curr.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [reportData]);

  const renderAiFormattedContent = (text: string | null) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, index) => {
      let cleanedLine = line.trim();
      if (cleanedLine.startsWith("###")) {
        return (
          <h4
            key={index}
            className="text-sm font-bold text-slate-900 border-l-4 border-purple-500 pl-2 mt-4 mb-2 first:mt-1"
          >
            {cleanedLine.replace("###", "").trim()}
          </h4>
        );
      }
      if (cleanedLine.startsWith("-") || cleanedLine.startsWith("*")) {
        cleanedLine = cleanedLine.replace(/^[-*]\s*/, "");
      }
      if (cleanedLine.includes("**")) {
        const parts = cleanedLine.split("**");
        return (
          <p
            key={index}
            className="text-sm text-slate-700 my-1 leading-relaxed"
          >
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <strong
                  key={i}
                  className="font-bold text-slate-900 bg-purple-50 px-1 rounded"
                >
                  {part}
                </strong>
              ) : (
                part
              ),
            )}
          </p>
        );
      }
      if (!cleanedLine) return <div key={index} className="h-2" />;
      return (
        <p key={index} className="text-sm text-slate-600 my-1 leading-relaxed">
          {cleanedLine}
        </p>
      );
    });
  };

  const handleExecuteAiAdvisory = async (task: AiTaskMode) => {
    if (!activeIssueDetail) return;
    setIsAiLoading(true);
    setAiActiveTab(task);

    // 💡 타입을 명시하여 안전하게 페이로드 구성
    const requestPayload: CodeSnippetRequest = {
      seq: activeIssueDetail.seq ?? 0,
      vulnerability_type:
        activeIssueDetail.typeKo || activeIssueDetail.type || "Unknown",
      cwe_id: activeIssueDetail.cweId || "CWE-Unknown",
      severity: activeIssueDetail.severity || "INFO",
      file_path: activeIssueDetail.filePath || "Unknown",
      line_number: activeIssueDetail.lineNumber || 0,
      code_snippet: activeIssueDetail.codeSnippet || "",
      framework: "Unknown",
      language: reportData?.language || "Unknown",
    };

    try {
      if (selectedProvider === "core") {
        if (task === "explain") {
          // 💡 api.ts에 있던 로직을 여기에 직접 작성
          const response = await api.post(
            "/analysis/llm-explain",
            requestPayload,
          );
          const res = response.data;

          setAiResponses((prev) => ({
            ...prev,
            core: {
              ...prev.core,
              explain:
                res?.data?.content ||
                res?.data?.explanation ||
                res?.content ||
                res?.explanation ||
                "응답 데이터를 파싱할 수 없습니다.",
            },
          }));
        } else {
          // 💡 fix 로직 직접 호출
          const response = await api.post("/analysis/llm-fix", requestPayload);
          const res = response.data;

          setAiResponses((prev) => ({
            ...prev,
            core: {
              ...prev.core,
              fix:
                res?.data?.content ||
                res?.data?.fix_code ||
                res?.content ||
                res?.fix_code ||
                "응답 데이터를 파싱할 수 없습니다.",
            },
          }));
        }
      } else {
        if (task === "explain") {
          // 💡 OpenAI explain 직접 호출
          const response = await api.post(
            "/analysis/ai-explanation",
            requestPayload,
          );
          const res = response.data;

          setAiResponses((prev) => ({
            ...prev,
            openai: {
              ...prev.openai,
              explain:
                res?.data?.content ||
                res?.data ||
                res?.content ||
                "응답 데이터를 파싱할 수 없습니다.",
            },
          }));
        } else {
          // 💡 OpenAI fix 직접 호출
          const response = await api.post(
            "/analysis/fix-suggestions",
            requestPayload,
          );
          const res = response.data;

          setAiResponses((prev) => ({
            ...prev,
            openai: {
              ...prev.openai,
              fix:
                res?.data?.content ||
                res?.data ||
                res?.content ||
                "응답 데이터를 파싱할 수 없습니다.",
            },
          }));
        }
      }
    } catch (error: any) {
      console.error("AI 진단 요청 실패:", error);
      alert("AI 서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 리포트 다운로드 POST 방식 강제 다운로드 로직으로 변경 (CORS/Blob 대응)
  const handleDownloadJsonReport = async (scanId: string) => {
    try {
      const response = await api.post(
        "/scans/report",
        { scanId: scanId, format: "json", limit: 1000 },
        { responseType: "blob" }, // 💡 서버가 byte[]를 쏘면 이걸로 한 번에 받음
      );

      // 💡 서버가 보낸 순수 Blob 데이터를 바로 파일로 만듭니다.
      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `scan-report-${scanId}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      alert(
        "다운로드 실패: 파일 형식이 올바르지 않거나 서버에 데이터가 없습니다.",
      );
    }
  };

  const currentActiveContent = useMemo(() => {
    return aiResponses[selectedProvider][aiActiveTab];
  }, [aiResponses, selectedProvider, aiActiveTab]);

  // 💡 reportData.vulnerabilities 로 필터링 적용
  const filteredIssues = useMemo(() => {
    if (!reportData?.vulnerabilities) return [];
    return reportData.vulnerabilities.filter((issue: any) => {
      const matchSev =
        filterSeverity == "ALL" || issue.severityKo === filterSeverity;
      const matchSearch =
        searchKeyword === "" || issue.typeKo.includes(searchKeyword);

      return matchSev && matchSearch;
    });
  }, [reportData, filterSeverity, searchKeyword]);

  // 💡 vulnerabilityId 로 활성 이슈 찾기
  const activeIssue = useMemo(() => {
    if (!reportData?.vulnerabilities || !selectedIssueId) return null;
    return reportData.vulnerabilities.find(
      (issue: any) => issue.vulnerabilityId === selectedIssueId,
    );
  }, [reportData, selectedIssueId]);

  if (isLoading)
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        보안 진단 결과를 로드 중입니다...
      </div>
    );
  if (!reportData)
    return (
      <div className="p-8 text-center text-red-500">
        보고서 데이터를 찾을 수 없습니다.
      </div>
    );

  // 💡 동적 통계 데이터 생성 (Spring Boot ScanHistory 필드 기반)
  const severityTotals = {
    CRITICAL: reportData.issuesCritical || 0,
    HIGH: reportData.issuesHigh || 0,
    MEDIUM: reportData.issuesMedium || 0,
    LOW: reportData.issuesLow || 0,
  };
  const totalIssuesCount = Object.values(severityTotals).reduce(
    (acc, val) => acc + val,
    0,
  );

  return (
    <>
      <div className="h-[calc(100vh-2rem)] min-h-[800px] flex gap-4 p-4 max-w-[1920px] mx-auto bg-slate-100">
        {/* ==========================================
            1. 왼쪽 컬럼: 요약 정보 및 차트 (w-1/4)
        ========================================== */}
        <div className="w-1/4 flex flex-col gap-4">
          {/* 상단 프로젝트 요약 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
            {/* 헤더 부분 */}
            <div className="mb-5">
              <h1 className="text-lg font-extrabold text-slate-900 mb-1 leading-tight">
                {reportData?.target}
              </h1>
              <p className="text-xs text-slate-400 font-mono">ID: {scanId}</p>
            </div>

            {/* 스캔 개요 정보 */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">스캔 유형</span>
                <span className="text-slate-800 font-bold">
                  {reportData?.policy || "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">스캔 파일 수</span>
                <span className="text-slate-800 font-bold">
                  {reportData?.filesScanned || 0} 개
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">소요 시간</span>
                <span className="text-slate-800 font-bold">
                  {reportData?.durationMs
                    ? (reportData.durationMs / 1000).toFixed(1) + "초"
                    : "0초"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">시작 시간</span>
                <span className="text-slate-800 font-bold">
                  {reportData?.startedAt
                    ? new Date(reportData.startedAt).toLocaleString()
                    : "N/A"}
                </span>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-2 mt-auto">
              <button
                onClick={() => handleDownloadJsonReport(scanId)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" /> 보고서 다운로드
              </button>
              <button
                onClick={() => setIsInquiryDrawerOpen(true)}
                className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900 flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" /> 오탐 및 장애 문의
              </button>
            </div>
          </div>

          {/* 위험도 차트 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 위험도 분포
              현황
            </h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* 위험도 차트 하단 범례 */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {severityChartData.map((d: any) => (
                <button
                  key={d.name}
                  onClick={() =>
                    setFilterSeverity(
                      d.name === filterSeverity ? "ALL" : d.name,
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border 
        ${
          filterSeverity === d.name
            ? "bg-slate-800 text-white border-slate-800 shadow-md"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
        }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  ></div>
                  {d.name} ({d.value})
                </button>
              ))}

              {/* 전체 보기 버튼 (선택 사항) */}
              {filterSeverity !== "ALL" && (
                <button
                  onClick={() => setFilterSeverity("ALL")}
                  className="px-3 py-1 rounded-full text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  전체 보기
                </button>
              )}
            </div>
          </div>

          {/* Top 5 취약점 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> 주요 취약점
              유형 Top 5
            </h3>
            <div className="space-y-3">
              {top5Vulnerabilities.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100"
                >
                  <span className="text-xs font-semibold text-slate-700 truncate mr-2">
                    {item.name}
                  </span>
                  <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {item.count}건
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==========================================
            2. 중앙 컬럼: 코드 뷰어 & 취약점 리스트 (w-2/4)
        ========================================== */}
        <div className="w-2/4 flex flex-col gap-4">
          {/* 상단 코드 뷰어 영역 */}
          <div className="h-1/2 bg-slate-900 rounded-xl shadow-sm border border-slate-800 flex flex-col overflow-hidden relative">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
              <span className="text-xs font-mono text-slate-400">
                {activeIssueDetail
                  ? activeIssueDetail.filePath
                  : "파일을 선택해주세요"}
              </span>
              {activeIssueDetail?.lineNumber && (
                <span className="text-xs text-rose-400 font-mono bg-rose-950/50 px-2 py-0.5 rounded border border-rose-900">
                  Line: {activeIssueDetail.lineNumber}
                </span>
              )}
            </div>

            <div className="flex-1 p-4 relative">
              {isDetailLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : null}
              <textarea
                readOnly
                className="w-full h-full bg-transparent text-slate-300 font-mono text-sm resize-none outline-none"
                value={
                  activeIssueDetail?.codeSnippet ||
                  "// 소스 코드 영역입니다. 하단 리스트에서 취약점을 선택하세요."
                }
              />
            </div>
          </div>
          {/* 💡 1. 통합 컨트롤 바 (필터 & 검색) */}
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                전체{" "}
                <span className="text-blue-600">{filteredIssues.length}</span> /{" "}
                {reportData.vulnerabilities?.length || 0}건
              </span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 bg-white"
              >
                <option value="ALL">전체 위험도</option>
                <option value="심각">심각</option>
                <option value="높음">높음</option>
                <option value="중간">중간</option>
                <option value="낮음">낮음</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="취약점명, 설명 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 text-black rounded-lg outline-none focus:ring-2 focus:ring-blue-100 w-64 bg-white"
              />
            </div>
          </div>
          {/* 하단 취약점 리스트 테이블 */}
          <div className="h-1/2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-white sticky top-0 z-10 border-b-2 border-slate-200 shadow-sm">
                  <tr className="text-[11px] uppercase text-slate-500 font-bold bg-slate-50">
                    <th className="py-3 px-4 w-24 text-center">위험도</th>
                    <th className="py-3 px-4">취약점 유형</th>
                    <th className="py-3 px-4 w-32">CWE</th>
                    <th className="py-3 px-4 w-32">위치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 💡 reportData?.vulnerabilities 대신 필터링된 데이터 사용 */}
                  {filteredIssues.length > 0 ? (
                    filteredIssues.map((issue: any) => {
                      const isSelected =
                        selectedIssueId === issue.vulnerabilityId;
                      const sevColor =
                        COLORS[
                          issue.severity?.toUpperCase() as keyof typeof COLORS
                        ] || COLORS.INFO;

                      return (
                        <tr
                          key={issue.vulnerabilityId}
                          onClick={() =>
                            handleSelectIssue(issue.vulnerabilityId)
                          }
                          className={`cursor-pointer transition-colors group ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                        >
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded text-[10px] font-black border ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}
                            >
                              {issue.severityKo || issue.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 truncate">
                            <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600 truncate">
                              {issue.typeKo}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-500 truncate">
                            {issue.cweId}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-500 truncate">
                            {issue.filePath?.split("/").pop()}{" "}
                            <span className="text-slate-400">
                              :{issue.lineNumber}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center text-slate-400 text-sm"
                      >
                        조건에 일치하는 취약점이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ==========================================
            3. 오른쪽 컬럼: 상세 정보 및 AI (w-1/4)
        ========================================== */}
        <div className="w-1/4 flex flex-col gap-4 overflow-hidden h-full">
          {activeIssueDetail ? (
            <>
              {/* 상단: 상세 정보 및 조치 가이드 */}
              <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
                <h2 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                  {activeIssueDetail.typeKo}
                </h2>

                {/* 상세 정보들 */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-2">
                      <Info className="w-3.5 h-3.5 text-blue-500" /> 정밀 진단
                      원인
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {activeIssueDetail.detectionReasonKo ||
                        activeIssueDetail.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        CWE / OWASP
                      </div>
                      <div className="font-mono font-bold text-slate-800">
                        {activeIssueDetail.cweId || "N/A"}
                      </div>
                      <div className="font-bold text-slate-800">
                        {activeIssueDetail.owaspId || "N/A"}
                      </div>
                    </div>
                    <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        분석기 / 언어
                      </div>
                      <div className="font-semibold text-slate-800">
                        {activeIssueDetail.analyzer}
                      </div>
                      <div className="font-bold text-blue-600 uppercase">
                        {activeIssueDetail.language}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase">
                      탐지 확신도
                    </span>
                    <span className="font-black text-emerald-600">
                      {((activeIssueDetail.confidence || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* 조치 가이드 */}
                {activeIssueDetail.fixDescriptionKo && (
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                    <h4 className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                      시큐어 코딩 패치 권고
                    </h4>
                    <p className="text-sm text-emerald-800 leading-relaxed">
                      {activeIssueDetail.fixDescriptionKo}
                    </p>
                  </div>
                )}
              </div>
              {/* AI 보안 기능 영역 */}
              <div className="h-[500px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Brain className="w-4 h-4 text-purple-500" /> AI 보안
                  어드바이저
                </h3>

                {/* 1. 도구 선택 및 액션 버튼 (고정 영역) */}
                <div className="flex-none">
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold w-fit border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("core")}
                      className={`px-2.5 py-1 rounded-md transition ${selectedProvider === "core" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <Cpu className="w-3 h-3 inline mr-1" /> 분석기 내장 모델
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("openai")}
                      className={`px-2.5 py-1 rounded-md transition ${selectedProvider === "openai" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <Sparkles className="w-3 h-3 inline mr-1 text-indigo-500" />{" "}
                      OpenAI GPT-4o
                    </button>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleExecuteAiAdvisory("explain")}
                      disabled={isAiLoading}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg border transition shadow-sm ${aiActiveTab === "explain" && currentActiveContent ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                    >
                      <FileText className="w-3.5 h-3.5" /> 원인 심층 진단
                    </button>
                    <button
                      onClick={() => handleExecuteAiAdvisory("fix")}
                      disabled={isAiLoading}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg border transition shadow-sm ${aiActiveTab === "fix" && currentActiveContent ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                    >
                      <Code2 className="w-3.5 h-3.5" /> 시큐어 패치 코드 생성
                    </button>
                  </div>
                </div>

                {/* 2. AI 결과 렌더링 영역 (flex-1으로 유연하게 확보 + overflow-y-auto로 스크롤 활성화) */}
                {(isAiLoading || currentActiveContent) && (
                  <div
                    className={`flex-1 flex flex-col min-h-0 border rounded-2xl p-4 shadow-sm bg-gradient-to-br ${selectedProvider === "openai" ? "from-indigo-50/50 to-purple-50/30 border-indigo-100" : "from-purple-50/50 to-slate-50/30 border-purple-100"}`}
                  >
                    {/* 타이틀 영역 */}
                    <div className="flex-none flex items-center justify-between border-b pb-2 border-slate-100/50 mb-3">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
                        <Brain
                          className={`w-4 h-4 ${selectedProvider === "openai" ? "text-indigo-600" : "text-purple-600"}`}
                        />
                        <span>
                          {aiActiveTab === "explain"
                            ? "진단 브리핑"
                            : "패치 코드"}
                        </span>
                      </div>
                    </div>

                    {/* 결과 콘텐츠 영역 (여기서 스크롤 발생) */}
                    <div className="flex-1 overflow-y-auto bg-white/90 border border-white p-4 rounded-xl shadow-inner font-sans">
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-6 text-slate-400 text-xs">
                          <div
                            className={`h-6 w-6 animate-spin rounded-full border-2 border-t-transparent ${selectedProvider === "openai" ? "border-indigo-600" : "border-purple-600"}`}
                          />
                          <p className="font-medium animate-pulse">
                            분석 중입니다...
                          </p>
                        </div>
                      ) : (
                        renderAiFormattedContent(currentActiveContent)
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Code2 className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm">
                중앙의 리스트에서 항목을 선택하시면
                <br />
                상세 정보와 AI 진단이 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          4. 슬라이드 드로어 (오탐 및 장애 문의)
      ========================================== */}
      {isInquiryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsInquiryDrawerOpen(false)}
          />
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-blue-600" /> 스캔
                  결과 문의하기
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  오탐 제보나 시스템 장애에 대해 문의해주세요.
                </p>
              </div>
              <button
                onClick={() => setIsInquiryDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleSubmitInquiry}
              className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5"
            >
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-1">
                <label className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                  연동된 스캔 ID
                </label>
                <div className="text-sm font-mono text-slate-700 font-semibold">
                  {scanId}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  문의 제목
                </label>
                <input
                  type="text"
                  value={inquiryTitle}
                  onChange={(e) => setInquiryTitle(e.target.value)}
                  placeholder="예: SSRF 탐지 항목에 대한 오탐 제보합니다."
                  className="w-full px-4 text-black py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-sans"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  상세 내용
                </label>
                <textarea
                  value={inquiryContent}
                  onChange={(e) => setInquiryContent(e.target.value)}
                  placeholder="문제 상황, 오탐 근거 등 상세한 내용을 작성해주세요."
                  className="w-full flex-1 text-black min-h-[250px] p-4 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-sans resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  증빙 파일 첨부 (선택)
                </label>
                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="inquiry-file"
                    className="hidden"
                    onChange={(e) =>
                      setInquiryFile(e.target.files?.[0] || null)
                    }
                  />
                  <label
                    htmlFor="inquiry-file"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <Paperclip className="w-6 h-6 text-slate-400" />
                    {inquiryFile ? (
                      <span className="text-sm font-bold text-blue-600">
                        {inquiryFile.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">
                        클릭하여 화면 캡처 등 파일 선택
                      </span>
                    )}
                  </label>
                </div>
              </div>
              <div className="pt-6 mt-auto border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmittingInquiry}
                  className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingInquiry ? (
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> 문의 접수하기
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
