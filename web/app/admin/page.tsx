import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import AdminScheduler from "./scheduler";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  return <AdminScheduler displayName={user.displayName} signOutPath={chatGPTSignOutPath("/")} />;
}
