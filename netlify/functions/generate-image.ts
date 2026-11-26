import { generateSceneImage, HttpError } from "../../server/geminiService";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const handler = async (event: { httpMethod?: string; body?: string | null }) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: JSON_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let payload: any;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON request body." }),
    };
  }

  try {
    const result = await generateSceneImage(payload?.prompt);
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error("Netlify /api/generate-image error:", error);
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    return {
      statusCode,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: error?.message || "Image generation failed" }),
    };
  }
};
