import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { listIntegrationSecretStatus } from "@/lib/settings/integration-secrets";
import { settingsEncryptionKey } from "@/lib/settings/secret-crypto";
import { LineSettings } from "@/feature/backoffice/components/line-settings";
import { siteConfig } from "@/lib/site";
export const metadata = { title: "ตั้งค่า LINE" };
export default async function LineSettingsPage() {
  await requireBackofficeSession("line.manage");
  let encryptionReady = false;
  try {
    encryptionReady = Boolean(settingsEncryptionKey());
  } catch {
    encryptionReady = false;
  }
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold">ตั้งค่า LINE</h1>
        <p className="mt-2 text-sm text-slate-500">
          ค่าที่บันทึกจะถูกเข้ารหัสก่อนเก็บลงฐานข้อมูล และจะไม่แสดงค่าเต็มอีก · มีผลกับเว็บภายใน 5 นาที
        </p>
      </header>
      <LineSettings
        initial={await listIntegrationSecretStatus()}
        encryptionReady={encryptionReady}
        webhookUrl={`${siteConfig.url}/api/line/webhook/`}
      />
    </main>
  );
}
