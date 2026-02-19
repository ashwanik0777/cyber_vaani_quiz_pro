"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Shield, LogOut, ArrowLeft } from "lucide-react"
import type { LeaderboardEntry } from "@/lib/models"

interface AdminData {
  sessionLeaderboard?: LeaderboardEntry[]
  globalBestLeaderboard?: LeaderboardEntry[]
}

export default function AdminLeaderboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [adminData, setAdminData] = useState<AdminData | null>(null)

  useEffect(() => {
    const authStatus = sessionStorage.getItem("adminAuth")
    const token = sessionStorage.getItem("adminToken")
    if (authStatus !== "true" || !token) {
      router.replace("/admin")
      return
    }

    loadData(token)
  }, [router])

  const loadData = async (token: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Failed to load leaderboard")
      }

      const data = await response.json()
      setAdminData(data.data)
    } catch (error) {
      console.error("Error loading leaderboard:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth")
    sessionStorage.removeItem("adminToken")
    router.push("/admin")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <p className="text-gray-600">Loading leaderboard...</p>
      </div>
    )
  }

  const sessionLeaderboard = adminData?.sessionLeaderboard || []
  const globalLeaderboard = adminData?.globalBestLeaderboard || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Leaderboard Center</h1>
              <p className="text-sm text-blue-600">Session-wise and app-wide rankings</p>
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

      <main className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/90 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Session Leaderboard (Top 20)
            </CardTitle>
            <CardDescription>Current running/last session performance</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionLeaderboard.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No session data yet</p>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {sessionLeaderboard.slice(0, 20).map((entry, index) => (
                  <div key={`${entry.userId}-${entry.rollNo}-${index}`} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">#{index + 1} {entry.name}</p>
                        <p className="text-xs text-gray-500">{entry.rollNo}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{entry.totalPoints} pts</p>
                        <p className="text-xs text-gray-500">{entry.score}/{entry.totalQuestions} ({entry.percentage}%)</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              Global Best Leaderboard (Top 20)
            </CardTitle>
            <CardDescription>Har student ka best score only</CardDescription>
          </CardHeader>
          <CardContent>
            {globalLeaderboard.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No global data yet</p>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {globalLeaderboard.slice(0, 20).map((entry, index) => (
                  <div key={`${entry.userId}-${entry.rollNo}-${index}`} className="p-3 rounded-lg border border-blue-100 bg-blue-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">#{index + 1} {entry.name}</p>
                        <p className="text-xs text-gray-500">{entry.rollNo}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-700">{entry.totalPoints} pts</p>
                        <p className="text-xs text-gray-500">{entry.score}/{entry.totalQuestions} ({entry.percentage}%)</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
