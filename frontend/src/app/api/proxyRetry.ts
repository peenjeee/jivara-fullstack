const transientStatuses = new Set([502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchWithTransientRetry = async (
  input: URL | string,
  init: RequestInit,
  options: { attempts?: number; retryDelayMs?: number } = {},
) => {
  const attempts = Math.max(options.attempts ?? 2, 1);
  const retryDelayMs = options.retryDelayMs ?? 350;

  const attemptFetch = async (attempt: number): Promise<Response> => {
    try {
      const response = await fetch(input, init);
      if (!transientStatuses.has(response.status) || attempt === attempts) return response;
    } catch (error) {
      if (attempt === attempts) throw error;
    }

    await wait(retryDelayMs * attempt);
    return attemptFetch(attempt + 1);
  };

  return attemptFetch(1);
};
