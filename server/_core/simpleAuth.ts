import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import bcrypt from "bcrypt";

const COOKIE_NAME = "session";
const SALT_ROUNDS = 10;

export type SessionPayload = {
  userId: number;
  email: string;
  appId: string;
};

class SimpleAuthService {
  private jwtSecret: Uint8Array;

  constructor() {
    if (!ENV.jwtSecret) {
      throw new Error("JWT_SECRET is not configured!");
    }
    this.jwtSecret = new TextEncoder().encode(ENV.jwtSecret);
    console.log("[SimpleAuth] Initialized");
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async login(email: string, password: string): Promise<{ user: User; sessionCookie: string }> {
    const user = await db.getUserByEmail(email);
    if (!user) {
      throw ForbiddenError("Invalid email or password");
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw ForbiddenError("Invalid email or password");
    }

    await db.updateUserLastSignIn(user.id);

    const sessionCookie = await this.createSession(user);
    return { user, sessionCookie };
  }

  async createSession(user: User): Promise<string> {
    const payload: SessionPayload = {
      userId: user.id,
      email: user.email,
      appId: ENV.appId || "elevenlabs_call_admin",
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(this.jwtSecret);

    return jwt;
  }

  async verifySession(sessionCookie: string | undefined): Promise<SessionPayload | null> {
    if (!sessionCookie) return null;

    try {
      const { payload } = await jwtVerify(sessionCookie, this.jwtSecret);
      return payload as SessionPayload;
    } catch (error) {
      console.error("[SimpleAuth] Session verification failed:", error);
      return null;
    }
  }

  parseCookies(cookieHeader: string | undefined): Map<string, string> {
    const cookies = new Map<string, string>();
    if (!cookieHeader) return cookies;

    cookieHeader.split(";").forEach((cookie) => {
      const [name, ...rest] = cookie.split("=");
      if (name && rest.length > 0) {
        cookies.set(name.trim(), rest.join("=").trim());
      }
    });

    return cookies;
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserById(session.userId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }

  getSessionCookieString(sessionToken: string): string {
    return `${COOKIE_NAME}=${sessionToken}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`;
  }

  getLogoutCookieString(): string {
    return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export const simpleAuth = new SimpleAuthService();
