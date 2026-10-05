import { LineDirectory } from "@/feature/backoffice/components/line-directory";
export const metadata = { title: "ผู้ใช้ LINE" };
export default function LineUsersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LineDirectory kind="users" {...props} />;
}
