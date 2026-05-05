import { redirect } from "next/navigation";

export default function DocsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const swaggerUrl = `${apiUrl.replace(/\/api\/?$/, "")}/api-docs`;

  redirect(swaggerUrl);
}
