"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toggleUserStatus, deleteUser } from "./actions"
import { toast } from "sonner"
import { Ban, Trash2, CheckCircle } from "lucide-react"

interface UserActionsCellProps {
  userId: string
  status: string | null
}

export function UserActionsCell({ userId, status }: UserActionsCellProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isActive = status === "active" || !status

  const handleToggleStatus = async () => {
    setIsLoading(true)
    const result = await toggleUserStatus(userId, status || "active")
    if (result.error) toast.error(result.error)
    else toast.success(result.success)
    setIsLoading(false)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    const result = await deleteUser(userId)
    if (result.error) toast.error(result.error)
    else toast.success(result.success)
    setIsLoading(false)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button 
        variant={isActive ? "outline" : "default"} 
        size="sm" 
        onClick={handleToggleStatus}
        disabled={isLoading}
        className={!isActive ? "bg-green-600 hover:bg-green-700" : "text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"}
      >
        {isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
        <span className="sr-only">{isActive ? "Disable" : "Enable"}</span>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isLoading}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user's profile and remove their data from the servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}