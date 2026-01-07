
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile, DailyMealPlan, Gym, DailyWorkout, Language, GroundingLink, MealPlanResponse } from "../types";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const getLanguageName = (lang: Language) => {
  switch(lang) {
    case 'ru': return 'Russian';
    case 'es': return 'Spanish';
    default: return 'English';
  }
};

const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    calories: { type: Type.NUMBER },
    protein: { type: Type.NUMBER },
    carbs: { type: Type.NUMBER },
    fats: { type: Type.NUMBER },
    prepTime: { type: Type.STRING },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    prepInstructions: { type: Type.STRING },
    herbalifeSubstitution: {
      type: Type.OBJECT,
      properties: {
        productName: { type: Type.STRING },
        benefits: { type: Type.STRING },
        instructions: { type: Type.STRING }
      },
      required: ["productName", "benefits", "instructions"]
    }
  },
  required: ["name", "calories", "protein", "carbs", "fats", "ingredients", "prepInstructions", "prepTime"]
};

export const generateMealImage = async (mealName: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `A high-end, professional food photography shot of a healthy ${mealName}. 
                 The lighting is soft and natural. Elegant plating on a dark, textured stone background. 
                 Macro shot showing fresh ingredients, vibrant colors, and appetizing textures. 
                 Ultra-high definition, editorial style.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  const part = response.candidates[0].content.parts.find(p => p.inlineData);
  if (part?.inlineData) {
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }
  return '';
};

export const editMealImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  const [mimeType, data] = base64Image.split(';base64,');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: data,
            mimeType: mimeType.split(':')[1],
          },
        },
        {
          text: `Modify this meal image: ${prompt}. Maintain the professional aesthetic and lighting.`,
        },
      ],
    },
  });

  const part = response.candidates[0].content.parts.find(p => p.inlineData);
  if (part?.inlineData) {
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }
  return base64Image;
};

export const getMealPlan = async (profile: UserProfile, lang: Language): Promise<MealPlanResponse> => {
  const ai = getAiClient();
  const prompt = `Create a 3-day elite nutritional strategy and MEAL PREP GUIDE for a user with the following profile:
    ${JSON.stringify(profile)}. Goal: ${profile.goal}.
    
    CRITICAL MANDATE:
    1. Focus on REAL WHOLE FOODS as the primary meal options.
    2. Structure each day as a COMPLETE 24-hour itinerary.
    3. Include a "Prep Strategy" that consolidates a categorized shopping list and batch-cooking tasks for the 3 days.
    4. Tailor macros specifically for the goal: ${profile.goal}.
    5. Provide ONE OPTIONAL Herbalife product substitution per meal for "Elite Efficiency".
    
    Return the response in ${getLanguageName(lang)}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                breakfast: mealSchema,
                lunch: mealSchema,
                dinner: mealSchema,
                snacks: { type: Type.ARRAY, items: mealSchema },
                supplementProtocol: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      product: { type: Type.STRING },
                      timing: { type: Type.STRING },
                      purpose: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          },
          prepStrategy: {
            type: Type.OBJECT,
            properties: {
              batchPrepTasks: { type: Type.ARRAY, items: { type: Type.STRING } },
              storageTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              shoppingList: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    amount: { type: Type.STRING },
                    category: { type: Type.STRING }
                  },
                  required: ["item", "amount", "category"]
                }
              }
            },
            required: ["batchPrepTasks", "storageTips", "shoppingList"]
          }
        },
        required: ["days", "prepStrategy"]
      }
    }
  });

  return JSON.parse(response.text || '{"days":[], "prepStrategy": {"batchPrepTasks":[], "storageTips":[], "shoppingList":[]}}');
};

