import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { User, QuizState } from "@/lib/models"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, rollNo, mobileNo, email } = body

    // Validate required fields
    if (!name || !rollNo || !mobileNo || !email) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")
    const quizStateCollection = db.collection<QuizState>("quizState")
    const sessionRegistrationsCollection = db.collection("sessionRegistrations")
    const state = await quizStateCollection.findOne({})
    const activeSessionId = state?.activeSessionId || null

    if (activeSessionId) {
      const existingRegistration = await sessionRegistrationsCollection.findOne({
        sessionId: activeSessionId,
        $or: [{ rollNo }, { mobileNo }, { email }],
      })

      if (existingRegistration) {
        return NextResponse.json(
          { error: "You have already entered the current quiz session." },
          { status: 409 },
        )
      }
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ rollNo: rollNo }, { mobileNo: mobileNo }, { email: email }],
    })

    if (existingUser) {
      if (activeSessionId) {
        await sessionRegistrationsCollection.insertOne({
          sessionId: activeSessionId,
          userId: existingUser._id?.toString() || "",
          rollNo,
          mobileNo,
          email,
          createdAt: new Date(),
        })
      }

      return NextResponse.json({
        success: true,
        userId: existingUser._id,
        user: existingUser,
        isExistingUser: true,
      })
    }

    // Create new user
    const newUser: User = {
      name,
      rollNo,
      mobileNo,
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await usersCollection.insertOne(newUser)

    if (activeSessionId) {
      await sessionRegistrationsCollection.insertOne({
        sessionId: activeSessionId,
        userId: result.insertedId.toString(),
        rollNo,
        mobileNo,
        email,
        createdAt: new Date(),
      })
    }

    return NextResponse.json({
      success: true,
      userId: result.insertedId,
      user: { ...newUser, _id: result.insertedId },
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rollNo = searchParams.get("rollNo")
    const mobileNo = searchParams.get("mobileNo")
    const email = searchParams.get("email")

    if (!rollNo && !mobileNo && !email) {
      return NextResponse.json({ error: "At least one identifier is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")

    const query: any = { $or: [] }
    if (rollNo) query.$or.push({ rollNo })
    if (mobileNo) query.$or.push({ mobileNo })
    if (email) query.$or.push({ email })

    const user = await usersCollection.findOne(query)

    if (!user) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    return NextResponse.json({
      exists: true,
      user: user,
    })
  } catch (error) {
    console.error("Error checking user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
