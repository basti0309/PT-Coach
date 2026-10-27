import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiDecisionSchema, type Classifier } from "./prefilter";

/** Claude als Klassifizierer mit strukturierter Ausgabe { action, answer, reason }. Nur serverseitig! */
export function createClaudeClassifier(apiKey: string, model: string): Classifier {
  if (!apiKey) {
    return async () => {
      throw new Error("ANTHROPIC_API_KEY fehlt");
    };
  }
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 2 });
  return async (system, user) => {
    const response = await client.messages.parse({
      model,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: zodOutputFormat(AiDecisionSchema) },
    });
    if (response.stop_reason === "refusal") throw new Error("KI hat die Anfrage abgelehnt");
    if (!response.parsed_output) throw new Error(`Keine strukturierte Antwort (stop_reason: ${response.stop_reason})`);
    return response.parsed_output;
  };
}
