'use server';

// Define API constants (API Key is intentionally left blank)
const API_KEY = "";
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

/**
 * Utility function to perform a fetch request with exponential backoff for resilience.
 * @param url The API endpoint URL.
 * @param options The RequestInit options for the fetch call.
 * @param retries The number of times to retry the request.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status !== 429 && response.ok) {
                return response;
            }
            if (i === retries - 1) {
                throw new Error(`Final attempt failed with status: ${response.status}`);
            }
            // Wait for 2^i seconds before the next retry
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
        }
    }
    // This line should technically be unreachable, but keeps TypeScript happy
    throw new Error("Failed to fetch after all retries.");
}

/**
 * Handles the server-side logic to call the Gemini API for JSON schema inference.
 * @param jsonInput The raw JSON string provided by the user.
 * @returns An object containing either the inferred schema string or an error message.
 */
export async function handleInferSchemaAction(jsonInput: string): Promise<{ schema?: string, error?: string }> {
    // 1. Validate and Prepare Input
    let parsedJson: any;
    try {
        parsedJson = JSON.parse(jsonInput);
    } catch (e) {
        return { error: "Invalid JSON provided. Please ensure the input is valid JSON before inferring the schema." };
    }

    // Look for a 'data' array property, which is common in migration files, 
    // and use that for inference, otherwise use the whole object.
    let dataForInference = parsedJson;
    if (typeof parsedJson === 'object' && !Array.isArray(parsedJson) && Array.isArray(parsedJson.data)) {
        dataForInference = parsedJson.data;
    }
    
    // Use a small subset for inference to save tokens and time if the array is huge.
    const sampleData = dataForInference.slice(0, 5);


    // 2. Define Prompts
    const systemPrompt = "You are an expert data modeling assistant. Your task is to analyze the provided JSON data (which may be a full object or just an array of records) and infer a simple, clean **TypeScript interface definition** that best represents the structure of the data records. Do not include any external dependencies or examples. ONLY output the raw TypeScript interface code block, nothing else. Infer appropriate types (string, number, boolean, Date, string[] or number[], etc.) for all fields.";

    const userQuery = `Infer the schema for the following JSON data records (showing only a sample):\n\n${JSON.stringify(sampleData, null, 2)}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    // 3. Call the API
    try {
        const response = await fetchWithRetry(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            return { error: "The AI did not return a valid schema. The input might be too complex or sparse." };
        }
        
        // Clean up markdown formatting often added by the model
        let schema = generatedText.replace(/^```typescript\s*|```$/g, '').trim();
        schema = schema.replace(/^```\s*|```$/g, '').trim();

        return { schema };

    } catch (error: any) {
        console.error("Schema Inference Error:", error);
        return { error: `Failed to communicate with the AI service. Check the console for details.` };
    }
}
