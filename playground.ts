/* eslint-disable no-console */
import { Redis, s } from "@upstash/redis"

const redis = Redis.fromEnv()

// await redis.search.index("user-index").drop();

const schema = s.object({
  name: s.string(),

  age: s.number(),
  isStudent: s.boolean(),
  isEmployed: s.boolean(),

  // M or F
  gender: s.string(),

  contact: s.object({
    email: s.string(),
    phone: s.string(),
  }),
})

const index = redis.search.index({
  name: "user-index",
  schema: schema,
})

if (await index.describe()) {
  console.log("index exists, dropping")
  await index.drop()
  console.log("index dropped")
}

console.log("creating index")
await redis.search.createIndex({
  dataType: "string",
  prefix: "user:",
  name: "user-index",
  schema: schema,
})

console.log("created index")

// await index.waitIndexing();

console.log("indexing done")

const res = await index.query({
  filter: {
    $and: {
      name: {
        $eq: "Yusuf",
      },
    },
    "contact.email": "asd",
  },
})

console.log("query result, should be empty:", res)

// Create the data

await redis.mset({
  "user:yusuf": JSON.stringify({
    name: "Yusuf",
    age: 30,
    isStudent: false,
    isEmployed: true,
    gender: "M",
    contact: {
      email: "yusuf@example.com",
      phone: "1234567890",
    },
  }),
  "user:fatima": JSON.stringify({
    name: "Fatima",
    age: 35,
    isStudent: true,
    isEmployed: false,
    gender: "F",
    contact: {
      email: "fatima@example.com",
      phone: "0987654321",
    },
  }),
  // josh
  // arda
  // ali
  // sertug
  "user:josh": JSON.stringify({
    name: "Josh",
    age: 22,
    isStudent: true,
    isEmployed: false,
    gender: "M",
    contact: {
      email: "josh@example.com",
      phone: "0987654321",
    },
  }),
  "user:arda": JSON.stringify({
    name: "Arda",
    age: 20,
    isStudent: true,
    isEmployed: false,
    gender: "M",
    contact: {
      email: "arda@example.com",
      phone: "0987654321",
    },
  }),
  "user:ali": JSON.stringify({
    name: "Ali",
    age: 15,
    isStudent: true,
    isEmployed: false,
    gender: "M",
    contact: {
      email: "ali@example.com",
      phone: "0987654321",
    },
  }),
  "user:sertug": JSON.stringify({
    name: "Sertug",
    age: 5,
    isStudent: true,
    isEmployed: false,
    gender: "M",
    contact: {
      email: "sertug@example.com",
      phone: "0987654321",
    },
  }),
})

console.log("created data")

// await index.waitIndexing();

console.log("indexing done")

const res2 = await index.query({
  filter: {
    $and: {
      name: {
        $eq: "Yusuf",
      },
    },
  },
})

console.log("query result, should not be empty:", res2)

console.log(await redis.type("user-index"))
