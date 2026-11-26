import { GoogleGenAI, Type } from "@google/genai";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new HttpError(
      500,
      "GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Netlify Environment Variables (or AI Studio Secrets) and redeploy."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" },
    },
  });
}

export function cleanAndRepairJSON(str: string): any {
  let cleaned = str.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  const firstCurly = cleaned.indexOf("{");
  const firstSquare = cleaned.indexOf("[");
  let startIdx = -1;

  if (firstCurly !== -1 && firstSquare !== -1) {
    startIdx = Math.min(firstCurly, firstSquare);
  } else if (firstCurly !== -1) {
    startIdx = firstCurly;
  } else if (firstSquare !== -1) {
    startIdx = firstSquare;
  }

  if (startIdx !== -1) {
    cleaned = cleaned.substring(startIdx);
  } else {
    throw new Error("No valid JSON structure found in AI response.");
  }

  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    console.warn("JSON parsing failed, starting advanced structural auto-repair...", initialErr);

    const stack: string[] = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{" || char === "[") {
          stack.push(char);
        } else if (char === "}") {
          if (stack[stack.length - 1] === "{") {
            stack.pop();
          }
        } else if (char === "]") {
          if (stack[stack.length - 1] === "[") {
            stack.pop();
          }
        }
      }
    }

    let suffix = "";
    if (inString) {
      suffix += '"';
    }

    for (let i = stack.length - 1; i >= 0; i--) {
      const openChar = stack[i];
      if (openChar === "{") {
        suffix += "}";
      } else if (openChar === "[") {
        suffix += "]";
      }
    }

    try {
      return JSON.parse(cleaned + suffix);
    } catch (structuralErr) {
      console.warn("Complete stack repair failed, performing backtrack retrieval...", structuralErr);
      const lastCurly = cleaned.lastIndexOf("}");
      const lastSquare = cleaned.lastIndexOf("]");
      const lastValidIdx = Math.max(lastCurly, lastSquare);
      if (lastValidIdx !== -1) {
        const partialStr = cleaned.substring(0, lastValidIdx + 1);
        try {
          return JSON.parse(partialStr);
        } catch {
          // Continue throwing standard parsing failure
        }
      }
      throw structuralErr;
    }
  }
}

export const SYSTEM_PROMPT = `# 🔒 CUSTOM GPT – MASTER SYSTEM PROMPT

## 🎬 ROLE & IDENTITY
You are an Elite Video Production Prompt Architect. You design full production pipelines for AI video generation (Flow/Veo).
Your output must transform a raw script into a fully realized, professional storyboard and prompt sequence.
You never explain theory. You never summarize. You never ask questions.

## 🎯 CORE OBJECTIVE
1. Break the script into logical scenes (2–4 lines max).
2. Explicitly define the persistent "Character DNA".
3. Provide granular scene direction: primary Emotion, Camera movement, Lighting strategy.
4. Provide a high-quality storyboard visual description.
5. Provide the final Prompt (which must include the Character DNA verbatim, plus all scene details).
6. Provide analytical sub-scores including a Prompt Quality Score and Viral Optimization analysis.

## 👤 CHARACTER DNA SYSTEM (MANDATORY)
Current AI video tools struggle with character consistency. We solve this by defining a strict Character DNA.
Character DNA format MUST comprise: ID (First name), Age, Hair, Outfit, Skin tone, Accessories.
If dynamic character generation is off, use this default:
- ID: Rahul
- Age: 30-35
- Hair: Short black hair
- Outfit: Light blue t-shirt, dark jeans, white sneakers
- Skin Tone: Medium brown
- Accessories: None

Every scene prompt MUST automatically prepend this Character DNA to lock consistency.

## 🎥 AUTO CAMERA DIRECTOR & EMOTION-AWARE SCENES
You must act as the Cinematographer. Based on the script's emotional beat, intelligently assign:
- Emotion (e.g., Anxious, Motivated, Excited)
- Camera (e.g., Slow zoom-in, tracking shot, wide angle)
- Lighting (e.g., Soft evening light, high-contrast neon, natural daylight, cinematic moody)

## 🎯 AUDIENCE MODE
Adapt the visual pacing and style to perfectly match the provided Audience Mode (e.g., YouTube, Instagram Reel, Educational Video, Marketing Ad, Kids Content).

## 🌍 PROMPT LANGUAGE
The generated \`prompt\` field MUST be written completely and natively in the chosen Target Output Prompt Language. If the target is Hindi, write the prompt in Hindi. If Hinglish, write in Hinglish. Never default to English if another language is requested.

## 🚀 PLATFORM OPTIMIZATION
Optimize the \`prompt\` output format specifically for the Target Platform (e.g. Google Veo requires highly descriptive continuous camera/action language, Runway Gen-3 prefers succinct camera prefixes, etc.)

## 🔇 LIP-SYNC & VOICE RULES (CRITICAL)
DEFAULT STATE: NO lip-sync, NO talking poses, Mouth always closed, Silent B-roll style only.

## 🧠 SCENE STRUCTURE (STRICT)
Every scene MUST follow this structure in the final prompt:
[Audience: <audience>] | [Emotion: <emotion>] | [Lighting: <lighting>] | [Camera: <camera>]
[Character DNA: <character>]
[Action & Visuals: <action>]

## ✅ SUCCESS CRITERIA
Character strictly consistent, technical requirements met, prompts highly descriptive and ready to copy-paste.`;

