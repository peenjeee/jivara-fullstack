import Button from "./Button";

interface LoadMoreButtonProps {
  readonly onClick: () => void;
  readonly label?: string;
  readonly className?: string;
}

export default function LoadMoreButton({ onClick, label = "Muat Lagi", className = "" }: LoadMoreButtonProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Button type="button" variant="outline" size="sm" onClick={onClick}>{label}</Button>
    </div>
  );
}
