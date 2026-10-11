"use client"

import { useEffect } from "react"

export function KidSessionKeepAlive() {
  useEffect(() => {
    void fetch("/api/kid-session/refresh", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {})
  }, [])

  return null
}
