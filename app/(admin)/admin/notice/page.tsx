"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Clock,
  Save,
} from "lucide-react";

interface NoticeItem {
  noticeSeq: number;
  title: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  content: NoticeItem[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
  first: boolean;
}

export default function AdmminNoticesListPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `/notices?page=${currentPage}&size=10&sort=createdAt,desc`,
        );
        setNotices(response.data.content);
        setPageInfo(response.data);
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
            <MessageSquare className="w-6 h-6 text-blue-600" /> 공지사항
          </h1>
        </div>
        {/* 새 문의 등록은 기존처럼 스캔 대시보드의 우측 드로어 등을 활용하거나 이곳에 버튼을 추가해도 좋습니다. */}
        <button
          onClick={() => router.push("/admin/notice/register")}
          className="flex items-center gap-2 text-slate-500"
        >
          <Save className="w-4 h-4" />
          등록
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-500">제목</th>
              <th className="px-6 py-4 font-semibold text-slate-500 text-center">
                조회수
              </th>
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
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  목록을 불러오는 중입니다...
                </td>
              </tr>
            ) : notices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  등록된 문의 내역이 없습니다.
                </td>
              </tr>
            ) : (
              notices.map((item) => (
                <tr
                  key={item.noticeSeq}
                  onClick={() => router.push(`/inquiry/${item.noticeSeq}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">{item.title}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {item.viewCount}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {item.authorName}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {!loading && pageInfo && pageInfo.totalPages > 1 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              총 <span className="font-bold">{pageInfo.totalElements}</span>건
              중 <span className="font-bold">{pageInfo.number + 1}</span> /{" "}
              {pageInfo.totalPages} 페이지
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={pageInfo.first}
                className="p-1.5 rounded-md border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(pageInfo.totalPages)].map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToPage(idx)}
                  className={`w-8 h-8 rounded-md text-sm font-semibold transition-colors ${currentPage === idx ? "bg-blue-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-100"}`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={pageInfo.last}
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
