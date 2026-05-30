import { Router } from "express";
import { CORE_COUNTRIES } from "../services/macroPipeline.js";
import {
  getCountryIntelligence,
  listCountriesIntelligence,
} from "../services/macroPipeline.js";
import { ensureMacroDataReady } from "../services/macroBootstrap.js";

const router = Router();

router.get("/countries", async (_req, res) => {
  try {
    const data = await listCountriesIntelligence();
    res.json({
      success: true,
      data,
      meta: { count: data.length, countries: CORE_COUNTRIES },
    });
  } catch (error) {
    console.warn("[economy] countries error:", error.message);
    res.json({
      success: true,
      data: CORE_COUNTRIES.map((country) => ({
        country,
        label: country,
        counts: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        riskScore: 0,
        direction: "stable",
        eventCount: 0,
      })),
      meta: { degraded: true },
    });
  }
});

router.get("/countries/:country", async (req, res) => {
  try {
    const data = await getCountryIntelligence(req.params.country);
    res.json({ success: true, data });
  } catch (error) {
    if (error.message?.includes("Unsupported")) {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.warn("[economy] country detail fallback:", error.message);
    res.json({
      success: true,
      data: {
        country: req.params.country?.toUpperCase(),
        label: req.params.country,
        events: [],
        counts: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        riskScore: 0,
        direction: "stable",
      },
      meta: { degraded: true },
    });
  }
});

router.post("/sync", async (_req, res) => {
  try {
    const result = await ensureMacroDataReady(true);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
