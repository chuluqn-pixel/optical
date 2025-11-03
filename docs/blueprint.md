# **App Name**: JSONtbase

## Core Features:

- JSON Input: Allow users to upload a JSON file or paste JSON text directly into the app.
- Schema Inference: Automatically infer the database schema from the uploaded JSON structure using an AI tool.
- Data Transformation: Provide a UI for users to transform their JSON data (e.g., rename fields, change data types) based on the inferred schema.
- Configuration Options: Allow users to configure Firebase credentials.
- Data Preview: Display a preview of the data that will be imported to Firebase, formatted according to the schema.
- Migration Execution: Initiate the data migration process to Firebase. Currently, the output is simulated instead of migrated to an actual cloud Firebase deployment.
- Status Monitoring: Show the progress of the migration, with status updates.

## Style Guidelines:

- Primary color: Soft teal (#63BDBD) to convey reliability and a calm user experience.
- Background color: Light off-white (#F5F5F5) to keep the focus on the content.
- Accent color: Warm gold (#D4AF37) for CTAs, progress bars, and highlights.
- Body and headline font: 'Inter', a sans-serif font for a modern and neutral feel. Note: currently only Google Fonts are supported.
- Use clear, outline-style icons for navigation and actions.
- A clean, grid-based layout to showcase information clearly.
- Use subtle transitions and progress animations.