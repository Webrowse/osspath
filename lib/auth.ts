import NextAuth, { type NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { cache } from "react"

const providers: NextAuthConfig["providers"] = [
  GitHub({
    clientId: process.env.GITHUB_ID!,
    clientSecret: process.env.GITHUB_SECRET!,
    allowDangerousEmailAccountLinking: true,
  }),
]

// Google is optional: only enabled when its credentials are configured.
export const googleEnabled = Boolean(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET)
if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers,
  pages: {
    signIn: "/admin",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})

// Deduplicates auth() calls within the same request render tree
export const getSession = cache(auth)
