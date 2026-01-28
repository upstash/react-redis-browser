/* eslint-disable no-console */
import { Redis, s } from "@upstash/redis"

const redis = Redis.fromEnv()

// Random data pools
const firstNames = [
  "Yusuf",
  "Fatima",
  "Josh",
  "Arda",
  "Ali",
  "Sertug",
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

// Helper functions
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
  const age = randomInt(5, 65)
  const isStudent = age < 25 ? Math.random() > 0.3 : Math.random() > 0.8
  const isEmployed = age >= 18 ? Math.random() > 0.3 : false
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

const schema = s.object({
  name: s.string(),
  age: s.number(),
  isStudent: s.boolean(),
  isEmployed: s.boolean(),
  gender: s.string(),
  contact: s.object({
    email: s.string(),
    phone: s.string(),
  }),
})

const INDEX_COUNT = 10
console.log(`Creating ${INDEX_COUNT} indexes...`)

for (let i = 1; i <= INDEX_COUNT; i++) {
  const indexName = `user-index-${i}`
  const index = redis.search.index({
    name: indexName,
    schema: schema,
  })

  try {
    if (await index.describe()) {
      console.log(`Index ${indexName} exists, dropping`)
      await index.drop()
    }
  } catch {
    // Index doesn't exist, that's fine
  }

  await redis.search.createIndex({
    dataType: "string",
    prefix: "user:",
    name: indexName,
    schema: schema,
  })

  console.log(`Created index ${i}/${INDEX_COUNT}: ${indexName}`)
}

console.log("All indexes created")

// Create 100 user entries
const USER_COUNT = 100
console.log(`\nCreating ${USER_COUNT} user entries...`)

const userData: Record<string, string> = {}
for (let i = 1; i <= USER_COUNT; i++) {
  const user = generateUser(i)
  const key = `user:${user.name.toLowerCase().replace(" ", "-")}-${i}`
  userData[key] = JSON.stringify(user)
}

await redis.mset(userData)

console.log(`Created ${USER_COUNT} user entries`)

// Test query on first index
const testIndex = redis.search.index({
  name: "user-index-1",
  schema: schema,
})

console.log("\nWaiting for indexing...")
await new Promise((resolve) => setTimeout(resolve, 2000))

const queryResult = await testIndex.query({
  filter: {
    isStudent: true,
  },
})

console.log(`Test query result (students): found ${queryResult.length} results`)

console.log("\nDone!")
