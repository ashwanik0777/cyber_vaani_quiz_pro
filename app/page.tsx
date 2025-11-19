"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Brain, Lock, Users, Eye } from "lucide-react"
import { validateEmail, validateMobile, validateRollNo } from "@/lib/quiz-utils"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    mobileNo: "",
    email: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [visitorCount, setVisitorCount] = useState<number | null>(null)

  // Track visitor on page load
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        const response = await fetch("/api/visitors", {
          method: "POST",
        })
        if (response.ok) {
          const data = await response.json()
          setVisitorCount(data.totalVisitors)
        }
      } catch (error) {
        console.error("Error tracking visitor:", error)
      }
    }

    // Load visitor count
    const loadVisitorCount = async () => {
      try {
        const response = await fetch("/api/visitors")
        if (response.ok) {
          const data = await response.json()
          setVisitorCount(data.totalVisitors)
        }
      } catch (error) {
        console.error("Error loading visitor count:", error)
      }
    }

    // Track visitor first, then load count
    trackVisitor().then(() => {
      loadVisitorCount()
    })
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (!formData.rollNo.trim()) {
      newErrors.rollNo = "Roll number is required"
    } else if (!validateRollNo(formData.rollNo)) {
      newErrors.rollNo = "Roll number must be in format: 235UCS001 (3 numbers + 3 letters + 3 numbers)"
    }

    if (!formData.mobileNo.trim()) {
      newErrors.mobileNo = "Mobile number is required"
    } else if (!validateMobile(formData.mobileNo)) {
      newErrors.mobileNo = "Please enter a valid 10-digit mobile number"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const checkResponse = await fetch(
        `/api/quiz/check?rollNo=${encodeURIComponent(formData.rollNo)}&mobileNo=${encodeURIComponent(formData.mobileNo)}&email=${encodeURIComponent(formData.email)}`,
      )
      const checkData = await checkResponse.json()

      if (checkData.hasCompleted) {
        setErrors({ general: "You have already completed the quiz. Each user can only take the quiz once." })
        setIsLoading(false)
        return
      }

      const userResponse = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const userData = await userResponse.json()

      if (!userResponse.ok) {
        if (userResponse.status === 409) {
          setErrors({ general: "A user with this roll number, mobile number, or email already exists." })
        } else {
          setErrors({ general: userData.error || "An error occurred. Please try again." })
        }
        setIsLoading(false)
        return
      }

      // Store user data in session storage for quiz
      sessionStorage.setItem("currentUser", JSON.stringify({ ...formData, userId: userData.userId }))

      // Navigate to quiz
      router.push("/quiz")
    } catch (error) {
      console.error("Registration error:", error)
      setErrors({ general: "An error occurred. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">CyberVaani Quiz</h1>
              <p className="text-sm text-blue-600">Test Your Cyber Awareness</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-md">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-full">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-balance">Welcome to CyberVaani Quiz</h2>
          <p className="text-gray-600 text-pretty leading-relaxed">
            Test your knowledge about cybercrime, cyber literacy, and online safety. Complete your registration to start
            the quiz.
          </p>
        </div>

        {/* Registration Form */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg text-gray-900">Registration</CardTitle>
            <CardDescription className="text-gray-600">Please fill in your details to begin the quiz</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`h-11 ${errors.name ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-blue-500"}`}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Roll Number Field */}
              <div className="space-y-2">
                <Label htmlFor="rollNo" className="text-sm font-medium text-gray-700">
                  Roll Number
                </Label>
                <Input
                  id="rollNo"
                  type="text"
                  placeholder="Enter your roll number"
                  value={formData.rollNo}
                  onChange={(e) => handleInputChange("rollNo", e.target.value.toUpperCase())}
                  className={`h-11 ${errors.rollNo ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-blue-500"}`}
                />
                {errors.rollNo && <p className="text-sm text-red-600">{errors.rollNo}</p>}
              </div>

              {/* Mobile Number Field */}
              <div className="space-y-2">
                <Label htmlFor="mobileNo" className="text-sm font-medium text-gray-700">
                  Mobile Number
                </Label>
                <Input
                  id="mobileNo"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={formData.mobileNo}
                  onChange={(e) => handleInputChange("mobileNo", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className={`h-11 ${errors.mobileNo ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-blue-500"}`}
                />
                {errors.mobileNo && <p className="text-sm text-red-600">{errors.mobileNo}</p>}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value.toLowerCase())}
                  className={`h-11 ${errors.email ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-blue-500"}`}
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* General Error */}
              {errors.general && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{errors.general}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                {isLoading ? "Starting Quiz..." : "Start Quiz"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quiz Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2">Quiz Information:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 10 random questions</li>
            <li>• 15 seconds per question</li>
            <li>• Topics: Cybercrime, Cyber Literacy, Online Safety</li>
            <li>• Score 80%+ to be eligible for rewards</li>
          </ul>
        </div>

        {/* Admin Link */}
        {/* <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin")}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            Admin Dashboard
          </Button>
        </div> */}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-blue-100 py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <div className="space-y-2">
            
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} CyberVaani Quiz. All rights reserved.
            </p>
            <p className="text-sm text-gray-500">
              Designed & Developed by{" "}
              <a href="https://portfolio-ashwanik0777.vercel.app/" className="hover:underline"><span className="font-semibold text-blue-600">Ashwani Kushwaha</span></a>
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Eye className="h-4 w-4 text-blue-600" />
              <span>
                <span className="font-semibold">{visitorCount !== null ? visitorCount.toLocaleString() : "..."}</span> Visitors
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
