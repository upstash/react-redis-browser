import { useState } from "react"
import { useCredentialsStore } from "@/playground/credentials-store"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CredentialsForm() {
  const { setCredentials } = useCredentialsStore()
  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    if (!url || !token) {
      setError("Both URL and token are required")
      setIsSubmitting(false)
      return
    }

    // Simple validation for URL format
    if (!url.startsWith("https://")) {
      setError("URL should start with https://")
      setIsSubmitting(false)
      return
    }

    setCredentials({ url, token })
    setIsSubmitting(false)
  }

  return (
    <div className="mx-auto mt-[150px] max-w-[400px] space-y-4 rounded-md p-4 shadow-md">
      <h2 className="text-center text-xl font-semibold">Connect to Redis</h2>
      <p className="text-zinc-500">
        These credentials will be saved in your browser local storage.
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-400 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.upstash.io"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">Token</Label>
          <Input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Button type="submit" className="w-full" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Connecting..." : "Connect to Redis"}
        </Button>
      </form>
    </div>
  )
}
