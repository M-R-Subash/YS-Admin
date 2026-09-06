export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: any = new Error("An error occurred while fetching the data.");
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export const swrGlobalConfig = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 4000,
  onErrorRetry: (
    error: any,
    _key: string,
    _config: any,
    revalidate: (opts: { retryCount: number }) => void,
    { retryCount }: { retryCount: number }
  ) => {
    if (error?.status === 401 || error?.status === 403) return;

    if (retryCount >= 3) return;
    setTimeout(() => revalidate({ retryCount }), 3000);
  },
};
