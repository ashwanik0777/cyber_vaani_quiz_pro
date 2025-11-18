# 🛡️ Cybersecurity Awareness Quiz Platform

A modern, interactive quiz application designed to test and improve cybersecurity knowledge among students and professionals. Built with Next.js 14, TypeScript, and MongoDB.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 📋 Table of Contents

- [Features](#-features)
- [Demo](#-demo)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🎯 Core Features
- **Interactive Quiz System**: 15-second timer per question with 10 random questions
- **Comprehensive Question Bank**: 100+ questions across 4 cybersecurity categories
- **Real-time Validation**: Instant feedback on user inputs
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Progress Tracking**: Visual progress indicators and completion status

### 📊 Admin Dashboard
- **User Management**: View all participants and their performance
- **Statistics Dashboard**: Comprehensive analytics and insights
- **Reward System**: Track eligible participants (80%+ score threshold)
- **Data Export**: Download results for further analysis

### 🔒 Security Features
- **Input Validation**: Robust validation for all user inputs
- **Session Management**: Secure session handling
- **Environment-based Configuration**: Secure credential management
- **Rate Limiting**: Protection against abuse

## 🎥 Demo

### User Flow
1. **Registration**: Enter personal details with validation
2. **Quiz Taking**: Answer 10 timed questions on cybersecurity
3. **Results**: View score, feedback, and reward eligibility
4. **Admin Panel**: Comprehensive dashboard for administrators

### Question Categories
- **Cybercrime**: Phishing, malware, social engineering
- **Cyber Literacy**: Digital awareness and best practices
- **Online Safety**: Safe browsing and communication
- **Digital Security**: Encryption, authentication, privacy

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **State Management**: React Hooks

### Backend
- **API**: Next.js API Routes
- **Database**: MongoDB Atlas
- **Validation**: Custom validation utilities
- **Authentication**: Basic auth for admin routes

### Development Tools
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Code Formatting**: Prettier (via ESLint)
- **Type Checking**: TypeScript

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- MongoDB Atlas account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ashwanik0777/Cyber-Quiz.git
   cd Cyber-Quiz
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration (see [Environment Variables](#-environment-variables))

4. **Run the development server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
pnpm build
pnpm start
```


### Environment Setup Guide

1. **MongoDB Atlas Setup**:
   - Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a new cluster
   - Add your IP address to the whitelist
   - Create a database user
   - Get your connection string

2. **Admin Credentials**:
   - Set secure username and password for admin access
   - Consider using environment-specific credentials

## 📁 Project Structure

```
├── app/                          # Next.js App Router
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home/Registration page
│   ├── admin/
│   │   └── page.tsx             # Admin dashboard
│   ├── api/                     # API routes
│   │   ├── admin/
│   │   │   ├── reward/route.ts  # Reward management
│   │   │   └── users/route.ts   # User data retrieval
│   │   ├── quiz/
│   │   │   ├── check/route.ts   # Quiz validation
│   │   │   └── submit/route.ts  # Quiz submission
│   │   └── users/route.ts       # User registration
│   ├── quiz/
│   │   └── page.tsx             # Quiz interface
│   └── results/
│       └── page.tsx             # Results display
├── components/
│   ├── theme-provider.tsx       # Theme configuration
│   └── ui/                      # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ... (30+ components)
├── hooks/                       # Custom React hooks
├── lib/                         # Utility functions
│   ├── models.ts                # TypeScript interfaces
│   ├── mongodb.ts               # Database connection
│   ├── quiz-data.ts             # Question bank
│   ├── quiz-utils.ts            # Helper functions
│   └── utils.ts                 # General utilities
├── public/                      # Static assets
└── styles/                      # Additional styles
```

## 🎯 Validation Rules

### User Input Validation
- **Name**: Minimum 2 characters
- **Roll Number**: Format `235UCS001` (3 digits + 3 letters + 3 digits)
- **Mobile**: 10-digit Indian mobile number (starts with 6-9)
- **Email**: Valid email format

### Quiz Rules
- **Time Limit**: 15 seconds per question
- **Questions**: 10 random questions from 100+ question pool
- **Scoring**: Percentage-based (correct answers / total questions × 100)
- **Reward Eligibility**: 80% or higher score

## 🔒 Security Considerations

1. **Input Sanitization**: All user inputs are validated and sanitized
2. **Environment Variables**: Sensitive data stored in environment variables
3. **Database Security**: MongoDB connection with authentication
4. **Session Management**: Secure session handling for quiz state
5. **Admin Protection**: Basic authentication for admin routes

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment
```bash
pnpm build
pnpm start
```

## 🧪 Testing

### Running Tests
```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run build test
pnpm build
```

## 📈 Performance Optimizations

- **Static Generation**: Pre-rendered pages where possible
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting with Next.js
- **Database Connection Pooling**: Efficient MongoDB connections
- **Caching**: Strategic caching for static content

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Radix UI](https://www.radix-ui.com/) for accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- [MongoDB](https://www.mongodb.com/) for the database solution
- [Lucide](https://lucide.dev/) for beautiful icons

## 📞 Support

If you have any questions or need help, please:

1. Check the [Issues](https://github.com/ashwanik0777/Cyber-Quiz/issues) page
2. Create a new issue if your problem isn't addressed
3. Contact the maintainers

---

**Made with ❤️ for cybersecurity education**

---

## 📊 Project Statistics

- **Total Questions**: 100+ cybersecurity questions
- **Categories**: 4 main cybersecurity domains
- **UI Components**: 30+ reusable components
- **API Endpoints**: 6 RESTful endpoints
- **Languages**: TypeScript, JavaScript
- **Framework**: Next.js 14 with App Router
