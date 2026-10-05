import { LineDirectory } from "@/feature/backoffice/components/line-directory";
export const metadata = { title: "ข้อความ LINE" };
export default function LineMessagesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LineDirectory kind="messages" {...props} />;
}
