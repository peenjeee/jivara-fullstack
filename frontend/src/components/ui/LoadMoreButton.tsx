import Button from "./Button";

interface LoadMoreButtonProps {
  readonly onClick: () => void;
  readonly label?: string;
  readonly className?: string;
  readonly loading?: boolean;
}

export default function LoadMoreButton({ onClick, label = "Muat Lagi", className = "", loading = false }: LoadMoreButtonProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Button type="button" variant="outline" size="sm" onClick={onClick} loading={loading}>{label}</Button>
    </div>
  );
}
