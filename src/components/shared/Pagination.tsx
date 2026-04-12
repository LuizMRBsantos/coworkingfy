import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page:         number;
  totalPages:   number;
  /** Demais search params da URL atual — preservados na navegação */
  searchParams: Record<string, string>;
}

function buildHref(params: Record<string, string>, page: number) {
  const sp = new URLSearchParams({ ...params, page: String(page) });
  return `?${sp.toString()}`;
}

export function Pagination({ page, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Gera até 5 números de página ao redor da atual
  const delta = 2;
  const range: number[] = [];
  for (
    let i = Math.max(1, page - delta);
    i <= Math.min(totalPages, page + delta);
    i++
  ) {
    range.push(i);
  }

  const paramsWithoutPage = Object.fromEntries(
    Object.entries(searchParams).filter(([k]) => k !== "page"),
  );

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {/* Anterior */}
      {page > 1 ? (
        <Link
          href={buildHref(paramsWithoutPage, page - 1)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-100 text-gray-300 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </span>
      )}

      {/* Primeira página se fora do range */}
      {range[0] > 1 && (
        <>
          <Link
            href={buildHref(paramsWithoutPage, 1)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            1
          </Link>
          {range[0] > 2 && <span className="px-1 text-gray-400">...</span>}
        </>
      )}

      {/* Páginas do range */}
      {range.map((p) => (
        <Link
          key={p}
          href={buildHref(paramsWithoutPage, p)}
          className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
            p === page
              ? "bg-gray-900 text-white border-gray-900"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {p}
        </Link>
      ))}

      {/* Última página se fora do range */}
      {range[range.length - 1] < totalPages && (
        <>
          {range[range.length - 1] < totalPages - 1 && (
            <span className="px-1 text-gray-400">...</span>
          )}
          <Link
            href={buildHref(paramsWithoutPage, totalPages)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Próxima */}
      {page < totalPages ? (
        <Link
          href={buildHref(paramsWithoutPage, page + 1)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-100 text-gray-300 cursor-not-allowed">
          Próxima
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
