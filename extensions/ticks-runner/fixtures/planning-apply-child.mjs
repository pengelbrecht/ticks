#!/usr/bin/env node
import * as fs from "node:fs";
import { runAutomatedPlanning } from "../planning.ts";

const options = JSON.parse(process.env.PLANNING_CHILD_OPTIONS ?? "null");
if (!options) throw new Error("PLANNING_CHILD_OPTIONS is required");
const result = await runAutomatedPlanning({ ...options, env: process.env });
if (process.env.PLANNING_CHILD_RESULT) fs.writeFileSync(process.env.PLANNING_CHILD_RESULT, `${JSON.stringify(result)}\n`);
