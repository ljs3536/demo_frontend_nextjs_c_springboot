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
  Send,
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

export default function AdminInquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inquirySeq = params.inquirySeq as string;

  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 💡 [추가] 관리자 답변 폼 상태
  const [answerInput, setAnswerInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/admin/inquiries/${inquirySeq}`);
      setDetail(response.data);
    } catch (error) {
      console.error("상세 조회 실패:", error);
      alert("데이터를 불러오지 못했습니다.");
      router.push("/admin/inquiry"); // 목록으로 이동
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inquirySeq) fetchDetail();
  }, [inquirySeq]);

  // 💡 [추가] 답변 등록 핸들러
  const handleAnswerSubmit = async () => {
    if (!answerInput.trim()) return alert("답변 내용을 입력해주세요.");
    setIsSubmitting(true);
    try {
      await api.put(`/admin/inquiries/${inquirySeq}/answer`, {
        answerContent: answerInput,
      });
      alert("답변이 성공적으로 등록되었습니다.");
      fetchDetail(); // 🚀 등록 후 최신 데이터로 화면 즉시 갱신 (PNDNG -> CMPLT 변환)
      setAnswerInput("");
    } catch (error) {
      console.error("답변 등록 실패:", error);
      alert("답변 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadFile = async (fileSeq: number, fileName: string) => {
    try {
      // 1. responseType을 'blob'으로 지정하여 바이너리 스트림으로 수신
      const response = await api.get(`/files/download/${fileSeq}`, {
        responseType: "blob",
      });

      // 2. 브라우저 메모리에 가상의 다운로드 URL 생성
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // 3. 임시 <a> 태그를 만들어 클릭 이벤트 강제 발생
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName); // 저장될 파일명 지정
      document.body.appendChild(link);
      link.click();

      // 4. 메모리 누수 방지를 위한 후처리
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("파일 다운로드 실패:", error);
      alert("파일을 다운로드하는 중 오류가 발생했습니다.");
    }
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
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <button
          onClick={() => router.push("/inquiry")}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
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
          <h1 className="text-2xl font-bold text-slate-900">{detail.title}</h1>
        </div>
      </div>

      {/* 연동된 스캔 ID 표시 (있는 경우) */}
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

      {/* 사용자가 작성한 문의 내용 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[250px]">
        <p className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
          {detail.content}
        </p>
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
                <span className="text-slate-600 font-medium truncate max-w-[200px]">
                  {file.fileName}
                </span>

                {/* 💡 [수정] onClick 이벤트 연결 */}
                <button
                  onClick={() =>
                    handleDownloadFile(file.fileSeq, file.fileName)
                  }
                  className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                  title="파일 다운로드"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 💡 관리자 답변 영역 분기 처리 */}
      {detail.status === "CMPLT" && detail.answerContent ? (
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
      ) : (
        // 💡 [추가] 답변 대기 중일 때 보여지는 입력 폼
        <div className="mt-8 bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" /> 관리자 공식 답변
            작성
          </h3>
          <textarea
            value={answerInput}
            onChange={(e) => setAnswerInput(e.target.value)}
            placeholder="사용자에게 전달할 답변을 상세히 작성해주세요."
            className="w-full min-h-[150px] p-4 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleAnswerSubmit}
              disabled={isSubmitting}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              답변 최종 등록
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