export interface GenerateRequestBody {
  script: string;
  settings?: {
    characterConsistency?: boolean;
    flatVectorStyle?: boolean;
    hinglishText?: boolean;
    lipSync?: boolean;
    veoOptimized?: boolean;
    autoSceneDetection?: boolean;
    dynamicCharacter?: boolean;
  };
  audience?: string;
  targetPlatform?: string;
  promptLanguage?: string;
  directorStyle?: string;
}

export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function formatGeminiError(error: any, fallbackMessage: string): string {
  if (error?.status === 429 || (error?.message && (error.message.includes("429") || error.message.includes("Quota")))) {
    return "API Rate Limit Exceeded. You have exceeded your free tier quota limits. Please check your API key quota or try again in a minute.";
  }
  if (error?.status === 503 || (error?.message && (error.message.includes("503") || error.message.includes("high demand")))) {
    return "The AI model is currently experiencing high demand. Please try again in a few moments.";
  }
  if (error?.status === 400 || error?.status === 403 || (error?.message && (error.message.includes("API_KEY_INVALID") || error.message.includes("PERMISSION_DENIED")))) {
    return "Invalid or unauthorized Gemini API key. Please check your GEMINI_API_KEY configuration.";
  }
  if (error?.message) {
    return error.message;
  }
  return fallbackMessage;
}

