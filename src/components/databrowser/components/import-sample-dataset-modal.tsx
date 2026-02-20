import { useEffect, useState } from "react"
import { useRedis } from "@/redis-context"
import { useTab } from "@/tab-provider"

import { queryClient } from "@/lib/clients"
import { formatUpstashErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

import { FETCH_SEARCH_INDEXES_QUERY_KEY } from "../hooks/use-fetch-search-indexes"

const INDEX_NAME = "users-index"
const USER_COUNT = 100

const firstNames = [
  "Emma",
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "Ethan",
  "Sophia",
  "Mason",
  "Isabella",
  "William",
  "Mia",
  "James",
  "Charlotte",
  "Benjamin",
  "Amelia",
  "Lucas",
  "Harper",
  "Henry",
  "Evelyn",
  "Alexander",
  "Abigail",
  "Michael",
  "Emily",
  "Daniel",
  "Elizabeth",
  "Matthew",
  "Sofia",
  "Jackson",
  "Avery",
  "Sebastian",
  "Ella",
  "David",
  "Scarlett",
  "Joseph",
  "Grace",
  "Samuel",
  "Chloe",
  "Owen",
  "Victoria",
  "John",
  "Riley",
  "Luke",
  "Aria",
  "Gabriel",
  "Lily",
  "Anthony",
  "Hannah",
  "Dylan",
  "Zoey",
  "Andrew",
]

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
]

const emailDomains = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "proton.me",
  "icloud.com",
  "mail.com",
]

const areaCodes = ["212", "310", "415", "305", "312", "206", "404", "617", "702", "503"]

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPhone(): string {
  return `${randomElement(areaCodes)}${randomInt(100, 999)}${randomInt(1000, 9999)}`
}

function generateUser(id: number) {
  const firstName = randomElement(firstNames)
  const lastName = randomElement(lastNames)
  const name = `${firstName} ${lastName}`
  const age = randomInt(18, 65)
  const isStudent = age < 25 ? Math.random() > 0.3 : Math.random() > 0.8
  const isEmployed = Math.random() > 0.3
  const gender = Math.random() > 0.5 ? "M" : "F"
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@${randomElement(emailDomains)}`
  const phone = randomPhone()

  return {
    name,
    age,
    isStudent,
    isEmployed,
    gender,
    contact: {
      email,
      phone,
    },
  }
}

export const ImportSampleDatasetModal = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const { redisNoPipeline: redis } = useRedis()
  const { setValuesSearchIndex } = useTab()
  const [status, setStatus] = useState<string | undefined>()
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | undefined>()

  useEffect(() => {
    if (!open) return
    setProgress(0)
    setStatus(undefined)
    setError(undefined)
  }, [open])

  const handleImport = async () => {
    try {
      setStatus("Creating index...")
      setProgress(10)

      // Check if index already exists
      const index = redis.search.index({ name: INDEX_NAME })
      try {
        if (await index.describe()) {
          await index.drop()
        }
      } catch {
        // Index doesn't exist, that's fine
      }

      // Create index with schema
      await redis.search.createIndex({
        dataType: "string",
        prefix: "user:",
        name: INDEX_NAME,
        schema: {
          name: { type: "TEXT" },
          age: { type: "F64" },
          isStudent: { type: "BOOL" },
          isEmployed: { type: "BOOL" },
          gender: { type: "TEXT" },
          "contact.email": { type: "TEXT" },
          "contact.phone": { type: "TEXT" },
        },
      })

      setStatus("Creating user data...")
      setProgress(30)

      // Generate and store user data
      const userData: Record<string, string> = {}
      for (let i = 1; i <= USER_COUNT; i++) {
        const user = generateUser(i)
        const key = `user:${user.name.toLowerCase().replace(" ", "-")}-${i}`
        userData[key] = JSON.stringify(user)
      }

      setProgress(50)
      await redis.mset(userData)

      setStatus("Waiting for indexing...")
      setProgress(70)

      // Wait for indexing to complete
      await redis.search.index({ name: INDEX_NAME }).waitIndexing()

      setStatus("Done!")
      setProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Invalidate queries and select the new index
      queryClient.invalidateQueries({
        queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY],
      })
      setValuesSearchIndex(INDEX_NAME)

      onOpenChange(false)
    } catch (catchedError) {
      setError(catchedError instanceof Error ? catchedError : new Error(String(catchedError)))
      setStatus(undefined)
    }
  }

  const isRunning = status !== undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isRunning) onOpenChange(isOpen)
      }}
    >
      <DialogContent
        onInteractOutside={(e) => {
          if (isRunning) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isRunning) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Import Sample Dataset</DialogTitle>
          {!isRunning && !error && (
            <DialogDescription>
              This will create a <strong>users-index</strong> with 100 sample user records.
              <br />
              <br />
              Each user has name, age, gender, student/employment status, and contact information.
            </DialogDescription>
          )}
        </DialogHeader>

        {isRunning && (
          <div className="flex flex-col gap-2 py-4">
            <p className="text-sm text-zinc-500">{status}</p>
            <Progress value={progress} />
          </div>
        )}

        {error && (
          <div className="w-full break-words text-sm text-red-500">
            {formatUpstashErrorMessage(error)}
          </div>
        )}

        <DialogFooter>
          {!isRunning && !error && (
            <>
              <Button onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleImport}>
                Import
              </Button>
            </>
          )}
          {error && <Button onClick={() => onOpenChange(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
