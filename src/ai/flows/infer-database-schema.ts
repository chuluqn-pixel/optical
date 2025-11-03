'use server';

/**
 * @fileOverview Infers the database schema from a JSON data sample.
 *
 * - inferDatabaseSchema - A function that infers the database schema from JSON data.
 * - InferDatabaseSchemaInput - The input type for the inferDatabaseSchema function.
 * - InferDatabaseSchemaOutput - The return type for the inferDatabaseSchema function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InferDatabaseSchemaInputSchema = z.object({
  jsonData: z.string().describe('A string containing JSON data to infer the schema from.'),
});
export type InferDatabaseSchemaInput = z.infer<typeof InferDatabaseSchemaInputSchema>;

const InferDatabaseSchemaOutputSchema = z.object({
  schema: z.string().describe('The inferred database schema as a string.'),
});
export type InferDatabaseSchemaOutput = z.infer<typeof InferDatabaseSchemaOutputSchema>;

export async function inferDatabaseSchema(input: InferDatabaseSchemaInput): Promise<InferDatabaseSchemaOutput> {
  return inferDatabaseSchemaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inferDatabaseSchemaPrompt',
  input: {schema: InferDatabaseSchemaInputSchema},
  output: {schema: InferDatabaseSchemaOutputSchema},
  prompt: `You are an expert database schema designer.
  Given the following JSON data, infer the most appropriate database schema for storing this data in Firebase.
  Return the schema as a string.

  JSON Data:
  {{jsonData}}`,
});

const inferDatabaseSchemaFlow = ai.defineFlow(
  {
    name: 'inferDatabaseSchemaFlow',
    inputSchema: InferDatabaseSchemaInputSchema,
    outputSchema: InferDatabaseSchemaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
