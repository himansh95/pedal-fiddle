import { Timestamp } from 'firebase-admin/firestore';
import NextAuth from 'next-auth';
import Strava from 'next-auth/providers/strava';
import { encrypt } from '@/lib/encryption';
import { db } from '@/lib/firebase';
import { seedDefaultSettings } from '@/lib/db/settings';

// Raw Strava userinfo response shape
interface StravaProfile {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  username: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Strava({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read,profile:read_all,activity:read_all,activity:write',
          approval_prompt: 'auto',
          response_type: 'code',
        },
      },
      // Strava doesn't return an email — use a synthetic one so next-auth is happy
      profile(profile) {
        const p = profile as unknown as StravaProfile;
        return {
          id: String(p.id),
          name: `${p.firstname} ${p.lastname}`,
          email: `${p.id}@strava.local`,
          image: p.profile,
        };
      },
    }),
  ],

  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        try {
          const stravaProfile = profile as unknown as StravaProfile;
          const userId = String(stravaProfile.id);
          const now = Timestamp.now();

          const userRef = db.collection('users').doc(userId);
          const snap = await userRef.get();

          const userData = {
            stravaAthleteId: userId,
            stravaAccessToken: encrypt(account.access_token!),
            stravaRefreshToken: encrypt(account.refresh_token!),
            stravaTokenExpiresAt: Timestamp.fromMillis((account.expires_at ?? 0) * 1000),
            updatedAt: now,
          };

          if (snap.exists) {
            await userRef.update(userData);
          } else {
            await userRef.set({
              ...userData,
              webhookSubscriptionId: null,
              createdAt: now,
            });
          }

          token.userId = userId;

          // Seed default settings for new users (no-op if already exists)
          await seedDefaultSettings(userId);
        } catch (err) {
          console.error('[auth] jwt callback error:', err);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/',
    error: '/',
  },

  session: { strategy: 'jwt' },
});
