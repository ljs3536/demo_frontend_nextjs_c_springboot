"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Terminal,
  CheckCircle2,
  HelpCircle,
  Code2,
  MessageSquarePlus,
  X,
  Paperclip,
  Send,
} from "lucide-react";

type ScanTabMode = "file" | "code";

interface ScanResult {
  scan_id: string;
  target: string;
  startedAt: string;
  duration_ms: number;
  language: string;
  sbom_id?: string;
  summary: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  issues: {
    id: string;
    type_ko: string;
    severity_ko: string;
    file: string;
    confidence: number; // 💡 보통 숫자로 오므로 number로 가정 (혹은 string이면 맞춰서)
    code_snippet: string;
    line: number;
    column: number;
    message: string;
    rule_id: string;
    cwe: string;
    owasp: string;
    analyzer: string;
    detection_reason_ko: string;
    fix_description_ko: string;
    fix_code: string;
  }[];
}

export default function EnhancedScanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ScanTabMode>("file");

  const [selectedProfile, setSelectedProfile] = useState("security_core");
  const [useSbom, setUseSbom] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [pastedCode, setPastedCode] = useState("");
  const [virtualFilename, setVirtualFilename] = useState(
    "vulnerable_snippet.py",
  );

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // 아코디언 열림/닫힘 상태를 관리하기 위한 State 추가
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const [isInquiryDrawerOpen, setIsInquiryDrawerOpen] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [inquiryFile, setInquiryFile] = useState<File | null>(null);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  // 💡 [추가] 문의 전송 핸들러
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
      // 현재 보고 있는 스캔 결과의 ID를 자동으로 매핑
      formData.append("scanId", scanResult?.scan_id || "");

      if (inquiryFile) {
        formData.append("file", inquiryFile);
      }

      await api.post("/inquiries", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("오탐/장애 문의가 성공적으로 접수되었습니다.");

      // 폼 초기화 및 드로어 닫기
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

  const toggleIssue = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setScanResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setScanResult(null);
    }
  };

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

  const handleExecuteScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    setScanResult(null);
    setExpandedIssueId(null); // 스캔 시 아코디언 초기화

    try {
      let response;

      if (activeTab === "file") {
        if (selectedFiles.length === 0)
          return alert("스캔할 파일을 선택해주세요.");
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("files", file));
        formData.append("profile", selectedProfile);
        formData.append("generate_sbom", String(useSbom));

        response = await api.post("/scans/run-upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        if (!pastedCode.trim())
          return alert("분석할 코드 내용을 입력해주세요.");
        response = await api.post("/scans/run-code", {
          code: pastedCode,
          filename: virtualFilename || "snippet.py",
          profile: selectedProfile,
        });
      }
      console.log(response.data.data);
      setScanResult(response.data.data);
    } catch (error: any) {
      console.error("Scan Request Failed:", error);
      alert("스캔 수행 중 오류가 발생했습니다.");
    } finally {
      setIsScanning(false);
    }
  };

  const severityColors: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700 border-red-200",
    HIGH: "bg-orange-100 text-orange-700 border-orange-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* --- 기존 스캔 설정 및 입력 폼 영역 (생략 없이 유지) --- */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            다중 차원 보안 소스코드 스캔
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            원하는 코드를 직접 입력하거나 패키지 아카이브 파일을 업로드하여 정적
            웹 취약점 분석 엔진을 실시간 구동합니다.
          </p>
        </div>

        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === "file" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            📁 파일 업로드
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === "code" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            💻 코드 직접 입력
          </button>
        </div>

        <form onSubmit={handleExecuteScan} className="space-y-6">
          {activeTab === "file" ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50/50 hover:border-blue-400"}`}
            >
              <input
                type="file"
                id="multi-file-picker"
                className="hidden"
                multiple
                onChange={handleFileChange}
              />
              <label
                htmlFor="multi-file-picker"
                className="cursor-pointer block"
              >
                <div
                  className={`text-5xl mb-4 transition-transform ${isDragging ? "scale-110" : ""}`}
                >
                  📁
                </div>
                {selectedFiles.length > 0 ? (
                  <div className="text-blue-600 font-bold text-base">
                    {selectedFiles[0].name} 포함 총 {selectedFiles.length}개
                    업로드 대기 중
                  </div>
                ) : (
                  <p className="text-slate-600 font-medium">
                    여러 파일을 드래그하거나 클릭하여 선택하세요
                  </p>
                )}
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                  가상 파일명 설정
                </label>
                <input
                  type="text"
                  value={virtualFilename}
                  onChange={(e) => setVirtualFilename(e.target.value)}
                  placeholder="snippet.py"
                  className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                  소스코드
                </label>
                <textarea
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  className="w-full h-72 p-4 font-mono text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 bg-slate-950 text-slate-100"
                  placeholder="// 코드를 입력하세요"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex gap-6 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  스캔 프로파일
                </label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium outline-none"
                >
                  <option value="security_core">Core (CWE Top 25)</option>
                  <option value="full">Full Scan</option>
                </select>
              </div>
              {activeTab === "file" && (
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="opt-sbom"
                    checked={useSbom}
                    onChange={(e) => setUseSbom(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label
                    htmlFor="opt-sbom"
                    className="text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    📦 SBOM 연계 생성
                  </label>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isScanning}
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-40"
            >
              {isScanning ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  스캔 중...
                </>
              ) : (
                "보안 스캔 시작"
              )}
            </button>
          </div>
        </form>
      </div>

      {scanResult && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-400" /> 스캔 분석
                완료
              </h2>
              <p className="text-slate-400 text-sm mt-1 font-mono">
                ID: {scanResult.scan_id} | Target: {scanResult.target}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/scans/${scanResult.scan_id}`)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                상세 리포트 보기
              </button>
              {scanResult.sbom_id && (
                <button
                  onClick={() => router.push(`/sboms/${scanResult.sbom_id}`)}
                  className="px-4 py-2 bg-emerald-900 text-emerald-300 hover:bg-emerald-800 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  📦 SBOM 확인
                </button>
              )}

              <div className="pl-4 border-l border-slate-200">
                <button
                  onClick={() => setIsInquiryDrawerOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  오탐 및 장애 문의
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleDownloadJsonReport(scanResult.scan_id)
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  JSON
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-px bg-slate-200 border-b border-slate-200">
            <div key="Critical" className="bg-white p-4 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">
                CRITICAL
              </div>
              <div className="text-3xl font-black text-red-600">
                {scanResult.summary?.CRITICAL}
              </div>
            </div>
            <div key="HIGH" className="bg-white p-4 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">
                HIGH
              </div>
              <div className="text-3xl font-black text-orange-500">
                {scanResult.summary?.HIGH}
              </div>
            </div>
            <div key="MEDIUM" className="bg-white p-4 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">
                MEDIUM
              </div>
              <div className="text-3xl font-black text-amber-500">
                {scanResult.summary?.MEDIUM}
              </div>
            </div>
            <div key="LOW" className="bg-white p-4 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">
                LOW
              </div>
              <div className="text-3xl font-black text-blue-500">
                {scanResult.summary?.LOW}
              </div>
            </div>
          </div>

          {/* 💡 2. 확장된 아코디언 스타일 취약점 리스트 렌더링 */}
          <div className="p-0">
            {scanResult.issues?.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {scanResult.issues?.map((issue) => {
                  const isExpanded = expandedIssueId === issue.id;

                  return (
                    <div key={issue.id} className="flex flex-col">
                      {/* --- 리스트 항목 (항상 노출되는 요약부) --- */}
                      <div
                        onClick={() => toggleIssue(issue.id)}
                        className={`p-5 hover:bg-slate-50 flex gap-4 items-start cursor-pointer transition-colors ${isExpanded ? "bg-slate-50" : ""}`}
                      >
                        <div
                          className={`px-2.5 py-1 rounded text-xs font-bold border ${severityColors[issue.severity_ko] || "bg-slate-100 text-slate-700"}`}
                        >
                          {issue.severity_ko}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {issue.type_ko}
                            </h4>
                            {/* CWE/OWASP 미니 뱃지 추가 */}
                            {issue.cwe && (
                              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200 rounded">
                                {issue.cwe}
                              </span>
                            )}
                            {issue.owasp && (
                              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200 rounded">
                                {issue.owasp}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm truncate max-w-xl">
                            {issue.message}
                          </p>
                          <div className="mt-2 text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded inline-block">
                            {issue.file} : Line {issue.line}
                          </div>
                        </div>
                        <div className="text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>

                      {/* --- 확장 패널 (클릭 시 노출되는 상세 데이터) --- */}
                      {isExpanded && (
                        <div className="px-5 pb-6 pt-2 bg-slate-50 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-6">
                            {/* 왼쪽: 세부 설명 및 원인 */}
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                                  <HelpCircle className="w-3.5 h-3.5" /> 탐지
                                  사유 및 분석
                                </h5>
                                <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed shadow-sm">
                                  <p className="mb-2 font-medium">
                                    {issue.detection_reason_ko}
                                  </p>
                                  <div className="flex gap-4 text-xs mt-3 pt-3 border-t border-slate-100">
                                    <span>
                                      <span className="text-slate-400">
                                        탐지기:
                                      </span>{" "}
                                      <span className="font-mono">
                                        {issue.analyzer}
                                      </span>
                                    </span>
                                    <span>
                                      <span className="text-slate-400">
                                        규칙 ID:
                                      </span>{" "}
                                      <span className="font-mono">
                                        {issue.rule_id}
                                      </span>
                                    </span>
                                    <span>
                                      <span className="text-slate-400">
                                        확신도:
                                      </span>{" "}
                                      <span className="font-bold text-blue-600">
                                        {Number(issue.confidence) * 100}%
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 조치
                                  가이드
                                </h5>
                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-sm text-emerald-800 leading-relaxed shadow-sm">
                                  {issue.fix_description_ko}
                                </div>
                              </div>
                            </div>

                            {/* 오른쪽: 코드 증거 및 패치 코드 */}
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                                  <Terminal className="w-3.5 h-3.5" /> 발견된
                                  취약 코드
                                </h5>
                                <div className="bg-slate-900 text-rose-300 font-mono text-xs p-3 rounded-lg overflow-x-auto shadow-inner border border-slate-800">
                                  {issue.code_snippet ||
                                    "// 코드 스니펫을 불러올 수 없습니다."}
                                </div>
                              </div>

                              {issue.fix_code && (
                                <div>
                                  <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                                    <Code2 className="w-3.5 h-3.5" /> 권장 수정
                                    코드
                                  </h5>
                                  <div className="bg-slate-900 text-emerald-300 font-mono text-xs p-3 rounded-lg overflow-x-auto shadow-inner border border-slate-800">
                                    {issue.fix_code}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <ShieldAlert className="w-12 h-12 text-emerald-400 mb-3" />
                <h3 className="font-bold text-lg text-slate-700">
                  탐지된 보안 취약점이 없습니다.
                </h3>
                <p className="text-sm">입력하신 코드는 안전합니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 💡 [추가] 오른쪽 슬라이드 드로어 (오프캔버스) */}
      {isInquiryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* 1. 반투명 배경 (클릭 시 닫힘) */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsInquiryDrawerOpen(false)}
          />

          {/* 2. 우측 슬라이드 패널 */}
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            {/* 드로어 헤더 */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-blue-600" />
                  스캔 결과 문의하기
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

            {/* 드로어 바디 (폼) */}
            <form
              onSubmit={handleSubmitInquiry}
              className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5"
            >
              {/* 자동 연동 정보 (읽기 전용) */}
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-1">
                <label className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                  연동된 스캔 ID
                </label>
                <div className="text-sm font-mono text-slate-700 font-semibold">
                  {scanResult?.scan_id}
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
                  className="w-full text-black px-4 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-sans"
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

              {/* 드로어 풋터 (제출 버튼) */}
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
