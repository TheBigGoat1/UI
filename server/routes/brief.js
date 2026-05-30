import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import { buildDailyBrief } from "../services/dailyBrief.js";
import { safeAsync } from "../utils/safeRoute.js";

const router = Router();

const EMPTY_BRIEF = {
  session: { label: "—", utcHour: new Date().getUTCHours() },
  focus: [],
  sitOut: null,
  suppression: [],
  meta: { degraded: true },
};

router.get(
  "/daily",
  optionalAuth,
  safeAsync(async (req, res) => {
    try {
      const data = await buildDailyBrief(req.user?.id || null);
      res.json({ success: true, data });
    } catch (error) {
      console.warn("[brief] daily fallback:", error.message);
      res.json({ success: true, data: EMPTY_BRIEF });
    }
  }),
);

export default router;
