import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const viewer = await getViewer();
  if (!viewer) redirect("/kein-zugang");
  redirect(viewer.role === "coach" ? "/coach" : "/kunde");
}
