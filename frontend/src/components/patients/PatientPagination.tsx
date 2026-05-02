import Pagination from "@/components/ui/Pagination";

interface PatientPaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly pageSize: number;
  readonly itemLabel?: string;
  readonly onPageChange: (page: number) => void;
}

export default function PatientPagination({ currentPage, totalPages, totalItems, pageSize, itemLabel = "pasien", onPageChange }: PatientPaginationProps) {
  return <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} itemLabel={itemLabel} onPageChange={onPageChange} />;
}
