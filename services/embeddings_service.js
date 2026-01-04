import axios from "axios";

export async function createEmbedding(text) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/embeddings",
    {
      model: "text-embedding-3-large",
      input: text,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.data[0].embedding;
}
