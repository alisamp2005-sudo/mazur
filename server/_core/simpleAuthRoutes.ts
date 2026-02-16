import type { Express, Request, Response } from "express";
import { simpleAuth } from "./simpleAuth";

export function registerSimpleAuthRoutes(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    try {
      const { user, sessionCookie } = await simpleAuth.login(email, password);
      
      res.setHeader("Set-Cookie", simpleAuth.getSessionCookieString(sessionCookie));
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      });
    } catch (error: any) {
      console.error("[SimpleAuth] Login failed:", error);
      res.status(401).json({ error: error.message || "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (_req: Request, res: Response) => {
    res.setHeader("Set-Cookie", simpleAuth.getLogoutCookieString());
    res.json({ success: true });
  });
}
