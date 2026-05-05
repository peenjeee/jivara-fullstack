import { redirect } from "next/navigation";

export default function DocsPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const swaggerUrl = `${apiUrl.replace(/\/api\/?$/, "")}/api-docs`;

  redirect(swaggerUrl);
}
