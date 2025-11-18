"use client"

import { useEffect, useState } from "react"

interface CountdownProps {
  onComplete: () => void
  startValue?: number
  currentValue?: number
}

export function Countdown({ onComplete, startValue = 5, currentValue }: CountdownProps) {
  const [count, setCount] = useState(currentValue ?? startValue)
  const [isVisible, setIsVisible] = useState(true)

  // Sync with server value
  useEffect(() => {
    if (currentValue !== undefined) {
      setCount(currentValue)
      if (currentValue === 0) {
        setTimeout(() => {
          setIsVisible(false)
          onComplete()
        }, 1000)
      }
    }
  }, [currentValue, onComplete])

  // Local countdown if no server value
  useEffect(() => {
    if (currentValue === undefined && count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (currentValue === undefined && count === 0) {
      setTimeout(() => {
        setIsVisible(false)
        onComplete()
      }, 500)
    }
  }, [count, currentValue, onComplete])

  if (!isVisible) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-900/95 via-purple-900/95 to-pink-900/95 backdrop-blur-md">
        <div className="relative">
          <div
            key={count}
            className="text-[250px] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 drop-shadow-2xl countdown-number"
            style={{
              textShadow: "0 0 40px rgba(255, 255, 255, 0.5), 0 0 80px rgba(255, 255, 255, 0.3)",
            }}
          >
            {count > 0 ? count : "GO!"}
          </div>
          {count > 0 && (
            <>
              <div className="absolute inset-0 rounded-full border-8 border-yellow-400/40 countdown-ring" />
              <div className="absolute inset-0 rounded-full border-4 border-orange-400/30 countdown-ring-2" />
            </>
          )}
          {count === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl font-bold text-yellow-400 animate-pulse">🚀</div>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        @keyframes zoomInOut {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.4) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes pulseRing {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.1;
          }
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
        }
        
        @keyframes pulseRing2 {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.05;
          }
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
        }
        
        .countdown-number {
          animation: zoomInOut 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
          filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.8));
        }
        
        .countdown-ring {
          animation: pulseRing 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .countdown-ring-2 {
          animation: pulseRing2 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </>
  )
}

