"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Search,
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
    confidence: number;
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

  // 💡 [추가] 코드 직접 입력 시 언어 선택 상태
  const [selectedLanguage, setSelectedLanguage] = useState("python");

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const [isInquiryDrawerOpen, setIsInquiryDrawerOpen] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [inquiryFile, setInquiryFile] = useState<File | null>(null);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  // 💡 [추가] 필터 및 검색 상태
  const [filterFile, setFilterFile] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [filterAnalyzer, setFilterAnalyzer] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 💡 [추가] 필터 옵션 동적 추출 (셀렉트 박스용)
  const filterOptions = useMemo(() => {
    if (!scanResult?.issues) return { files: [], analyzers: [] };
    const files = Array.from(
      new Set(scanResult.issues.map((i) => i.file)),
    ).filter(Boolean);
    const analyzers = Array.from(
      new Set(scanResult.issues.map((i) => i.analyzer)),
    ).filter(Boolean);
    return { files, analyzers };
  }, [scanResult]);

  // 💡 [추가] 다중 조건 필터링 적용된 이슈 리스트
  const filteredIssues = useMemo(() => {
    if (!scanResult?.issues) return [];
    return scanResult.issues.filter((issue) => {
      const matchFile = filterFile === "ALL" || issue.file === filterFile;
      const matchSev =
        filterSeverity === "ALL" || issue.severity_ko === filterSeverity;
      const matchAnalyzer =
        filterAnalyzer === "ALL" || issue.analyzer === filterAnalyzer;
      const matchSearch =
        searchKeyword === "" ||
        issue.type_ko?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        issue.message?.toLowerCase().includes(searchKeyword.toLowerCase());

      return matchFile && matchSev && matchAnalyzer && matchSearch;
    });
  }, [scanResult, filterFile, filterSeverity, filterAnalyzer, searchKeyword]);

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
      formData.append("scanId", scanResult?.scan_id || "");

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
        { scanId: scanId, format: "json" },
        { responseType: "blob" },
      );

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
    setExpandedIssueId(null);

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

        // 💡 [수정] 코드 스캔 시 language 데이터 추가 전송
        response = await api.post("/scans/run-code", {
          code: pastedCode,
          filename: virtualFilename || "snippet.py",
          profile: selectedProfile,
          language: selectedLanguage,
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
    심각: "bg-red-200 text-red-700 border-red-200",
    높음: "bg-orange-200 text-orange-700 border-orange-200",
    중간: "bg-amber-200 text-amber-700 border-amber-200",
    낮음: "bg-blue-200 text-blue-700 border-blue-200",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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
              {/* 💡 [수정] 가상 파일명과 언어 선택을 나란히 배치 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    가상 파일명 설정
                  </label>
                  <input
                    type="text"
                    value={virtualFilename}
                    onChange={(e) => setVirtualFilename(e.target.value)}
                    placeholder="snippet.py"
                    className="w-full px-4 py-2.5 text-black text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    언어 선택
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 text-black focus:ring-blue-100 bg-white"
                  >
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="go">Go</option>
                    <option value="cpp">C/C++</option>
                    <option value="php">PHP</option>
                  </select>
                </div>
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
                  className="text-xs text-black bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium outline-none"
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 상단 헤더 영역 */}
          <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-500" /> 스캔 분석
                완료
              </h2>
              <p className="text-slate-500 text-sm mt-1.5 font-mono bg-slate-50 inline-block px-2.5 py-1 rounded-md border border-slate-100">
                ID: {scanResult.scan_id} | Target: {scanResult.target}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/scans/${scanResult.scan_id}`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
              >
                상세 리포트
              </button>
              {scanResult.sbom_id && (
                <button
                  onClick={() => router.push(`/sboms/${scanResult.sbom_id}`)}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                >
                  SBOM 확인
                </button>
              )}

              <div className="pl-4 ml-2 border-l border-slate-200 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInquiryDrawerOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold transition-all shadow-sm"
                >
                  <MessageSquarePlus className="w-4 h-4" /> 문의
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleDownloadJsonReport(scanResult.scan_id)
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" /> JSON
                </button>
              </div>
            </div>
          </div>
          {/* 3. 통계 영역: 띄어쓰기(gap)와 둥근 모서리(rounded-xl)를 적용한 개별 카드 스타일 */}
          <div className="p-6 bg-slate-50/50 border-b border-slate-200">
            <div className="grid grid-cols-5 gap-5">
              <div
                key="All"
                className="bg-white border border-red-100 shadow-sm rounded-xl p-5 text-center"
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-2 text-black">
                  전체
                </div>
                <div className="text-4xl font-black text-black">
                  {scanResult.summary?.CRITICAL +
                    scanResult.summary?.HIGH +
                    scanResult.summary?.MEDIUM +
                    scanResult.summary?.LOW}
                </div>
              </div>
              <div
                key="Critical"
                className="bg-white border border-red-100 shadow-sm rounded-xl p-5 text-center"
              >
                <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
                  심각
                </div>
                <div className="text-4xl font-black text-red-600">
                  {scanResult.summary?.CRITICAL}
                </div>
              </div>
              <div
                key="HIGH"
                className="bg-white border border-orange-100 shadow-sm rounded-xl p-5 text-center"
              >
                <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
                  높음
                </div>
                <div className="text-4xl font-black text-orange-500">
                  {scanResult.summary?.HIGH}
                </div>
              </div>
              <div
                key="MEDIUM"
                className="bg-white border border-amber-100 shadow-sm rounded-xl p-5 text-center"
              >
                <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
                  보통
                </div>
                <div className="text-4xl font-black text-amber-500">
                  {scanResult.summary?.MEDIUM}
                </div>
              </div>
              <div
                key="LOW"
                className="bg-white border border-blue-100 shadow-sm rounded-xl p-5 text-center"
              >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  낮음
                </div>
                <div className="text-4xl font-black text-blue-500">
                  {scanResult.summary?.LOW}
                </div>
              </div>
            </div>
          </div>
          {/* 💡 1. 통합 컨트롤 바 (필터 & 검색) */}
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                전체{" "}
                <span className="text-blue-600">{filteredIssues.length}</span> /{" "}
                {scanResult.issues?.length || 0}건
              </span>

              <select
                value={filterFile}
                onChange={(e) => setFilterFile(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 bg-white"
              >
                <option value="ALL">📄 전체 파일</option>
                {filterOptions.files.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 bg-white"
              >
                <option value="ALL">전체 심각도</option>
                <option value="심각">심각</option>
                <option value="높음">높음</option>
                <option value="보통">보통</option>
                <option value="낮음">낮음</option>
              </select>

              <select
                value={filterAnalyzer}
                onChange={(e) => setFilterAnalyzer(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 bg-white"
              >
                <option value="ALL">전체 분석기</option>
                {filterOptions.analyzers.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
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

          {/* 💡 2. 데이터 테이블 영역 */}
          <div className="bg-white overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-white sticky top-0 z-10 border-b-2 border-slate-200 shadow-sm">
                {/* 💡 1. 컬럼 헤더를 목업과 동일하게 재배치 */}
                <tr className="text-xs uppercase text-slate-500 font-bold">
                  <th className="py-3 px-6 w-24 min-w-[90px] text-center">
                    심각도
                  </th>
                  <th className="py-3 px-6 w-36">분석기</th>
                  <th className="py-3 px-6">취약점 유형</th>
                  <th className="py-3 px-6 w-32">CWE</th>
                  <th className="py-3 px-6 w-24">라인</th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => {
                    const isExpanded = expandedIssueId === issue.id;
                    return (
                      <React.Fragment key={issue.id}>
                        {/* 💡 부모 행 (토글 클릭 영역) */}
                        <tr
                          onClick={() => toggleIssue(issue.id)}
                          className={`cursor-pointer transition-colors group ${isExpanded ? "bg-blue-50/40" : "hover:bg-slate-50"}`}
                        >
                          <td className="py-4 px-6 whitespace-nowrap text-center">
                            <span
                              className={`px-3 py-1.5 inline-block rounded text-[11px] font-black border ${severityColors[issue.severity_ko] || "bg-slate-100 text-slate-700"}`}
                            >
                              {issue.severity_ko}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs font-medium text-slate-500 truncate">
                            {issue.analyzer}
                          </td>
                          <td className="py-4 px-6 font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {issue.type_ko}
                          </td>
                          <td className="py-4 px-6">
                            {issue.cwe && (
                              <span className="px-2 py-1 text-[11px] font-mono bg-slate-100 text-slate-500 border border-slate-200 rounded">
                                {issue.cwe}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-sm font-mono text-slate-600">
                            {issue.line}
                          </td>
                          <td className="py-4 px-4 text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </td>
                        </tr>

                        {/* 💡 자식 행 (아코디언 펼침 영역) */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={6}
                              className="p-0 border-b border-slate-200"
                            >
                              <div className="px-8 py-6 bg-slate-50 shadow-inner">
                                {/* 💡 2. 파일 경로: 확장 영역 최상단에 바코드/브레드크럼 느낌으로 배치 */}
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/70">
                                  <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                    Target File
                                  </span>
                                  <span className="text-sm font-mono text-slate-700 font-semibold break-all">
                                    {issue.file}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                  {/* 좌측: 원인 및 조치 가이드 */}
                                  <div className="space-y-5">
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
                                        <HelpCircle className="w-3.5 h-3.5 text-blue-500" />{" "}
                                        상세 메시지 및 탐지 사유
                                      </h5>
                                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed shadow-sm">
                                        {/* 💡 3. 메시지: 핵심 내용이므로 파란색 왼쪽 띠(Border-left)를 주어 강조 */}
                                        <p className="mb-4 font-semibold text-slate-900 border-l-2 border-blue-500 pl-3 py-0.5 bg-blue-50/30">
                                          {issue.message}
                                        </p>
                                        <p className="mb-3 font-medium text-slate-600">
                                          {issue.detection_reason_ko}
                                        </p>
                                        <div className="flex gap-4 text-xs pt-3 border-t border-slate-100">
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
                                            <span className="font-bold text-emerald-600">
                                              {Number(issue.confidence) * 100}%
                                            </span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{" "}
                                        조치 가이드
                                      </h5>
                                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-sm text-emerald-800 leading-relaxed shadow-sm">
                                        {issue.fix_description_ko}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 우측: 코드 스니펫 */}
                                  <div className="space-y-5">
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
                                        <Terminal className="w-3.5 h-3.5 text-rose-500" />{" "}
                                        발견된 취약 코드
                                      </h5>
                                      <div className="bg-slate-900 text-rose-300 font-mono text-xs p-4 rounded-xl overflow-x-auto shadow-inner border border-slate-800">
                                        {issue.code_snippet ||
                                          "// 코드 스니펫을 불러올 수 없습니다."}
                                      </div>
                                    </div>

                                    {issue.fix_code && (
                                      <div>
                                        <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
                                          <Code2 className="w-3.5 h-3.5 text-emerald-500" />{" "}
                                          권장 수정 코드
                                        </h5>
                                        <div className="bg-slate-900 text-emerald-300 font-mono text-xs p-4 rounded-xl overflow-x-auto shadow-inner border border-slate-800 whitespace-pre">
                                          {issue.fix_code}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-16 text-center text-slate-500"
                    >
                      검색 조건에 일치하는 취약점이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isInquiryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsInquiryDrawerOpen(false)}
          />

          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
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

            <form
              onSubmit={handleSubmitInquiry}
              className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5"
            >
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
