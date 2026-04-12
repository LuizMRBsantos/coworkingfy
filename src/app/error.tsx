"use client";
// Error boundaries precisam ser Client Components no Next.js

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
      <p className="text-5xl font-bold text-gray-200">500</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">Algo deu errado</h1>
      <p className="mt-2 text-sm text-gray-500">
        Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          Tentar novamente
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Voltar ao painel
        </a>
      </div>
    </div>
  );
}
