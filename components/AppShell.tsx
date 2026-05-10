"use client";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-200 flex items-start justify-center">
      <div
        className="w-full bg-white relative overflow-hidden"
        style={{
          maxWidth: "430px",
          minHeight: "100dvh",
          height: "100dvh",
        }}
      >
        {children}
      </div>
    </div>
  );
}
