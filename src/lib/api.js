export async function apiFootball(endpoint, params = {}) {
  const query = new URLSearchParams({
    endpoint,
    ...params
  });

  const response = await fetch(
    `/api/football/?${query.toString()}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "API-Football request failed."
    );
  }

  return data;
}

export async function footballData(path, params = {}) {
  const query = new URLSearchParams({
    path,
    ...params
  });

  const response = await fetch(
    `/api/football-data/?${query.toString()}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "football-data.org request failed."
    );
  }

  return data;
}
