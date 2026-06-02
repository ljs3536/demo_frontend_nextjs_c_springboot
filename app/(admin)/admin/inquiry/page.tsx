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
} from "lucide-react";

interface InquiryItem {
  inquirySeq: number;
  title: string;
  status: string;
  authorName: string;
  hasAttachment: boolean;
  createdAt: string;
}

interface PageResponse {
  content: InquiryItem[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
  first: boolean;
}

export default function AdminInquiryListPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchInquiries = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `/admin/inquiries?page=${currentPage}&size=10&sort=createdAt,desc`,
        );
        setInquiries(response.data.content);
        setPageInfo(response.data);
      } catch (error) {
        console.error("문의 목록 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInquiries();
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
        {/* 새 문의 등록은 기존처럼 스캔 대시보드의 우측 드로어 등을 활용하거나 이곳에 버튼을 추가해도 좋습니다. */}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-500">상태</th>
              <th className="px-6 py-4 font-semibold text-slate-500">제목</th>
              <th className="px-6 py-4 font-semibold text-slate-500 text-center">
                첨부
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
            ) : inquiries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  등록된 문의 내역이 없습니다.
                </td>
              </tr>
            ) : (
              inquiries.map((item) => (
                <tr
                  key={item.inquirySeq}
                  onClick={() =>
                    router.push(`/admin/inquiry/${item.inquirySeq}`)
                  }
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    {item.status === "CMPLT" ? (
                      <span className="flex items-center gap-1 w-fit px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> 답변완료
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 w-fit px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" /> 접수대기
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {item.title}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.hasAttachment && (
                      <Paperclip className="w-4 h-4 text-slate-400 mx-auto" />
                    )}
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
