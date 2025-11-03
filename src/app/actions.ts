'use server';

import { inferDatabaseSchema } from '@/ai/flows/infer-database-schema';

export async function handleInferSchemaAction(jsonData: string) {
  if (!jsonData) {
    return { error: 'JSON data is empty.' };
  }

  try {
    JSON.parse(jsonData);
  } catch (e) {
    return { error: 'Invalid JSON format. Please check your data.' };
  }

  try {
    const result = await inferDatabaseSchema({ jsonData });
    return { schema: result.schema };
  } catch (e) {
    console.error('Schema inference error:', e);
    return { error: 'Failed to communicate with the AI service. Please try again.' };
  }
}
