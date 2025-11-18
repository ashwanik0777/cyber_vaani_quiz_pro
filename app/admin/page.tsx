"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Users, Trophy, Eye, EyeOff, LogOut, Download, Play, Pause, SkipForward, RotateCcw, Clock } from "lucide-react"
import { getScoreColor } from "@/lib/quiz-utils"
import { quizQuestions } from "@/lib/quiz-data"
import type { QuizState, LeaderboardEntry } from "@/lib/models"

const ADMIN_CREDENTIALS = {
  username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin",
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "cyber123",
}

interface QuizResult {
  _id: string
  name: string
  rollNo: string
  mobileNo: string
  email: string
  score: number
  totalQuestions: number
  percentage: number
  completedAt: string
  isEligibleForReward: boolean
  rewardGiven: boolean
  totalPoints?: number
}

interface AdminData {
  users: QuizResult[]
  statistics: {
    totalUsers: number
    eligibleForRewards: number
    averageScore: number
    rewardsGiven: number
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginData, setLoginData] = useState({ username: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [authToken, setAuthToken] = useState("")
  const [quizState, setQuizState] = useState<QuizState | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentQuestionDisplay, setCurrentQuestionDisplay] = useState<string>("")
  const [totalQuestions, setTotalQuestions] = useState<number>(10)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Check if already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem("adminAuth")
    const token = sessionStorage.getItem("adminToken")
    if (authStatus === "true" && token) {
      setIsAuthenticated(true)
      setAuthToken(token)
      loadAdminData(token)
      loadQuizState(token)
    }
  }, [])

  // Connect to real-time stream
  useEffect(() => {
    if (!isAuthenticated || !authToken) return

    const eventSource = new EventSource("/api/quiz/stream")
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "state" || data.type === "update") {
          const state = data.data as QuizState
          setQuizState(state)
          setLeaderboard(state.leaderboard || [])
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE error:", error)
    }

    return () => {
      eventSource.close()
    }
  }, [isAuthenticated, authToken])

  const loadAdminData = async (token: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch admin data")
      }

      const data = await response.json()
      setAdminData(data.data)
    } catch (error) {
      console.error("Error loading admin data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadQuizState = async (token: string) => {
    try {
      const response = await fetch("/api/quiz/state", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setQuizState(data.state)
      }
    } catch (error) {
      console.error("Error loading quiz state:", error)
    }
  }

  const updateQuizState = async (action: string, questionId?: number) => {
    try {
      const response = await fetch("/api/quiz/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action,
          questionId,
          totalQuestions: totalQuestions,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQuizState(data.state)
      }
    } catch (error) {
      console.error("Error updating quiz state:", error)
    }
  }

  const getRandomQuestion = () => {
    const randomIndex = Math.floor(Math.random() * quizQuestions.length)
    return quizQuestions[randomIndex]
  }

  const handleStartCountdown = async () => {
    // Get random question
    const randomQuestion = getRandomQuestion()
    setCurrentQuestionDisplay(randomQuestion.question)
    
    await updateQuizState("start_countdown")
    
    // Auto-start question after countdown (5 seconds)
    setTimeout(async () => {
      await updateQuizState("start_question", randomQuestion.id)
    }, 5000)
  }

  const handleStartQuestion = async () => {
    // Get random question
    const randomQuestion = getRandomQuestion()
    setCurrentQuestionDisplay(randomQuestion.question)
    await updateQuizState("start_question", randomQuestion.id)
  }

  const handleNextQuestion = async () => {
    // Get random question
    const randomQuestion = getRandomQuestion()
    setCurrentQuestionDisplay(randomQuestion.question)
    await updateQuizState("next_question", randomQuestion.id)
  }

  const handleEndQuiz = async () => {
    await updateQuizState("end_quiz")
  }

  const handleResetQuiz = async () => {
    if (confirm("Are you sure you want to reset the quiz? This will clear all progress.")) {
      await updateQuizState("reset")
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    if (loginData.username === ADMIN_CREDENTIALS.username && loginData.password === ADMIN_CREDENTIALS.password) {
      const token = btoa(`${loginData.username}:${loginData.password}`)
      setIsAuthenticated(true)
      setAuthToken(token)
      sessionStorage.setItem("adminAuth", "true")
      sessionStorage.setItem("adminToken", token)
      loadAdminData(token)
      loadQuizState(token)
    } else {
      setLoginError("Invalid username or password")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setAuthToken("")
    setAdminData(null)
    setQuizState(null)
    sessionStorage.removeItem("adminAuth")
    sessionStorage.removeItem("adminToken")
    setLoginData({ username: "", password: "" })
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
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
        await loadAdminData(authToken)
      }
    } catch (error) {
      console.error("Error updating reward status:", error)
    }
  }

  const exportData = () => {
    if (!adminData) return

    const dataStr = JSON.stringify(adminData.users, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `quiz-results-${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const filteredUsers =
    adminData?.users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || []

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-500 rounded-full">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl">Admin Login</CardTitle>
            <CardDescription>Enter your credentials to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{loginError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700">
                Login
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => router.push("/")} className="text-blue-600 hover:text-blue-700">
                Back to Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (isLoading && !adminData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-blue-600">Quiz Control & User Management</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quiz Controls & Leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quiz Control Panel */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-600" />
                  Quiz Controls
                </CardTitle>
                <CardDescription>Control the quiz flow and questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Count Selector */}
                {!quizState?.isActive && !quizState?.countdownActive && (
                  <div className="space-y-2">
                    <Label htmlFor="questionCount">Number of Questions</Label>
                    <Input
                      id="questionCount"
                      type="number"
                      min="1"
                      max="50"
                      value={totalQuestions}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 10
                        setTotalQuestions(Math.min(Math.max(1, value), 50))
                      }}
                      className="h-11"
                      disabled={quizState?.isActive || quizState?.countdownActive}
                    />
                    <p className="text-xs text-gray-500">
                      Set the number of questions for this quiz (1-50)
                    </p>
                  </div>
                )}

                {/* Current Question Info */}
                {currentQuestionDisplay && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 shadow-sm">
                    <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <span className="text-lg">📝</span> Current Question:
                    </p>
                    <p className="text-sm text-blue-800 font-medium leading-relaxed">
                      {currentQuestionDisplay}
                    </p>
                  </div>
                )}
                
                {!currentQuestionDisplay && !quizState?.isActive && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                      Questions will be randomly selected when quiz starts
                    </p>
                  </div>
                )}

                {/* Quiz State */}
                {quizState && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <Badge className={`ml-2 ${quizState.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                          {quizState.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">Question:</span>
                        <span className="ml-2 font-medium">
                          {quizState.currentQuestionIndex + 1} / {quizState.totalQuestions}
                        </span>
                        {quizState.currentQuestionIndex + 1 >= quizState.totalQuestions && (
                          <Badge className="ml-2 bg-green-100 text-green-700">Last Question</Badge>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600">Participants:</span>
                        <span className="ml-2 font-medium">{quizState.participants}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Countdown:</span>
                        <span className="ml-2 font-medium">{quizState.countdownValue || 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Control Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleStartCountdown}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg transform hover:scale-105 transition-all"
                    disabled={quizState?.isActive || quizState?.countdownActive}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Countdown (5-4-3-2-1)
                  </Button>
                  <Button
                    onClick={handleStartQuestion}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transform hover:scale-105 transition-all"
                    disabled={quizState?.isActive}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Question
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 shadow-md transform hover:scale-105 transition-all"
                    disabled={!quizState?.isActive}
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Next Question
                  </Button>
                  <Button
                    onClick={handleEndQuiz}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 shadow-md transform hover:scale-105 transition-all"
                    disabled={!quizState?.isActive}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    End Quiz
                  </Button>
                </div>
                <Button
                  onClick={handleResetQuiz}
                  variant="outline"
                  className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Quiz
                </Button>
              </CardContent>
            </Card>

            {/* Real-time Leaderboard */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Live Leaderboard (Top 20)
                </CardTitle>
                <CardDescription>Real-time rankings based on points</CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No rankings yet</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {leaderboard.slice(0, 20).map((entry, index) => (
                      <div
                        key={entry.userId}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          index === 0
                            ? "bg-yellow-50 border-yellow-300"
                            : index === 1
                              ? "bg-gray-50 border-gray-300"
                              : index === 2
                                ? "bg-orange-50 border-orange-300"
                                : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                index === 0
                                  ? "bg-yellow-500 text-white"
                                  : index === 1
                                    ? "bg-gray-400 text-white"
                                    : index === 2
                                      ? "bg-orange-500 text-white"
                                      : "bg-gray-300 text-gray-700"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{entry.name}</p>
                              <p className="text-xs text-gray-500">{entry.rollNo}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{entry.totalPoints} pts</p>
                            <p className="text-xs text-gray-500">
                              {entry.score}/{entry.totalQuestions} ({entry.percentage}%)
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & User Management */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-xl font-bold text-gray-900">
                        {adminData?.statistics.totalUsers || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Trophy className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Eligible for Rewards</p>
                      <p className="text-xl font-bold text-gray-900">
                        {adminData?.statistics.eligibleForRewards || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rewards Given</p>
                      <p className="text-xl font-bold text-gray-900">
                        {adminData?.statistics.rewardsGiven || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Trophy className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Score</p>
                      <p className="text-xl font-bold text-gray-900">
                        {adminData?.statistics.averageScore || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Management */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">User Management</CardTitle>
                <CardDescription>Search and manage users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search by name, roll number, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10"
                />
                <Button
                  onClick={exportData}
                  variant="outline"
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {filteredUsers.slice(0, 10).map((user) => (
                    <div
                      key={user._id}
                      className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.rollNo}</p>
                        </div>
                        <span className={`text-xs font-semibold ${getScoreColor(user.percentage)}`}>
                          {user.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          {user.score}/{user.totalQuestions}
                        </span>
                        {user.isEligibleForReward && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`reward-${user._id}`}
                              checked={user.rewardGiven}
                              onCheckedChange={() => handleRewardToggle(user._id, user.rewardGiven)}
                            />
                            <Label htmlFor={`reward-${user._id}`} className="text-xs cursor-pointer">
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
          </div>
        </div>
      </main>
    </div>
  )
}
