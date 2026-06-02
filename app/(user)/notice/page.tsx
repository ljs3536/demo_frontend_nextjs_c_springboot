"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

// 💡 1. 백엔드 NoticeDto.ListItem 규격에 맞게 수정
interface NoticeItem {
  noticeSeq: number;
  title: string;
  authorId: string; // 백엔드의 authorId로 매핑
  createdAt: string;
}

// 💡 2. 백엔드 NoticeDto.PageResult 규격에 맞게 수정
interface PageResponse {
  content: NoticeItem[];
  totalCount: number; // JPA의 totalElements 대신 우리가 만든 totalCount
  totalPages: number;
  currentPage: number; // JPA의 number 대신 1부터 시작하는 currentPage
}

export default function NoticesListPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 💡 3. MyBatis 기반 백엔드는 보통 1페이지부터 시작하므로 초기값을 1로 설정
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      try {
        const response = await api.post("/notices/list", {
          page: currentPage, // 숫자로 바로 전송
          outputCount: 10,
        });

        // 💡 4. ApiResponse 객체(data) 안의 실제 PageResult 객체(data.data)에 접근
        const pageResult = response.data.data;

        setNotices(pageResult.content); // 실제 배열 데이터 세팅
        setPageInfo(pageResult); // 페이지 메타데이터 세팅
      } catch (error) {
        console.error("문의 목록 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, [currentPage]);

  const goToPage = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-8">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" /> 고객 지원 &
            시스템 문의
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            오탐 제보 및 시스템 사용 중 발생한 문제를 해결해 드립니다.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-500">제목</th>
              <th className="px-6 py-4 font-semibold text-slate-500 text-center">
                작성자
              </th>
              <th className="px-6 py-4 font-semibold text-slate-500 text-right">
                등록 일시
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-slate-400">
                  목록을 불러오는 중입니다...
                </td>
              </tr>
            ) : notices.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-slate-400">
                  등록된 문의 내역이 없습니다.
                </td>
              </tr>
            ) : (
              notices.map((item) => (
                <tr
                  key={item.noticeSeq}
                  onClick={() => router.push(`/notice/${item.noticeSeq}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 text-black">{item.title}</td>
                  {/* 백엔드 DTO에 맞게 authorId 출력 */}
                  <td className="px-6 py-4 text-center text-slate-600">
                    {item.authorId}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 💡 5. 페이지네이션 렌더링 수정 */}
        {!loading && pageInfo && pageInfo.totalPages > 1 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              총 <span className="font-bold">{pageInfo.totalCount}</span>건 중{" "}
              <span className="font-bold">{pageInfo.currentPage}</span> /{" "}
              {pageInfo.totalPages} 페이지
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1} // 첫 페이지 처리
                className="p-1.5 rounded-md border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* 배열 인덱스(0부터)를 1부터 시작하는 페이지 번호로 매핑 */}
              {[...Array(pageInfo.totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 rounded-md text-sm font-semibold transition-colors ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-white border text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pageInfo.totalPages} // 마지막 페이지 처리
                className="p-1.5 rounded-md border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
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
