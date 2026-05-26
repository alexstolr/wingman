import express from "express";
import cors from "cors";
import { router } from "./routes.js";
import { initScheduler } from "./scheduler.js";

const app = express();
const PORT = 3333;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/api", router);

app.listen(PORT, () => {
  console.log(`Wingman server running on http://localhost:${PORT}`);
  initScheduler();
});
