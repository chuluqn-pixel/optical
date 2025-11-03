// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
import { getAuth } from 'firebase/auth';
import { app } from './config';

/**
 * Defines the context for a Firestore security rule evaluation.
 * This information is used to simulate and debug security rules.
 */
export type SecurityRuleContext = {
  /** The full path to the document or collection being accessed. */
  path: string;
  /** The type of operation being performed. */
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  /**
   * The data being written for 'create' or 'update' operations.
   * This should be the complete document data.
   */
  requestResourceData?: any;
};

/**
 * A custom error class to represent Firestore permission-denied errors.
 * It captures detailed context about the failed operation to provide
 * rich, actionable feedback for debugging security rules.
 */
export class FirestorePermissionError extends Error {
  /** The context of the security rule that failed. */
  public context: SecurityRuleContext;
  public sourceError?: Error;

  /**
   * Creates an instance of FirestorePermissionError.
   * @param context The context of the security rule evaluation.
   */
  constructor(context: SecurityRuleContext, sourceError?: Error) {
    const message = `Firestore Security Rules denied this request: ${context.operation} ${context.path}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    this.sourceError = sourceError;

    // This is to make the error readable in the browser console
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }

  /**
   * Asynchronously retrieves the current user's authentication state.
   * @returns A promise that resolves to the user's auth object or null.
   */
  private async getAuth() {
    try {
      const auth = getAuth(app);
      await auth.authStateReady();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }
      const token = await currentUser.getIdTokenResult();
      return {
        uid: currentUser.uid,
        token: {
          ...token.claims,
          phone_number: token.claims.phone_number || null,
        },
      };
    } catch (e) {
      console.error('Failed to get auth state for error context:', e);
      return null;
    }
  }

  /**
   * Renders the error details as a JSON string for display.
   * This is what gets displayed in the development error overlay.
   * @returns A stringified JSON object with detailed error context.
   */
  render() {
    return JSON.stringify(
      {
        ruleset: 'firestore.rules',
        ...(this.sourceError && {
          serverMessage: this.sourceError.message,
        }),
        context: {
          request: {
            // Placeholder for auth - will be populated by the listener
            auth: `Calling getAuth()...`,
            method: this.context.operation,
            path: `/databases/(default)/documents/${this.context.path}`,
            ...(this.context.requestResourceData && {
              resource: {
                data: this.context.requestResourceData,
              },
            }),
          },
        },
      },
      null,
      2
    );
  }

  /**
   * Renders the error with the full auth context included.
   * This is an async method that should be called by the error listener.
   * @returns A promise that resolves to the stringified JSON with auth context.
   */
  async renderWithAuth() {
    const authContext = await this.getAuth();
    return JSON.stringify(
      {
        ruleset: 'firestore.rules',
        ...(this.sourceError && {
          serverMessage: this.sourceError.message,
        }),
        context: {
          request: {
            auth: authContext,
            method: this.context.operation,
            path: `/databases/(default)/documents/${this.context.path}`,
            ...(this.context.requestResourceData && {
              resource: {
                data: this.context.requestResourceData,
              },
            }),
          },
        },
      },
      null,
      2
    );
  }
}
