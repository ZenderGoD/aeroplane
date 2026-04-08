import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          },
        }
      : {}),
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
          },
        }
      : {}),
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache
    },
  },

  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "https://anuragair.com",
    "https://www.anuragair.com",
  ],
});
