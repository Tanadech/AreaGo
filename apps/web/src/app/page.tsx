"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealth, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

function StatusPill({ value }: { value: string }) {
  const ok = value === "ok";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {value}
    </span>
  );
}

export default function HomePage() {
  const { data, error, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.health(),
    queryFn: getHealth,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">AreaScan</h1>
        <p className="text-sm text-gray-500">
          แพลตฟอร์มท่องเที่ยว — สถานะการเชื่อมต่อกับ API
        </p>
        <code className="text-xs text-gray-400">
          {process.env.NEXT_PUBLIC_API_BASE_URL ??
            "http://localhost:8000/api/v1"}
          /health
        </code>
      </header>

      <section className="rounded-lg border border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">API Health</h2>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {isFetching ? "กำลังโหลด…" : "รีเฟรช"}
          </button>
        </div>

        {isLoading && <p className="text-sm text-gray-500">กำลังตรวจสอบ…</p>}

        {isError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">เชื่อมต่อ API ไม่สำเร็จ</p>
            <p className="mt-1 font-mono text-xs">
              {error instanceof ApiError
                ? `[${error.status}] ${error.code}: ${error.message}`
                : (error as Error).message}
            </p>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-gray-500">status</dt>
              <dd>
                <StatusPill value={data.status} />
              </dd>
              <dt className="text-gray-500">db</dt>
              <dd>
                <StatusPill value={data.db} />
              </dd>
              <dt className="text-gray-500">redis</dt>
              <dd>
                <StatusPill value={data.redis} />
              </dd>
              <dt className="text-gray-500">env</dt>
              <dd className="font-mono text-xs">{data.env}</dd>
            </dl>

            <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-xs text-gray-100">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}
