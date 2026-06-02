"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function NoticeRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", content: "" });

  const handleSubmit = async () => {
    await api.post("/admin/notices", form);
    alert("공지사항이 등록되었습니다.");
    router.push("/admin/notice");
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">공지사항 등록</h1>
      <div className="space-y-4">
        <input
          placeholder="제목"
          className="w-full p-3 border rounded"
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          placeholder="내용"
          className="w-full h-80 p-3 border rounded"
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold"
        >
          등록하기
        </button>
      </div>
    </div>
  );
}
