import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { cache } from "react"
import { captureServerEvent } from "@/lib/analytics"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      const userId = (user as { id: string }).id
      if (!userId) return
      await captureServerEvent(userId, {
        event: "sign_in",
        props: {
          provider: account?.provider ?? "unknown",
          is_new_user: isNewUser ?? false,
        },
      })
    },
  },
})

// Deduplicates auth() calls within the same request render tree
export const getSession = cache(auth)
