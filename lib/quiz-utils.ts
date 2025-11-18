// Utility functions for quiz functionality
export function calculateScore(answers: number[], correctAnswers: number[]): number {
  let correct = 0
  for (let i = 0; i < answers.length; i++) {
    if (answers[i] === correctAnswers[i]) {
      correct++
    }
  }
  return Math.round((correct / answers.length) * 100)
}

export function formatTime(seconds: number): string {
  return seconds.toString().padStart(2, "0")
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateMobile(mobile: string): boolean {
  const mobileRegex = /^[6-9]\d{9}$/ // Indian mobile number format
  return mobileRegex.test(mobile)
}

export function validateRollNo(rollNo: string): boolean {
  const rollNoRegex = /^\d{3}[A-Z]{3}\d{3}$/ // Format: 235UCS001
  return rollNoRegex.test(rollNo.trim())
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-yellow-600"
  return "text-red-600"
}

export function getScoreMessage(score: number): string {
  if (score >= 90) return "Excellent! Outstanding performance!"
  if (score >= 80) return "Great job! You have good cyber awareness!"
  if (score >= 70) return "Good work! Keep learning about cybersecurity!"
  if (score >= 60) return "Fair performance. Consider improving your cyber knowledge!"
  return "Needs improvement. Please study more about cybersecurity!"
}

// Get unique questions for each user based on userId hash
export function getUserSpecificQuestions(userId: string, count: number = 10): number[] {
  // Create a simple hash from userId
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Use hash as seed for random selection
  const { quizQuestions } = require("./quiz-data")
  const totalQuestions = quizQuestions.length
  const selectedIds: number[] = []
  
  // Use seeded random to get different questions per user
  let seed = Math.abs(hash)
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  
  const availableIds = quizQuestions.map((q: any) => q.id)
  
  while (selectedIds.length < count && availableIds.length > 0) {
    const index = Math.floor(random() * availableIds.length)
    selectedIds.push(availableIds[index])
    availableIds.splice(index, 1)
  }
  
  return selectedIds
}

// Calculate points based on time and position
export function calculatePoints(timeTaken: number, isFirstCorrect: boolean, maxTime: number = 15): number {
  if (timeTaken < 0 || timeTaken > maxTime) return 0
  
  // Base points decrease with time (max 100 points)
  const basePoints = Math.max(0, 100 - (timeTaken * 5))
  
  // First correct answer gets bonus
  const firstAnswerBonus = isFirstCorrect ? 50 : 0
  
  return Math.round(basePoints + firstAnswerBonus)
}

// Format points display
export function formatPoints(points: number): string {
  return points.toLocaleString()
}