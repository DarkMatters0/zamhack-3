import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Briefcase, GraduationCap, MapPin } from "lucide-react"
import { redirect } from "next/navigation"

export default async function TalentPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch all students
  const { data: students, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching talent:", error)
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase()
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Talent Search</h1>
        <p className="text-muted-foreground">
          Discover students ready for your challenges.
        </p>
      </div>

      {!students || students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mb-4 opacity-20" />
            <p>No talent found matching your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={student.avatar_url || ""} />
                  <AvatarFallback>{getInitials(student.first_name, student.last_name)}</AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <CardTitle className="text-lg truncate">
                    {student.first_name} {student.last_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <GraduationCap className="h-3 w-3" />
                    {student.degree || "Student"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {student.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {student.bio}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 text-xs">
                  {student.university && (
                    <Badge variant="secondary" className="font-normal">
                      {student.university}
                    </Badge>
                  )}
                  {student.graduation_year && (
                    <Badge variant="outline" className="font-normal">
                      Class of {student.graduation_year}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}