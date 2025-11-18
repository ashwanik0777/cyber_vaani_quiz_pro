import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { User } from "@/lib/models"

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

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ rollNo: rollNo }, { mobileNo: mobileNo }, { email: email }],
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this roll number, mobile number, or email" },
        { status: 409 },
      )
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
