"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, Shield, CheckCircle, Trophy, TrendingUp } from "lucide-react"
import { quizQuestions, type QuizQuestion } from "@/lib/quiz-data"
import { formatTime, getUserSpecificQuestions } from "@/lib/quiz-utils"
import { Countdown } from "@/components/countdown"
import type { QuizState, LeaderboardEntry } from "@/lib/models"

export default function QuizPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [quizState, setQuizState] = useState<QuizState | null>(null)
  const [userQuestions, setUserQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null)
  const [timeLeft, setTimeLeft] = useState(15)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showCountdown, setShowCountdown] = useState(false)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; pointsEarned: number } | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize user and questions
  useEffect(() => {
    const userData = sessionStorage.getItem("currentUser")
    if (!userData) {
      router.push("/")
      return
    }

    const user = JSON.parse(userData)
    setCurrentUser(user)

    // Get user-specific questions
    const questionIds = getUserSpecificQuestions(user.userId || user.email, 10)
    const questions = questionIds
      .map((id) => quizQuestions.find((q) => q.id === id))
      .filter((q): q is QuizQuestion => q !== undefined)
    
    setUserQuestions(questions)
    setIsLoading(false)
  }, [router])

  // Connect to real-time stream
  useEffect(() => {
    if (!currentUser) return

    const eventSource = new EventSource("/api/quiz/stream")
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === "state" || data.type === "update") {
          const state = data.data as QuizState
          setQuizState(state)
          setLeaderboard(state.leaderboard || [])

          // Update user rank
          const userEntry = state.leaderboard?.find(
            (entry) => entry.userId === currentUser.userId || entry.rollNo === currentUser.rollNo
          )
          if (userEntry) {
            setUserRank(userEntry.rank)
            setUserPoints(userEntry.totalPoints || 0)
          }

          // Handle countdown
          if (state.countdownActive && state.countdownValue > 0) {
            setShowCountdown(true)
          } else {
            setShowCountdown(false)
          }
          
          // Show leaderboard when question ends or quiz completes
          if (state.endedAt) {
            // Quiz completed - redirect to results
            setShowLeaderboard(true)
            setTimeUp(true)
            // Store results and redirect
            setTimeout(() => {
              const resultsData = {
                user: currentUser,
                leaderboard: state.leaderboard || [],
                userRank,
                userPoints,
                totalQuestions: state.totalQuestions || 10,
                completedAt: new Date().toISOString(),
              }
              sessionStorage.setItem("quizResults", JSON.stringify(resultsData))
              router.push("/results")
            }, 3000)
          } else if (!state.isActive && state.currentQuestionIndex !== undefined && !state.countdownActive && state.currentQuestionIndex >= 0) {
            // Question ended - show leaderboard (keep showing until next question)
            setShowLeaderboard(true)
            setTimeUp(true)
          } else if (state.isActive && state.questionStartTime) {
            // New question started - hide leaderboard
            setShowLeaderboard(false)
            setTimeUp(false)
          }

          // Handle question changes - each user gets their own question
          if (state.currentQuestionIndex !== undefined && state.questionStartTime) {
            // Get question from user's own list based on index
            const questionIndex = state.currentQuestionIndex
            if (questionIndex < userQuestions.length) {
              const question = userQuestions[questionIndex]
              if (question && question.id !== currentQuestion?.id) {
                setCurrentQuestion(question)
                setIsAnswered(false)
                setSelectedAnswerIndex(null)
                setAnswerResult(null)
                setTimeLeft(15)
                setQuestionStartTime(new Date(state.questionStartTime))
              }
            }
          }

          // Update timer based on question start time
          if (state.questionStartTime && !isAnswered) {
            const startTime = new Date(state.questionStartTime).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000)
            const remaining = Math.max(0, 15 - elapsed)
            setTimeLeft(remaining)
          }
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
  }, [currentUser, currentQuestion, userQuestions])

  // Timer effect
  useEffect(() => {
    if (!quizState?.isActive || isAnswered || !questionStartTime) return

    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        const elapsed = Math.floor((Date.now() - questionStartTime.getTime()) / 1000)
        const remaining = Math.max(0, 15 - elapsed)
        setTimeLeft(remaining)
      }, 100)
    } else {
      // Time's up
      setIsAnswered(true)
      setTimeUp(true)
      setShowLeaderboard(true)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, quizState?.isActive, isAnswered, questionStartTime])

  const handleAnswerSelect = async (answerIndex: number) => {
    if (isAnswered || !currentQuestion || !quizState?.isActive) return

    const timeTaken = questionStartTime
      ? Math.floor((Date.now() - questionStartTime.getTime()) / 1000)
      : 15

    setIsAnswered(true)
    setSelectedAnswerIndex(answerIndex)

    try {
      const response = await fetch("/api/quiz/live", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.userId || currentUser.email,
          name: currentUser.name,
          rollNo: currentUser.rollNo,
          questionId: currentQuestion.id,
          selectedOption: answerIndex,
          timeTaken,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        // Store the result
        setAnswerResult({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned || 0,
        })
        
        // Update local points
        if (result.isCorrect) {
          setUserPoints((prev) => prev + (result.pointsEarned || 0))
        }
      }
    } catch (error) {
      console.error("Error submitting answer:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  // Waiting for quiz to start
  if (!quizState?.isActive && !quizState?.countdownActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <Card className="max-w-md mx-4 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="text-center p-8">
            <div className="mb-6">
              <div className="animate-pulse">
                <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Waiting for Quiz to Start</h2>
            <p className="text-gray-600 mb-6">
              The admin will start the quiz shortly. Please wait...
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>👤 <strong>{currentUser?.name}</strong></p>
              <p>🎯 Ready to compete!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {showCountdown && quizState?.countdownActive && (
        <Countdown
          onComplete={() => setShowCountdown(false)}
          startValue={5}
          currentValue={quizState.countdownValue}
        />
      )}

      {/* Header */}
      <header className="bg-slate-700 text-white shadow-lg sticky top-0 z-10 border-b border-slate-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-white">CyberVaani Quiz</h1>
                <p className="text-sm text-slate-300">
                  Question {quizState?.currentQuestionIndex !== undefined ? quizState.currentQuestionIndex + 1 : 0} of {quizState?.totalQuestions || 10}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-4">
                {userRank && (
                  <div className="flex items-center gap-2 bg-slate-600 px-3 py-1.5 rounded-full">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span className="font-bold text-white">Rank #{userRank}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-slate-600 px-3 py-1.5 rounded-full">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <span className="font-bold text-white">{userPoints} pts</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 mt-1">{currentUser?.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Section */}
          <div className="lg:col-span-2">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-600">
                  {quizState?.currentQuestionIndex !== undefined ? quizState.currentQuestionIndex + 1 : 0} / {quizState?.totalQuestions || 10}
                </span>
              </div>
              <Progress
                value={
                  quizState?.currentQuestionIndex !== undefined && quizState?.totalQuestions
                    ? ((quizState.currentQuestionIndex + 1) / quizState.totalQuestions) * 100
                    : 0
                }
                className="h-2 bg-blue-100"
              />
            </div>

            {/* Timer */}
            {quizState?.isActive && currentQuestion && (
              <div className="flex justify-center mb-6">
                <div
                  className={`flex items-center gap-3 px-8 py-4 rounded-2xl shadow-lg transform transition-all ${
                    timeLeft <= 5 
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse scale-105" 
                      : timeLeft <= 10
                        ? "bg-gradient-to-r from-orange-400 to-orange-500 text-white"
                        : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                  }`}
                >
                  <Clock className="h-6 w-6" />
                  <span className="font-mono text-3xl font-bold">{formatTime(timeLeft)}</span>
                  <span className="text-sm opacity-90">seconds</span>
                </div>
              </div>
            )}

            {/* Question Card */}
            {currentQuestion && quizState?.isActive && (
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm mb-6 transform hover:scale-[1.01] transition-all">
                <CardHeader className="pb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md">
                      {currentQuestion.category.replace("-", " ").toUpperCase()}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded-full">
                      Q{quizState?.currentQuestionIndex !== undefined ? quizState.currentQuestionIndex + 1 : 0}
                    </span>
                  </div>
                  <CardTitle className="text-2xl leading-relaxed text-balance font-bold text-gray-900">
                    {currentQuestion.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = selectedAnswerIndex === index
                      const isCorrect = index === currentQuestion.correctAnswer
                      const showResult = isAnswered && answerResult !== null

                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={isAnswered || !quizState?.isActive}
                          className={`w-full p-5 text-left rounded-xl border-2 transition-all duration-300 transform ${
                            showResult
                              ? isCorrect
                                ? "border-green-500 bg-gradient-to-r from-green-50 to-green-100 text-green-800 shadow-lg scale-[1.02]"
                                : isSelected && !isCorrect
                                  ? "border-red-500 bg-gradient-to-r from-red-50 to-red-100 text-red-800 shadow-lg scale-[1.02]"
                                  : "border-gray-200 bg-gray-50 text-gray-600"
                              : isSelected
                                ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-800 shadow-lg scale-[1.02]"
                                : "border-gray-200 bg-white hover:border-indigo-400 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 text-gray-800 hover:shadow-xl hover:scale-[1.01]"
                          } ${isAnswered || !quizState?.isActive ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-pretty leading-relaxed font-medium">{option}</span>
                            {showResult && isCorrect && (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            )}
                            {showResult && isSelected && !isCorrect && (
                              <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs">✕</span>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Answer Submitted Message */}
            {isAnswered && answerResult && !showLeaderboard && (
              <Card className={`shadow-lg border-0 ${
                answerResult.isCorrect 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <CardContent className="p-6 text-center">
                  {answerResult.isCorrect ? (
                    <>
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-green-800">Correct Answer! 🎉</p>
                      <p className="text-sm text-green-700 mt-2">
                        You earned <span className="font-bold">{answerResult.pointsEarned} points</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-2xl">✕</span>
                      </div>
                      <p className="text-lg font-semibold text-red-800">Incorrect Answer</p>
                      <p className="text-sm text-red-700 mt-2">
                        Better luck next time!
                      </p>
                    </>
                  )}
                  <p className="text-xs text-gray-600 mt-4">
                    Waiting for next question...
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Full Leaderboard when time ends or question ends */}
            {showLeaderboard && timeUp && (
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-indigo-50/50 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg">
                  <CardTitle className="text-2xl flex items-center justify-center gap-3">
                    <Trophy className="h-8 w-8 text-yellow-300" />
                    Leaderboard - Top 10
                  </CardTitle>
                  <p className="text-center text-white/90 mt-2">
                    {quizState?.endedAt ? "Quiz Completed! Final Rankings" : "Time's Up! Here are the current rankings"}
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {leaderboard.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No rankings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Top 10 */}
                      {leaderboard.slice(0, 10).map((entry, index) => {
                        const isCurrentUser =
                          entry.userId === currentUser?.userId ||
                          entry.rollNo === currentUser?.rollNo

                        return (
                          <div
                            key={entry.userId}
                            className={`p-4 rounded-xl border-2 transition-all transform ${
                              index === 0
                                ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-400 shadow-lg scale-[1.02]"
                                : index === 1
                                  ? "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-400 shadow-md"
                                  : index === 2
                                    ? "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-400 shadow-md"
                                    : isCurrentUser
                                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-lg scale-[1.01]"
                                      : "bg-white border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                    index === 0
                                      ? "bg-yellow-500 text-white"
                                      : index === 1
                                        ? "bg-gray-400 text-white"
                                        : index === 2
                                          ? "bg-orange-500 text-white"
                                          : "bg-indigo-500 text-white"
                                  }`}
                                >
                                  {index + 1}
                                </div>
                                <div>
                                  <p className={`font-bold text-lg ${
                                    isCurrentUser ? "text-blue-700" : "text-gray-900"
                                  }`}>
                                    {entry.name}
                                    {isCurrentUser && <span className="ml-2 text-blue-600">(You)</span>}
                                  </p>
                                  <p className="text-xs text-gray-600">{entry.rollNo}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-green-600">{entry.totalPoints} pts</p>
                                <p className="text-xs text-gray-600">
                                  {entry.score}/{entry.totalQuestions} ({entry.percentage}%)
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* User's position if not in top 10 */}
                      {userRank && userRank > 10 && (
                        <>
                          <div className="border-t-2 border-dashed border-gray-300 my-4"></div>
                          <div className="p-4 rounded-xl border-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-blue-500 text-white">
                                  {userRank}
                                </div>
                                <div>
                                  <p className="font-bold text-lg text-blue-700">
                                    {currentUser?.name} <span className="text-blue-600">(You)</span>
                                  </p>
                                  <p className="text-xs text-gray-600">{currentUser?.rollNo}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-green-600">{userPoints} pts</p>
                                <p className="text-xs text-gray-600">Your position</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">Waiting for next question...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Leaderboard Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No rankings yet</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {leaderboard.slice(0, 20).map((entry, index) => {
                      const isCurrentUser =
                        entry.userId === currentUser?.userId ||
                        entry.rollNo === currentUser?.rollNo

                      return (
                        <div
                          key={entry.userId}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isCurrentUser
                              ? "bg-blue-50 border-blue-300"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold ${
                                  index === 0
                                    ? "text-yellow-600"
                                    : index === 1
                                      ? "text-gray-600"
                                      : index === 2
                                        ? "text-orange-600"
                                        : "text-gray-500"
                                }`}
                              >
                                #{entry.rank}
                              </span>
                              <span
                                className={`text-sm font-medium ${
                                  isCurrentUser ? "text-blue-700" : "text-gray-700"
                                }`}
                              >
                                {entry.name}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-green-600">
                              {entry.totalPoints} pts
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {entry.score}/{entry.totalQuestions} ({entry.percentage}%)
                          </div>
                        </div>
                      )
                    })}
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