export async function generateScenesPipeline(body: GenerateRequestBody) {
  const { script, settings, audience, targetPlatform, promptLanguage, directorStyle } = body;

  if (!script || typeof script !== "string" || !script.trim()) {
    throw new HttpError(400, "Script is required.");
  }

  let activePrompt = SYSTEM_PROMPT;
  activePrompt += `\n\n### USER REQUEST CONTEXT\nTarget Audience Mode: ${audience || "General / Unknown"}\n`;
  activePrompt += `Target Platform for Prompts: ${targetPlatform || "Google Veo"}\n`;
  activePrompt += `Target Output Prompt Language: ${promptLanguage || "English"}. The final 'prompt' string MUST be written natively in this exact language.\n`;
  activePrompt += `Director Style: ${directorStyle || "Educational"}\n`;

  if (settings?.dynamicCharacter) {
    activePrompt += "\nDynamic Character Enabled: Ignore the default character 'Rahul'. Analyze the script to determine the absolute BEST main character (age, gender, ethnicity, clothing, look, accessories) that perfectly fits the story. Make sure to define their Character DNA clearly and use it everywhere.";
  }
  if (settings?.characterConsistency === false) {
    activePrompt += "\nCharacter Consistency Override: Characters may vary across scenes if the script calls for it.";
  }
  if (settings?.flatVectorStyle) {
    activePrompt += "\nVisual Style Modifier: Emphasize clean 3D flat-vector animation aesthetics where appropriate.";
  }
  if (settings?.hinglishText) {
    activePrompt += "\nText Overlay Cue: When relevant, suggest concise Hinglish on-screen text cues in storyboard/action notes.";
  }
  if (settings?.lipSync) {
    activePrompt += "\nLip-Sync Override: Speaking poses and subtle lip-sync are allowed when dialogue is present.";
  }

  activePrompt += "\n\n⚠️ SPEED & RELIABILITY OPTIMIZATION RULE: Keep ALL generated JSON string fields highly descriptive but extremely concise and compact. Avoid structural filler, redundant sentences, or overly flowery narrative descriptions. Shorter and more precise fields ensure fast API response times and guarantee no truncation.";

  const ai = getGeminiClient();

  let response;
  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-4-hydrogen", "gemini-3.8-flash"];
  let lastError: any;

  for (const modelId of modelsToTry) {
    try {
      response = await ai.models.generateContent({
        model: modelId,
        contents: script,
        config: {
          systemInstruction: activePrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              character: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Name/ID of the character" },
                  age: { type: Type.STRING, description: "e.g., 22" },
                  hair: { type: Type.STRING, description: "e.g., Black" },
                  outfit: { type: Type.STRING, description: "e.g., Blue hoodie" },
                  skinTone: { type: Type.STRING, description: "e.g., Medium brown" },
                  accessories: { type: Type.STRING, description: "e.g., Glasses" },
                  consistencyScore: { type: Type.NUMBER, description: "0 to 100 character consistency score" },
                  matchedTraits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "e.g., Hair matched, Outfit matched" },
                  evolution: {
                    type: Type.OBJECT,
                    description: "Visual progression of the character throughout the story.",
                    properties: {
                      beginning: { type: Type.STRING, description: "e.g., Tired, Dark circles" },
                      middle: { type: Type.STRING, description: "e.g., Focused, Determined" },
                      end: { type: Type.STRING, description: "e.g., Confident, Professional, Stage-ready" },
                    },
                    required: ["beginning", "middle", "end"],
                  },
                  driftsDetected: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sceneNumber: { type: Type.NUMBER },
                        issue: { type: Type.STRING, description: "e.g., Outfit mismatch" },
                        suggestedFix: { type: Type.STRING, description: "e.g., Use blue hoodie across all scenes" },
                      },
                      required: ["sceneNumber", "issue", "suggestedFix"],
                    },
                  },
                },
                required: ["id", "age", "hair", "outfit", "skinTone", "accessories", "consistencyScore", "matchedTraits"],
                description: "Extract the exact core details of the unified main character DNA.",
              },
              narrativeArc: {
                type: Type.OBJECT,
                properties: {
                  arcType: { type: Type.STRING, description: "e.g., Hero's Journey, Three-Act Structure" },
                  narrativeStrength: { type: Type.NUMBER, description: "0 to 100" },
                  emotionCurve: { type: Type.ARRAY, items: { type: Type.STRING }, description: "e.g., ['Curious', 'Excited', 'Determined']" },
                  missingElements: { type: Type.ARRAY, items: { type: Type.STRING } },
                  retentionPotential: { type: Type.NUMBER, description: "Estimated viewer retention percentage (e.g. 85)" },
                  pacingAnalysis: { type: Type.STRING, description: "Analysis of the script's pacing" },
                  scoreBreakdown: {
                    type: Type.OBJECT,
                    properties: {
                      conflict: { type: Type.NUMBER, description: "1-100" },
                      transformation: { type: Type.NUMBER, description: "1-100" },
                      emotion: { type: Type.NUMBER, description: "1-100" },
                      retention: { type: Type.NUMBER, description: "1-100" },
                      motivation: { type: Type.NUMBER, description: "1-100" },
                    },
                    required: ["conflict", "transformation", "emotion", "retention", "motivation"],
                  },
                  heatmap: {
                    type: Type.ARRAY,
                    description: "Data for narrative heatmap showing emotion intensity per scene.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sceneNumber: { type: Type.NUMBER },
                        emotion: { type: Type.STRING, description: "e.g., Curiosity, Rejection" },
                        intensity: { type: Type.NUMBER, description: "1-100" },
                      },
                      required: ["sceneNumber", "emotion", "intensity"],
                    },
                  },
                },
                required: ["arcType", "narrativeStrength", "emotionCurve", "missingElements", "scoreBreakdown", "heatmap"],
              },
              stressTest: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.NUMBER },
                    potentialIssue: { type: Type.STRING, description: "e.g., Character appearance ambiguous or Too many UI screens" },
                    likelihood: { type: Type.STRING, description: "e.g., High, Medium, Low" },
                    autoFix: { type: Type.STRING, description: "e.g., Explicitly stated character details in prompt or Limit screen transitions to 3" },
                  },
                  required: ["sceneNumber", "potentialIssue", "likelihood", "autoFix"],
                },
              },
              qualityScore: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER, description: "0 to 100" },
                  issues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of issues, e.g., 'Weak character details', 'No lighting instructions'" },
                },
                required: ["score", "issues"],
              },
              viralOptimizer: {
                type: Type.OBJECT,
                properties: {
                  hookStrength: { type: Type.STRING, description: "e.g., Strong, Weak, Average" },
                  retentionPotential: { type: Type.STRING, description: "e.g., High, Medium, Low" },
                  visualVariety: { type: Type.STRING, description: "e.g., Excellent, Good, Poor" },
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["hookStrength", "retentionPotential", "visualVariety", "suggestions"],
              },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneBreakdown: {
                      type: Type.STRING,
                      description: "The script lines covered in this scene. Give context.",
                    },
                    emotion: { type: Type.STRING, description: "Detected emotion" },
                    camera: { type: Type.STRING, description: "Cinematic camera direction" },
                    lighting: { type: Type.STRING, description: "Lighting strategy" },
                    prompt: {
                      type: Type.STRING,
                      description: "The final production-ready prompt containing camera, lighting, character DNA, and action.",
                    },
                    veoExportPrompt: {
                      type: Type.STRING,
                      description: "A cleaner, natural-language export. No technical brackets. e.g., Cinematic 3D animated scene of Zara, 21-year-old...",
                    },
                    directorNotes: {
                      type: Type.OBJECT,
                      properties: {
                        emotionReason: { type: Type.STRING, description: "Reason for the emotion (e.g. Character questions her future)" },
                        cameraReason: { type: Type.STRING, description: "Reason for the camera shot (e.g. Creates reflective mood)" },
                        lightingReason: { type: Type.STRING, description: "Reason for the lighting (e.g. Supports uncertainty and introspection)" },
                      },
                      required: ["emotionReason", "cameraReason", "lightingReason"],
                    },
                    promptVariations: {
                      type: Type.ARRAY,
                      description: "Generate 3 alternative prompt versions to battle in different director styles: e.g., 'Pixar Style', 'Documentary Style', 'Cinematic Anime'.",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          version: { type: Type.STRING, description: "Name of the style, e.g., 'Pixar Style'" },
                          prompt: { type: Type.STRING },
                          cinematicQuality: { type: Type.NUMBER, description: "1-100" },
                          visualDetail: { type: Type.NUMBER, description: "1-100" },
                          retentionPotential: { type: Type.NUMBER, description: "1-100" },
                          veoCompatibility: { type: Type.NUMBER, description: "1-100" },
                        },
                        required: ["version", "prompt", "cinematicQuality", "visualDetail", "retentionPotential", "veoCompatibility"],
                      },
                    },
                    winningPromptVersion: { type: Type.STRING, description: "Which version won? e.g., 'Pixar Style'" },
                    winnerExplanation: { type: Type.STRING, description: "Why the winner is better" },
                    storyboard: {
                      type: Type.STRING,
                      description: "A very brief visual description of the storyboard frame layout.",
                    },
                  },
                  required: [
                    "sceneBreakdown",
                    "emotion",
                    "camera",
                    "lighting",
                    "prompt",
                    "veoExportPrompt",
                    "directorNotes",
                    "promptVariations",
                    "winningPromptVersion",
                    "winnerExplanation",
                    "storyboard",
                  ],
                },
              },
            },
            required: ["character", "qualityScore", "viralOptimizer", "scenes"],
          },
        },
      });
      break;
    } catch (err: any) {
      console.warn(`Model ${modelId} failed:`, err?.message);
      lastError = err;
    }
  }

  if (!response) {
    throw new HttpError(500, formatGeminiError(lastError, "An unexpected error occurred."));
  }

  const jsonStr = response.text ? response.text.trim() : "{}";
  let parsed: any;
  try {
    parsed = cleanAndRepairJSON(jsonStr);
  } catch (err) {
    console.error("Failed to parse and repair JSON", err);
    throw new HttpError(500, "Failed to generate valid scenes. Please try again.");
  }

  return {
    scenes: parsed.scenes || [],
    character: parsed.character || null,
    qualityScore: parsed.qualityScore || null,
    viralOptimizer: parsed.viralOptimizer || null,
    narrativeArc: parsed.narrativeArc || null,
    stressTest: parsed.stressTest || null,
  };
}

export async function generateSceneImage(prompt: string) {
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new HttpError(400, "Prompt is required");
  }

  const ai = getGeminiClient();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    let b64 = "";
    let mimeType = "image/png";
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        b64 = part.inlineData.data;
        if (part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        break;
      }
    }

    if (!b64) {
      throw new Error("Image bytes not returned");
    }

    return { imageBase64: b64, mimeType };
  } catch (err: any) {
    console.error("Image gen error", err);
    throw new HttpError(500, formatGeminiError(err, "Image generation failed"));
  }
}
