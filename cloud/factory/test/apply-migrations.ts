import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Setup files may run more than once. The helper records applied migrations
// in D1, so applying the deploy-authored migration set here is idempotent.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
