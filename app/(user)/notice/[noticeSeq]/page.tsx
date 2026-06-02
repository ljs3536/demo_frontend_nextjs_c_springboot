"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, Edit3, Trash2, Save, X } from "lucide-react";

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noticeSeq = params.noticeSeq as string;

  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    fetchDetail();
  }, [noticeSeq]);

  const fetchDetail = async () => {
    const res = await api.get(`/notices/${noticeSeq}`);
    setDetail(res.data);
  };

  if (!detail) return <div>로딩중...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" /> 목록으로
        </button>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-sm border">
        <h1 className="text-3xl font-bold mb-4 text-black">{detail.title}</h1>
        <p className="text-slate-500 mb-6">
          조회수: {detail.viewCount} |{" "}
          {new Date(detail.createdAt).toLocaleDateString()}
        </p>
        <div className="whitespace-pre-wrap text-black">{detail.content}</div>
      </div>
    </div>
  );
}
