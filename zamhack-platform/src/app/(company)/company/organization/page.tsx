import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import OrgForm from "./org-form"

export default async function OrganizationPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Get user's org ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.organization_id) {
    // Should be handled by dashboard self-repair, but safe redirect just in case
    redirect("/company/dashboard")
  }

  if (profile.role !== "company_admin") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p>Only company administrators can manage organization settings.</p>
      </div>
    )
  }

  // Fetch Organization Data
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single()

  if (!organization) {
    return <div className="p-6">Organization not found.</div>
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your company profile and branding.
        </p>
      </div>

      <OrgForm organization={organization} />
    </div>
  )
}