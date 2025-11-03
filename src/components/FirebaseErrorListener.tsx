// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * A client-side component that listens for Firestore permission errors
 * and displays them as toasts during development.
 *
 * @returns React.ReactNode
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error(
        'A Firestore permission error was caught. This is expected during development and is used to provide rich error feedback. Do not be alarmed by the uncaught exception in the console.',
        error
      );

      toast({
        variant: 'destructive',
        title: 'Firestore Security Rules Error',
        description: (
          <div className="mt-2 w-full rounded-md bg-destructive/90 p-4 text-white">
            <p className="font-bold">
              {error.message.split(':')[0]}: {error.message.split(':')[1]}
            </p>
            <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-destructive/90 p-4 text-white">
              <code className="text-sm">{error.render()}</code>
            </pre>
          </div>
        ),
        duration: 30000,
      });

      // Throwing the error here is intentional.
      // In Next.js development mode, this will trigger the error overlay,
      // providing a much richer debugging experience.
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
