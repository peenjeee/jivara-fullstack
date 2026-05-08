import { NurseDetailPage } from "@/components/admin";

interface NurseDetailRouteProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export default async function NurseDetailRoute({ params }: NurseDetailRouteProps) {
  const { id } = await params;
  return <NurseDetailPage nurseId={decodeURIComponent(id)} />;
}
