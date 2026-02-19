"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Users, Trophy, Eye, EyeOff, LogOut, Play, Pause, SkipForward, RotateCcw, Clock, ArrowRight } from "lucide-react"
import { quizQuestions } from "@/lib/quiz-data"
import type { QuizState, LeaderboardEntry } from "@/lib/models"

const ADMIN_CREDENTIALS = {
  username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin",
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "cyber123",
}

interface AdminData {
  activeSessionId?: string | null
  recentSessions?: Array<{
    sessionId: string
    startedAt: string
    endedAt: string | null
    totalQuestions: number
    participants: number
  }>
  statistics: {
    totalUsers: number
    eligibleForRewards: number
    averageScore: number
    rewardsGiven: number
    totalAttempts?: number
    sessionParticipants?: number
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginData, setLoginData] = useState({ username: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authToken, setAuthToken] = useState("")
  const [quizState, setQuizState] = useState<QuizState | null>(null)
  const [sessionLeaderboard, setSessionLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentQuestionDisplay, setCurrentQuestionDisplay] = useState<string>("")
  const [questionCount, setQuestionCount] = useState<number>(10)
  const eventSourceRef = useRef<EventSource | null>(null)

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
          setSessionLeaderboard(state.leaderboard || [])
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
        setSessionLeaderboard(data.state?.leaderboard || [])
        if (data.state?.totalQuestions) {
          setQuestionCount(data.state.totalQuestions)
        }
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
          totalQuestions: questionCount,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQuizState(data.state)
        setSessionLeaderboard(data.state?.leaderboard || [])
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
    const randomQuestion = getRandomQuestion()
    setCurrentQuestionDisplay(randomQuestion.question)

    await updateQuizState("start_countdown")

    setTimeout(async () => {
      await updateQuizState("start_question", randomQuestion.id)
    }, 5000)
  }

  const handleStartQuestion = async () => {
    const randomQuestion = getRandomQuestion()
    setCurrentQuestionDisplay(randomQuestion.question)
    await updateQuizState("start_question", randomQuestion.id)
  }

  const handleNextQuestion = async () => {
    if (quizState && quizState.currentQuestionIndex >= questionCount - 1) {
      alert(`Quiz completed! You've reached the limit of ${questionCount} questions.`)
      await updateQuizState("end_quiz")
      return
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Control Center</h1>
                <p className="text-sm text-blue-600">Quiz operations in one place</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-blue-200 text-blue-700" onClick={() => router.push("/admin/users")}>Users</Button>
              <Button variant="outline" className="border-blue-200 text-blue-700" onClick={() => router.push("/admin/leaderboard")}>Leaderboard</Button>
              <Button onClick={handleLogout} variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-600" />
                  Quiz Controls
                </CardTitle>
                <CardDescription>Start, run and end session from here</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="questionCount">Number of Questions</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="1"
                    max="50"
                    value={questionCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 10
                      setQuestionCount(Math.max(1, Math.min(50, value)))
                    }}
                    disabled={quizState?.isActive || quizState?.countdownActive}
                    className="h-11"
                  />
                </div>

                {currentQuestionDisplay ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Current Question</p>
                    <p className="text-sm text-blue-800">{currentQuestionDisplay}</p>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600 text-center">
                    Question auto-picked when you start countdown/question.
                  </div>
                )}

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
                      </div>
                      <div>
                        <span className="text-gray-600">Participants:</span>
                        <span className="ml-2 font-medium">{quizState.sessionParticipants ?? quizState.participants}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Countdown:</span>
                        <span className="ml-2 font-medium">{quizState.countdownValue || 0}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-medium">Active Session:</span> {quizState.activeSessionId || "Not started"}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleStartCountdown}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={quizState?.isActive || quizState?.countdownActive}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Countdown
                  </Button>
                  <Button
                    onClick={handleStartQuestion}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={quizState?.isActive}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Question
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    disabled={!quizState?.isActive}
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Next Question
                  </Button>
                  <Button
                    onClick={handleEndQuiz}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    disabled={!quizState?.isActive}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    End Quiz
                  </Button>
                </div>

                <Button onClick={handleResetQuiz} variant="outline" className="w-full border-orange-200 text-orange-700 hover:bg-orange-50">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Quiz
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Session Leaderboard (Top 20)
                </CardTitle>
                <CardDescription>Current live session rankings</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionLeaderboard.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No rankings yet</p>
                ) : (
                  <div className="space-y-2 max-h-[450px] overflow-y-auto">
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
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-xl font-bold text-gray-900">{adminData?.statistics.totalUsers || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Session Participants</p>
                      <p className="text-xl font-bold text-gray-900">{adminData?.statistics.sessionParticipants || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Attempts</p>
                      <p className="text-xl font-bold text-gray-900">{adminData?.statistics.totalAttempts || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Separate Pages</CardTitle>
                <CardDescription>Heavy sections shifted here</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-between" variant="outline" onClick={() => router.push("/admin/users")}>User Management <ArrowRight className="h-4 w-4" /></Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => router.push("/admin/leaderboard")}>Global Leaderboard <ArrowRight className="h-4 w-4" /></Button>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Sessions</CardTitle>
                <CardDescription>Quick session-wise summary</CardDescription>
              </CardHeader>
              <CardContent>
                {(adminData?.recentSessions || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No sessions yet</p>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {(adminData?.recentSessions || []).map((session) => (
                      <div key={session.sessionId} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-800">{session.sessionId}</p>
                        <p className="text-xs text-gray-600">Questions: {session.totalQuestions} • Participants: {session.participants}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(session.startedAt).toLocaleString()} {session.endedAt ? `→ ${new Date(session.endedAt).toLocaleString()}` : "(ongoing)"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
