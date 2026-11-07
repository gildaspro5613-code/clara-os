import MainLayout from "@/components/layout/MainLayout";
import NativeMailPanel from "@/components/native/NativeMailPanel";
import {nativePage} from "@/lib/native/page-fence";
export const dynamic = "force-dynamic";
// Mail operations remain inside the existing authenticated native runtime.
export default async function MailPage() {
 return nativePage(async () => <MainLayout><main className="mx-auto w-full max-w-6xl p-6"><NativeMailPanel /></main></MainLayout>);
}
