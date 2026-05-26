import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly pageSize: number;
  readonly itemLabel: string;
  readonly onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, totalItems, pageSize, itemLabel, onPageChange }: PaginationProps) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-4 rounded-b-3xl bg-white p-5 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <p>Menampilkan {start} hingga {end} dari {totalItems} {itemLabel}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-line transition-colors hover:bg-surface hover:text-text-main disabled:opacity-40"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            type="button"
            key={page}
            className={`size-9 rounded-xl border text-sm font-bold transition-colors ${
              currentPage === page ? "border-primary bg-primary text-white" : "border-line text-muted hover:bg-surface hover:text-text-main"
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-line transition-colors hover:bg-surface hover:text-text-main disabled:opacity-40"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
