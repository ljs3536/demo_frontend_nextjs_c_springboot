"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  Download,
  AlertCircle,
  Edit3,
  X,
  Save,
} from "lucide-react";

interface FileDto {
  fileSeq: number;
  fileName: string;
}

interface InquiryDetail {
  inquirySeq: number;
  title: string;
  content: string;
  scanId: string | null;
  status: string;
  answerContent: string | null;
  answeredAt: string | null;
  createdAt: string;
  files: FileDto[] | null;
}

export default function InquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inquirySeq = params.inquirySeq as string;

  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 💡 수정 모드 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!inquirySeq) return;
    const fetchDetail = async () => {
      try {
        const response = await api.get(`/inquiries/${inquirySeq}`);
        setDetail(response.data);
        // 데이터를 불러오면 수정용 State에도 초기값 세팅
        setEditTitle(response.data.title);
        setEditContent(response.data.content);
      } catch (error) {
        console.error("상세 조회 실패:", error);
        alert("데이터를 불러오지 못했습니다.");
        router.push("/inquiry");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [inquirySeq, router]);

  // 💡 문의 수정 서브밋 핸들러
  const handleUpdate = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      return alert("제목과 내용을 모두 입력해주세요.");
    }

    setIsSubmitting(true);
    try {
      await api.put(`/inquiries/${inquirySeq}`, {
        title: editTitle,
        content: editContent,
      });
      alert("문의 내용이 수정되었습니다.");

      // 로컬 상태 즉시 업데이트 및 읽기 모드로 전환
      setDetail((prev) =>
        prev ? { ...prev, title: editTitle, content: editContent } : null,
      );
      setIsEditing(false);
    } catch (error: any) {
      console.error("수정 실패:", error);
      alert(error.response?.data?.message || "수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 수정 취소 핸들러
  const handleCancelEdit = () => {
    setEditTitle(detail?.title || "");
    setEditContent(detail?.content || "");
    setIsEditing(false);
  };

  if (loading)
    return (
      <div className="p-20 text-center text-slate-500">
        상세 정보를 불러오는 중입니다...
      </div>
    );
  if (!detail) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-8">
      {/* 뒤로가기 및 상태 헤더 */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-start gap-4 w-full">
          <button
            onClick={() => router.push("/inquiry")}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${detail.status === "CMPLT" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
              >
                {detail.status === "CMPLT" ? "답변완료" : "접수대기"}
              </span>
              <span className="text-sm text-slate-400 font-mono">
                {new Date(detail.createdAt).toLocaleString()}
              </span>
            </div>

            {/* 💡 제목 렌더링 (수정 모드 vs 읽기 모드) */}
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xl font-bold text-slate-900 border border-blue-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="제목을 입력하세요"
              />
            ) : (
              <h1 className="text-2xl font-bold text-slate-900 break-all">
                {detail.title}
              </h1>
            )}
          </div>
        </div>

        {/* 💡 수정/저장/취소 버튼 컨트롤 영역 (접수대기 상태일 때만 노출) */}
        {detail.status === "PNDNG" && (
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> 취소
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  저장
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> 수정
              </button>
            )}
          </div>
        )}
      </div>

      {/* 연동된 스캔 ID 표시 */}
      {detail.scanId && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">
            연동된 스캔 타겟 ID:
          </span>
          <span className="text-sm font-mono text-blue-700 bg-white px-2 py-1 rounded border border-blue-200">
            {detail.scanId}
          </span>
        </div>
      )}

      {/* 💡 내용 렌더링 (수정 모드 vs 읽기 모드) */}
      <div
        className={`bg-white rounded-2xl shadow-sm border p-8 min-h-[250px] transition-colors ${isEditing ? "border-blue-300 ring-2 ring-blue-50" : "border-slate-200"}`}
      >
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full min-h-[200px] text-slate-700 leading-relaxed font-sans outline-none resize-none bg-transparent"
            placeholder="문의 내용을 상세히 적어주세요."
          />
        ) : (
          <p className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans break-all">
            {detail.content}
          </p>
        )}
      </div>

      {/* 첨부파일 영역 */}
      {detail.files && detail.files.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Paperclip className="w-4 h-4" /> 첨부파일 목록
          </h4>
          <div className="flex flex-wrap gap-2">
            {detail.files.map((file) => (
              <div
                key={file.fileSeq}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm"
              >
                <span className="text-slate-600 font-medium">
                  {file.fileName}
                </span>
                <button className="text-blue-500 hover:text-blue-700 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 관리자 답변 영역 */}
      {detail.status === "CMPLT" && detail.answerContent && (
        <div className="mt-8 bg-slate-900 rounded-2xl shadow-md border border-slate-800 p-8 relative overflow-hidden">
          <ShieldCheck className="absolute -right-6 -top-6 w-32 h-32 text-slate-800/50" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">
                  인포비정보기술 통합 보안 관리자
                </h3>
                <p className="text-slate-400 text-xs font-mono">
                  {new Date(detail.answeredAt!).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {detail.answerContent}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
