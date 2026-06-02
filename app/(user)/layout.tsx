import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Header />
      {/* 왼쪽 사이드바 너비(64)만큼 좌측 여백(pl-64)을 줘야 사이드바와 겹치지 않습니다 */}
      <main className="flex-1 pl-80 p-8">{children}</main>
    </div>
  );
}
