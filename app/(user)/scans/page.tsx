"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScanHistoryItem {
  scanId: string;
  target: string;
  policy: string;
  language: string;
  issuesCritical: number;
  issuesHigh: number;
  issuesMedium: number;
  issuesLow: number;
  startedAt: string;
  sbomId?: string | null;
}

// 💡 1. 백엔드의 Page 객체 규격을 담을 인터페이스 추가
interface PageResponse {
  content: ScanHistoryItem[];
  totalPages: number;
  totalElements: number;
  number: number; // 현재 페이지 (0부터 시작)
  last: boolean;
  first: boolean;
}

export default function ScanHistoryPage() {
  const router = useRouter();

  // 💡 2. 목록 상태와 페이지네이션 상태를 분리해서 관리
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 현재 페이지 상태 (Spring Boot Pageable은 0부터 시작하므로 초기값 0)
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await api.post(
          `/scans/list?page=${currentPage}&size=10&sort=startedAt,desc`,
        );

        console.log("API 응답:", response.data); // 💡 디버깅용: 실제 데이터 구조 확인

        // 1. 공통 응답(ApiResponse) 처리가 되어있다면 response.data.data, 아니면 response.data
        const resultData = response.data.data || response.data;

        // 2. 💡 history 상태에는 배열이 들어있는 'content'만 빼서 넣습니다!
        setHistory(resultData || []);

        // 3. pageInfo 상태에는 페이지네이션 객체 통째로 넣습니다.
        setPageInfo(resultData);
      } catch (error) {
        console.error("이력 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [currentPage]);

  // 💡 4. 페이지 이동 핸들러
  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">스캔 관리 이력</h1>
        <button
          onClick={() => router.push("/scan")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          + 새 스캔 시작
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                대상 프로젝트
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                상태
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                탐지 이슈 (위험군)
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                스캔 일시
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">
                상세 대시보드
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-slate-400"
                >
                  <div className="flex justify-center items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                    데이터를 불러오는 중...
                  </div>
                </td>
              </tr>
            ) : history?.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-slate-400 font-medium"
                >
                  스캔 이력이 없습니다.
                </td>
              </tr>
            ) : (
              history?.map((scan) => (
                <tr
                  key={scan.scanId}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">
                      {scan.target}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {scan.scanId}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200">
                      COMPLETED
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-rose-500">
                    {/* Critical + High 합산 */}
                    {(scan.issuesHigh || 0) + (scan.issuesCritical || 0)}건
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                    {scan.startedAt
                      ? new Date(scan.startedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() =>
                          router.push(`/dashboard/scan/${scan.scanId}`)
                        }
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        취약점 리포트
                      </button>
                      {scan.sbomId && (
                        <button
                          onClick={() =>
                            router.push(`/dashboard/sbom/${scan.sbomId}`)
                          }
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          SBOM 대시보드
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 💡 5. 페이지네이션 컨트롤러 블록 */}
        {!loading && pageInfo && pageInfo.totalPages > 1 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              총{" "}
              <span className="font-bold text-slate-700">
                {pageInfo.totalElements}
              </span>
              개의 스캔 이력 중
              <span className="font-bold text-slate-700 ml-1">
                {pageInfo.number + 1}
              </span>{" "}
              / {pageInfo.totalPages} 페이지
            </div>

            <div className="flex gap-1">
              {/* 이전 페이지 버튼 */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={pageInfo.first}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* 동적 페이지 번호 생성 로직 */}
              {[...Array(pageInfo.totalPages)].map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToPage(idx)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold transition-colors ${
                    currentPage === idx
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              {/* 다음 페이지 버튼 */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={pageInfo.last}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
