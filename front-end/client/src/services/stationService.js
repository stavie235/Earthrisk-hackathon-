const API_URL = "http://localhost:9876/api"; // backend URL

export const getStationById = async (id) => {
  const response = await fetch(`${API_URL}/station/${id}`);
  if (!response.ok) throw new Error("Failed to fetch station");
  return await response.json();
};