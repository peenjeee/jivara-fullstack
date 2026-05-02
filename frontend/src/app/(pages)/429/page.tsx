import { ErrorPage } from "@/components/errors";

export default function TooManyRequestsPage() {
  return <ErrorPage variant="429" />;
}
