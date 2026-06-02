"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, Edit3, Trash2, Save, X } from "lucide-react";

export default function AdminNoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noticeSeq = params.noticeSeq as string;

  const [detail, setDetail] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", content: "" });

  useEffect(() => {
    fetchDetail();
  }, [noticeSeq]);

  const fetchDetail = async () => {
    const res = await api.get(`/notices/${noticeSeq}`);
    setDetail(res.data);
    setEditForm({ title: res.data.title, content: res.data.content });
  };

  const handleUpdate = async () => {
    await api.put(`/admin/notices/${noticeSeq}`, editForm);
    alert("수정 완료");
    setIsEditing(false);
    fetchDetail();
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await api.delete(`/admin/notices/${noticeSeq}`);
    router.push("/admin/notice");
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
        {/* 관리자 권한 체크 후 아래 버튼들 렌더링 (예: 권한 변수 사용) */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-200 rounded"
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                저장
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-blue-600"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button onClick={handleDelete} className="p-2 text-red-600">
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <input
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
            className="w-full text-2xl font-bold border-b p-2"
          />
          <textarea
            value={editForm.content}
            onChange={(e) =>
              setEditForm({ ...editForm, content: e.target.value })
            }
            className="w-full h-64 p-2 border rounded"
          />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-sm border">
          <h1 className="text-3xl font-bold mb-4">{detail.title}</h1>
          <p className="text-slate-500 mb-6">
            조회수: {detail.viewCount} |{" "}
            {new Date(detail.createdAt).toLocaleDateString()}
          </p>
          <div className="whitespace-pre-wrap">{detail.content}</div>
        </div>
      )}
    </div>
  );
}
