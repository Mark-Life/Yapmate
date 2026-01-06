/**
 * OpenTelemetry instrumentation for Langfuse tracing
 * Must be imported BEFORE any AI SDK imports
 */

import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

const isProduction = process.env.NODE_ENV === "production";
const environment = isProduction ? "production" : "development";

/**
 * Span processor instance for manual flush if needed
 */
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  environment,
});

const sdk = new NodeSDK({
  spanProcessors: [langfuseSpanProcessor],
});

sdk.start();

console.log(`📊 Langfuse tracing initialized (env: ${environment})`);