export const getGymRecommendations = async (
  location: string, 
  goal: string, 
  lang: Language, 
  userCoords?: { latitude: number, longitude: number }
): Promise<Gym[]> => {
  const ai = getAiClient();
  const prompt = `Find the best high-end gyms and fitness centers in ${location} for the goal of ${goal}. 
    I need precise names, addresses, and ratings. 
    Crucially, I need the latitude and longitude coordinates for each place found so I can map them accurately.
    Return results in ${getLanguageName(lang)}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: userCoords ? {
            latitude: userCoords.latitude,
            longitude: userCoords.longitude
          } : undefined
        }
      }
    }
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingLinks: GroundingLink[] = groundingChunks
    .filter((chunk: any) => chunk.maps?.uri || chunk.web?.uri)
    .map((chunk: any) => ({
      uri: chunk.maps?.uri || chunk.web?.uri,
      title: chunk.maps?.title || chunk.web?.title || 'View Source'
    }));

  const parseResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract a JSON list of gyms from the following search results.
      Search Result Text: ${response.text}
      Grounding Context: ${JSON.stringify(groundingChunks)}
      
      Requirements:
      1. You MUST find or estimate latitude (lat) and longitude (lng) for EVERY gym. 
      2. If coordinates aren't in the metadata, use your knowledge of the address to provide approximate coordinates.
      3. Coordinates MUST be numbers.
      
      Target JSON Schema:
      Array of {
        name: string,
        address: string,
        rating: number,
        distance: number (miles),
        amenities: string[],
        highlights: string,
        uri: string,
        lat: number,
        lng: number
      }`,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    const parsedGyms: Gym[] = JSON.parse(parseResponse.text || '[]');
    return parsedGyms.map(gym => ({
      ...gym,
      groundingLinks: groundingLinks.slice(0, 3)
    }));
  } catch (e) {
    console.error("Failed to parse gyms", e);
    return [];
  }
};

export const getWorkoutPlan = async (profile: UserProfile, lang: Language): Promise<DailyWorkout[]> => {
  const ai = getAiClient();
  const prompt = `Create a 5-day elite split workout plan for a ${profile.experienceLevel} user.
    Context: ${JSON.stringify(profile)}.
    Goal: ${profile.goal}.
    MANDATORY: Tailor exercise choice, sets, and reps strictly to the ${profile.experienceLevel} experience level.
    For each exercise, provide sets, reps, target muscles, a "Coaching Cue", and a detailed "Description".
    Return in ${getLanguageName(lang)}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dayTitle: { type: Type.STRING },
            focus: { type: Type.STRING },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sets: { type: Type.NUMBER },
                  reps: { type: Type.STRING },
                  targetMuscles: { type: Type.ARRAY, items: { type: Type.STRING } },
                  coachingCue: { type: Type.STRING },
                  description: { type: Type.STRING },
                  intensity: { type: Type.STRING, enum: ['Low', 'Moderate', 'High', 'Elite'] }
                }
              }
            },
            estimatedDuration: { type: Type.STRING }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};

export const getExerciseVideo = async (exerciseName: string, onProgress: (msg: string) => void): Promise<string> => {
  const ai = getAiClient();
  onProgress("Initializing Bio-Visual Simulation...");
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `A 3D educational demonstration of a fitness professional performing a perfect ${exerciseName}. 
             Cinematic gym lighting. Camera angle: side or 45-degree view. 
             Extreme focus on proper form, full range of motion, and muscle contraction. 
             No text overlays. Ensure biomechanical accuracy and postural alignment.`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  onProgress("Accessing Neural Compute Pipeline...");
  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    if (pollCount === 2) onProgress("Synthesizing Movement Dynamics...");
    if (pollCount === 4) onProgress("Mapping Muscle Group Activation...");
    if (pollCount === 7) onProgress("Refining Biomechanical Precision...");
    if (pollCount === 10) onProgress("Rendering Atmospheric Lighting...");
    if (pollCount === 14) onProgress("Finalizing Visual Sequence...");
    
    await new Promise(resolve => setTimeout(resolve, 8000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  onProgress("Simulation Complete. Finalizing Stream.");
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return `${downloadLink}&key=${process.env.API_KEY}`;
};
