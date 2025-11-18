"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Award, ExternalLink, Home, Users, CheckCircle, XCircle } from "lucide-react"
import { getScoreColor, getScoreMessage } from "@/lib/quiz-utils"
import type { QuizQuestion } from "@/lib/quiz-data"

interface QuizResults {
  user: {
    name: string
    rollNo: string
    mobileNo: string
    email: string
    userId?: string
  }
  questions: QuizQuestion[]
  answers: number[]
  score: number
  totalQuestions: number
  percentage: number
  completedAt: string
  resultId?: string
  error?: string
}

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<QuizResults | null>(null)
  const [score, setScore] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showAnswers, setShowAnswers] = useState(false)

  // WhatsApp group link (replace with your actual group link)
  const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/DdmuafKHRoTAYSaLTeBzqP"

  useEffect(() => {
    const quizData = sessionStorage.getItem("quizResults")
    if (!quizData) {
      router.push("/")
      return
    }

    const parsedResults: QuizResults = JSON.parse(quizData)
    setResults(parsedResults)

    setScore(parsedResults.percentage || 0)
    setIsLoading(false)

    // Clear session storage
    sessionStorage.removeItem("quizResults")
    sessionStorage.removeItem("currentUser")
  }, [router])

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <Trophy className="h-8 w-8 text-yellow-500" />
    if (score >= 80) return <Award className="h-8 w-8 text-blue-500" />
    if (score >= 70) return <Star className="h-8 w-8 text-green-500" />
    return <Star className="h-8 w-8 text-gray-500" />
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { text: "Excellent", color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" }
    if (score >= 80) return { text: "Great", color: "bg-blue-100 text-blue-700 hover:bg-blue-100" }
    if (score >= 70) return { text: "Good", color: "bg-green-100 text-green-700 hover:bg-green-100" }
    if (score >= 60) return { text: "Fair", color: "bg-orange-100 text-orange-700 hover:bg-orange-100" }
    return { text: "Needs Improvement", color: "bg-red-100 text-red-700 hover:bg-red-100" }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Calculating results...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="text-center p-6">
            <p className="text-gray-600 mb-4">No quiz results found.</p>
            <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700">
              Take Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const correctAnswers = results.answers.filter((answer, index) => answer === results.questions[index].correctAnswer)
  const scoreBadge = getScoreBadge(score)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Quiz Results</h1>
            <p className="text-sm text-blue-600">CyberVaani Quiz Completed</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Database Error Alert */}
        {results.error && (
          <Card className="shadow-lg border-0 bg-yellow-50 border-yellow-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Trophy className="h-5 w-5" />
                <p className="text-sm">
                  <strong>Note:</strong> Your quiz was completed successfully, but there was an issue saving to the
                  database. Your results are displayed below.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Card */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm mb-6">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">{getScoreIcon(score)}</div>
            <CardTitle className="text-2xl text-gray-900">Congratulations, {results.user.name}!</CardTitle>
            <p className="text-gray-600">You have completed the CyberVaani Quiz</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="text-center">
              <div className="mb-4">
                <div className={`text-6xl font-bold ${getScoreColor(score)} mb-2`}>{score}%</div>
                <Badge className={scoreBadge.color}>{scoreBadge.text}</Badge>
              </div>
              <Progress value={score} className="h-3 mb-4" />
              <p className="text-gray-700 text-pretty leading-relaxed">{getScoreMessage(score)}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="text-2xl font-bold text-green-600">{results.score}</div>
                <div className="text-sm text-green-700">Correct Answers</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="text-2xl font-bold text-red-600">{results.totalQuestions - results.score}</div>
                <div className="text-sm text-red-700">Incorrect Answers</div>
              </div>
            </div>

            {/* User Details */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h3 className="font-semibold text-blue-900 mb-2">Quiz Details:</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  <strong>Name:</strong> {results.user.name}
                </p>
                <p>
                  <strong>Roll No:</strong> {results.user.rollNo}
                </p>
                <p>
                  <strong>Completed:</strong> {new Date(results.completedAt).toLocaleString()}
                </p>
                <p>
                  <strong>Questions:</strong> {results.questions.length} random questions
                </p>
              </div>
            </div>

            {/* Reward Eligibility */}
            {score >= 80 && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">Reward Eligible!</h3>
                </div>
                <p className="text-sm text-yellow-800">
                  Congratulations! You scored 80% or above and are eligible for rewards. Contact the admin for your
                  reward.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Answer Review */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Answer Review</CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowAnswers(!showAnswers)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {showAnswers ? "Hide Answers" : "Show Answers"}
              </Button>
            </div>
          </CardHeader>
          {showAnswers && (
            <CardContent>
              <div className="space-y-4">
                {results.questions.map((question, index) => {
                  const userAnswer = results.answers[index]
                  const correctAnswer = question.correctAnswer
                  const isCorrect = userAnswer === correctAnswer

                  return (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 mt-1">
                          {isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2 text-pretty">
                            {index + 1}. {question.question}
                          </p>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className={`p-2 rounded text-sm ${
                                  optionIndex === correctAnswer
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : optionIndex === userAnswer && !isCorrect
                                      ? "bg-red-100 text-red-800 border border-red-200"
                                      : "bg-gray-50 text-gray-700"
                                }`}
                              >
                                <span className="font-medium">{String.fromCharCode(65 + optionIndex)}. </span>
                                {option}
                                {optionIndex === correctAnswer && (
                                  <span className="ml-2 text-green-600 font-medium">(Correct)</span>
                                )}
                                {optionIndex === userAnswer && !isCorrect && (
                                  <span className="ml-2 text-red-600 font-medium">(Your Answer)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* WhatsApp Group Link */}
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Join Our Community</h3>
              <p className="text-gray-600 mb-4 text-pretty">
                Connect with other CyberVaani enthusiasts and stay updated with the latest security tips and news.
              </p>
              <Button
                onClick={() => window.open(WHATSAPP_GROUP_LINK, "_blank")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Join WhatsApp Group
              </Button>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-4">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            {/* <Button
              onClick={() => router.push("/admin")}
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Admin Dashboard
            </Button> */}
          </div>
        </div>
      </main>
    </div>
  )
}
