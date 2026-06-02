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
} from "lucide-react";
import api, {
  fetchAiExplanation,
  fetchAiFix,
  fetchOpenAiExplanation,
  fetchOpenAiFix,
} from "@/lib/api";

type AiTaskMode = "explain" | "fix";
type AiProvider = "core" | "openai";

const COLORS = {
  CRITICAL: {
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    main: "#dc2626",
  },
  HIGH: {
    text: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    main: "#ea580c",
  },
  MEDIUM: {
    text: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    main: "#ca8a04",
  },
  LOW: {
    text: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    main: "#2563eb",
  },
  INFO: {
    text: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    main: "#64748b",
  },
};

export default function AdvancedScanReportPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

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

  useEffect(() => {
    if (!scanId) return;
    const fetchReport = async () => {
      try {
        // 💡 백엔드 DTO(HistoryDetailRequest)에 맞춰 scanId(카멜케이스)로 전송
        const response = await api.post("/scans/detail", {
          scanId: scanId,
        });

        // 💡 공통 응답(ApiResponse) 껍데기 벗기기
        const data = response.data.data || response.data;
        setReportData(data);

        // 💡 vulnerabilities(카멜케이스) 로 접근
        if (data.vulnerabilities?.length > 0) {
          setSelectedIssueId(data.vulnerabilities[0].vulnerabilityId);
        }
      } catch (error) {
        console.error("리포트 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [scanId]);

  useEffect(() => {
    setAiResponses({
      core: { explain: null, fix: null },
      openai: { explain: null, fix: null },
    });
  }, [selectedIssueId]);

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
    if (!activeIssue) return;
    setIsAiLoading(true);
    setAiActiveTab(task);

    // 💡 Java DTO(VulnerabilityRow) 필드명에 맞추어 페이로드 구성
    const requestPayload = {
      issue_seq: activeIssue.issueSeq || 0,
      vulnerability_type: activeIssue.typeKo || activeIssue.type,
      cwe_id: activeIssue.cweId,
      severity: activeIssue.severity,
      file_path: activeIssue.filePath,
      line_number: activeIssue.lineNumber,
      code_snippet: activeIssue.codeSnippet,
      framework: "Unknown",
      language: reportData.language || "Unknown",
    };

    try {
      if (selectedProvider === "core") {
        if (task === "explain") {
          const res = await fetchAiExplanation(requestPayload);
          setAiResponses((prev) => ({
            ...prev,
            core: {
              ...prev.core,
              explain: res.explanation || res.response || res.content,
            },
          }));
        } else {
          const res = await fetchAiFix({
            ...requestPayload,
            preserve_functionality: true,
          });
          setAiResponses((prev) => ({
            ...prev,
            core: {
              ...prev.core,
              fix: res.fix_code || res.response || res.content,
            },
          }));
        }
      } else {
        if (task === "explain") {
          const res = await fetchOpenAiExplanation(requestPayload);
          setAiResponses((prev) => ({
            ...prev,
            openai: {
              ...prev.openai,
              explain: res.explanation || res.response || res.content,
            },
          }));
        } else {
          const res = await fetchOpenAiFix({
            ...requestPayload,
            preserve_functionality: true,
          });
          setAiResponses((prev) => ({
            ...prev,
            openai: {
              ...prev.openai,
              fix: res.fix_code || res.response || res.content,
            },
          }));
        }
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        alert("AI 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      } else {
        alert(
          `${selectedProvider === "core" ? "내장 분석기" : "OpenAI"} 처리 중 오류가 발생했습니다.`,
        );
      }
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
    if (severityFilter === "ALL") return reportData.vulnerabilities;
    return reportData.vulnerabilities.filter(
      (issue: any) => issue.severity?.toUpperCase() === severityFilter,
    );
  }, [reportData, severityFilter]);

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
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* 1. 상단 미니멀 요약 바 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/scans")}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {reportData.target} {/* 💡 target 매핑 */}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              ID: {scanId} | {new Date(reportData.startedAt).toLocaleString()}
            </p>
          </div>
          <div className="pl-4 border-l border-slate-200 flex gap-2">
            <button
              onClick={() => setIsInquiryDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <MessageSquarePlus className="w-4 h-4" /> 오탐 및 장애 문의
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadJsonReport(scanId)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              JSON 다운로드
            </button>
          </div>
        </div>

        {/* 상단 미니 필터 탭 */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold">
          <button
            onClick={() => setSeverityFilter("ALL")}
            className={`px-3 py-1.5 rounded-md transition ${severityFilter === "ALL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            전체 ({totalIssuesCount})
          </button>
          {Object.entries(severityTotals).map(([sev, count]) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              disabled={count === 0}
              className={`px-3 py-1.5 rounded-md transition disabled:opacity-30 ${severityFilter === sev ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/60"}`}
            >
              {sev} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* 2. 메인 워크벤치 레이아웃 */}
      <div className="flex h-[calc(100vh-13rem)] min-h-[650px] border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        {/* 왼쪽 컬럼 */}
        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-3 border-b border-slate-200 bg-white flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Detection List ({filteredIssues.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
            {filteredIssues.map((issue: any) => {
              const isSelected = issue.vulnerabilityId === selectedIssueId;
              const sev = issue.severity?.toUpperCase() || "INFO";
              const theme = COLORS[sev as keyof typeof COLORS] || COLORS.INFO;

              return (
                <div
                  key={issue.vulnerabilityId}
                  onClick={() => setSelectedIssueId(issue.vulnerabilityId)}
                  className={`p-4 cursor-pointer transition-all flex justify-between items-start border-l-4 ${isSelected ? "bg-blue-50/50 border-blue-600 shadow-inner" : "border-transparent hover:bg-slate-50"}`}
                >
                  <div className="space-y-1 max-w-[90%]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${theme.bg} ${theme.text} border ${theme.border}`}
                      >
                        {issue.severityKo || sev}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {issue.cweId || "CWE"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {issue.typeKo || issue.type}
                    </p>
                    <p className="text-xs font-mono text-slate-400 truncate">
                      {issue.filePath?.split("/").pop()} : Line{" "}
                      {issue.lineNumber}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 mt-1 text-slate-300 transition-transform ${isSelected ? "translate-x-1 text-blue-500" : ""}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 오른쪽 컬럼 */}
        <div className="w-2/3 flex flex-col overflow-y-auto bg-slate-50/30">
          {activeIssue ? (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-2">
                    {activeIssue.typeKo || activeIssue.type}
                  </h2>
                  <p className="text-xs font-mono text-slate-400">
                    파일 경로:{" "}
                    <span className="text-slate-700 font-medium">
                      {activeIssue.filePath}
                    </span>
                  </p>

                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold mt-3 w-fit border border-slate-200">
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
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleExecuteAiAdvisory("explain")}
                    disabled={isAiLoading}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition shadow-sm ${aiActiveTab === "explain" && currentActiveContent ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                  >
                    <FileText className="w-3.5 h-3.5" /> 원인 심층 진단
                  </button>
                  <button
                    onClick={() => handleExecuteAiAdvisory("fix")}
                    disabled={isAiLoading}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition shadow-sm ${aiActiveTab === "fix" && currentActiveContent ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> 시큐어 패치 코드 생성
                  </button>
                </div>
              </div>

              {(isAiLoading || currentActiveContent) && (
                <div
                  className={`border rounded-2xl p-5 space-y-3 shadow-sm transition-all bg-gradient-to-br ${selectedProvider === "openai" ? "from-indigo-50/50 to-purple-50/30 border-indigo-100" : "from-purple-50/50 to-slate-50/30 border-purple-100"}`}
                >
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
                      <Brain
                        className={`w-4 h-4 ${selectedProvider === "openai" ? "text-indigo-600 animate-pulse" : "text-purple-600"}`}
                      />
                      <span>
                        {selectedProvider === "core"
                          ? "내장 분석기 AI 어드바이저"
                          : "OpenAI GPT-4o 시큐어 엔진"}{" "}
                        -{" "}
                        {aiActiveTab === "explain"
                          ? "진단 브리핑"
                          : "패치 코드"}
                      </span>
                    </div>
                  </div>
                  {isAiLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                      <div
                        className={`h-6 w-6 animate-spin rounded-full border-2 border-t-transparent ${selectedProvider === "openai" ? "border-indigo-600" : "border-purple-600"}`}
                      />
                      <p
                        className={`font-medium animate-pulse ${selectedProvider === "openai" ? "text-indigo-600" : "text-purple-600"}`}
                      >
                        분석 중입니다...
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/90 border border-white p-5 rounded-xl shadow-inner space-y-1 font-sans">
                      {renderAiFormattedContent(currentActiveContent)}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" /> 코드 증거
                  분석 (Code Evidence)
                </h3>
                <div className="bg-slate-950 rounded-xl border border-slate-900 shadow-lg overflow-hidden font-mono text-xs text-slate-300">
                  <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800 text-slate-500 flex justify-between">
                    <span>{activeIssue.filePath?.split("/").pop()}</span>
                    <span className="text-blue-400">
                      Line {activeIssue.lineNumber}
                    </span>
                  </div>
                  <div className="p-4 flex gap-4 bg-slate-950 leading-relaxed overflow-x-auto">
                    <div className="text-slate-600 select-none text-right pr-2 border-r border-slate-800/80">
                      <div>{activeIssue.lineNumber - 1}</div>
                      <div className="text-red-500 font-bold">
                        {activeIssue.lineNumber}
                      </div>
                      <div>{activeIssue.lineNumber + 1}</div>
                    </div>
                    <div className="w-full space-y-0.5">
                      <div className="opacity-40">// ... context snippet</div>
                      <div className="text-rose-400 bg-rose-950/40 font-bold px-2 py-0.5 rounded border border-rose-900/50 my-1 shadow-sm whitespace-pre-wrap">
                        {activeIssue.codeSnippet ||
                          "// 원천 코드를 매핑할 수 없습니다."}
                      </div>
                      <div className="opacity-40">// ... context snippet</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-500" /> 정밀 진단
                    원인
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-sans">
                    {activeIssue.detectionReasonKo || activeIssue.message}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" /> 분류
                    기준 체계
                  </h4>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div>
                      • 취약점 종류:{" "}
                      <span className="font-semibold text-slate-800">
                        {activeIssue.typeKo || activeIssue.type}
                      </span>
                    </div>
                    <div>
                      • CWE 분류 ID:{" "}
                      <span className="font-mono font-semibold text-blue-600 underline">
                        {activeIssue.cweId || "N/A"}
                      </span>
                    </div>
                    <div>
                      • OWASP 카테고리:{" "}
                      <span className="font-semibold text-slate-800">
                        {activeIssue.owaspId || "N/A"}
                      </span>
                    </div>
                    <div>
                      • 탐지 확신도 스코어:{" "}
                      <span className="font-bold text-emerald-600">
                        {activeIssue.confidence
                          ? (activeIssue.confidence * 100).toFixed(0)
                          : 100}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {activeIssue.fixCode && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{" "}
                    시큐어 코딩 패치 권고
                  </h3>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 font-sans">
                    <p className="text-xs text-slate-600 bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-100">
                      💡{" "}
                      {activeIssue.fixDescriptionKo ||
                        "아래 가이드 코드를 참고하여 안전한 코딩 표준 규칙을 준수하세요."}
                    </p>
                    <div className="bg-slate-900 text-slate-100 font-mono text-xs p-4 rounded-lg overflow-x-auto leading-relaxed border border-slate-950 shadow-inner">
                      <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">
                        // RECOMMENDED FIX PATCH CODE
                      </div>
                      <span className="text-emerald-400 whitespace-pre-wrap">
                        {activeIssue.fixCode}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400 text-sm">
              <FileCode className="w-12 h-12 text-slate-200 mb-2" />
              분석 세부 정보를 확인하려면 왼쪽 리스트에서 결함 항목을
              선택하세요.
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽 슬라이드 드로어 */}
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
    </div>
  );
}
