import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();

  // 1. Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. If logged in, check their role and redirect intelligently
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (role === "admin") {
      redirect("/admin/dashboard");
    } else if (role === "company_admin" || role === "company_member") {
      redirect("/company/dashboard");
    } else {
      // Default to student dashboard
      redirect("/dashboard");
    }
  }

  // 3. If NOT logged in, show the Landing Page
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Welcome to ZamHack
          </h1>
          <p className="text-lg text-muted-foreground">
            The ultimate platform for student hackathons and challenges.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" size="lg">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}