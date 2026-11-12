/**
 * Shows why a mutation failed (the API's error message), so a failed action never looks like a
 * button that "does nothing". Renders nothing while the mutation hasn't failed.
 */
export function MutationError({
  mutation,
  fallback = 'Something went wrong. Please try again.',
  className = 'mt-2',
}: {
  mutation: { isError: boolean; error: unknown };
  fallback?: string;
  className?: string;
}) {
  if (!mutation.isError) return null;
  const message = mutation.error instanceof Error && mutation.error.message ? mutation.error.message : fallback;
  return (
    <p role="alert" className={`${className} rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700`}>
      {message}
    </p>
  );
}
