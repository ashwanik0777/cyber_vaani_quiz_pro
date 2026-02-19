"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Users, Shield, Download, LogOut, ArrowLeft } from "lucide-react"
import { getScoreColor } from "@/lib/quiz-utils"

interface QuizResult {
  _id?: string
  userId?: string
  name: string
  rollNo: string
  mobileNo: string
  email: string
  score: number
  totalQuestions: number
  percentage: number
  isEligibleForReward: boolean
  rewardGiven: boolean
  totalPoints?: number
}

interface AdminData {
  users: QuizResult[]
  allAttempts: QuizResult[]
  statistics: {
    totalUsers: number
    eligibleForRewards: number
    averageScore: number
    rewardsGiven: number
    totalAttempts?: number
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [authToken, setAuthToken] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const authStatus = sessionStorage.getItem("adminAuth")
    const token = sessionStorage.getItem("adminToken")
    if (authStatus !== "true" || !token) {
      router.replace("/admin")
      return
    }

    setAuthToken(token)
    loadData(token)
  }, [router])

  const loadData = async (token: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Failed to load users")
      }

      const data = await response.json()
      setAdminData(data.data)
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRewardToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/admin/reward", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId,
          rewardGiven: !currentStatus,
        }),
      })

      if (response.ok) {
        await loadData(authToken)
      }
    } catch (error) {
      console.error("Error updating reward status:", error)
    }
  }

  const handleExport = () => {
    if (!adminData) return
    const payload = JSON.stringify(adminData.allAttempts || adminData.users, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(payload)}`
    const link = document.createElement("a")
    link.setAttribute("href", dataUri)
    link.setAttribute("download", `quiz-attempts-${new Date().toISOString().split("T")[0]}.json`)
    link.click()
  }

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth")
    sessionStorage.removeItem("adminToken")
    router.push("/admin")
  }

  const filteredUsers =
    adminData?.users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || []

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <p className="text-gray-600">Loading user management...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-blue-600">Search users and manage rewards</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/90 border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-600">Total Users</p><p className="text-2xl font-bold">{adminData?.statistics.totalUsers || 0}</p></CardContent></Card>
          <Card className="bg-white/90 border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-600">Eligible</p><p className="text-2xl font-bold">{adminData?.statistics.eligibleForRewards || 0}</p></CardContent></Card>
          <Card className="bg-white/90 border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-600">Rewards Given</p><p className="text-2xl font-bold">{adminData?.statistics.rewardsGiven || 0}</p></CardContent></Card>
          <Card className="bg-white/90 border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-600">Total Attempts</p><p className="text-2xl font-bold">{adminData?.statistics.totalAttempts || 0}</p></CardContent></Card>
        </div>

        <Card className="bg-white/90 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" />Users</CardTitle>
            <CardDescription>Global best list based users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, roll number, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="space-y-2 max-h-[65vh] overflow-y-auto">
              {filteredUsers.map((user) => (
                <div key={user._id || `${user.rollNo}-${user.email}`} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.rollNo}</p>
                    </div>
                    <span className={`text-xs font-semibold ${getScoreColor(user.percentage)}`}>{user.percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{user.score}/{user.totalQuestions} • {user.totalPoints || 0} pts</span>
                    {user.isEligibleForReward && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`reward-${user._id || user.rollNo}`}
                          checked={user.rewardGiven}
                          onCheckedChange={() => user._id && handleRewardToggle(user._id, user.rewardGiven)}
                          disabled={!user._id}
                        />
                        <Label htmlFor={`reward-${user._id || user.rollNo}`} className="text-xs cursor-pointer">
                          {user.rewardGiven ? "Given" : "Pending"}
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
