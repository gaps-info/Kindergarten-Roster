import { requireAdmin } from "../admin-auth";
import AdminScheduler from "./scheduler";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const session = await requireAdmin();
  return <AdminScheduler displayName={session.username} role={session.role} />;
}
