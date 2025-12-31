import knowledge_vector from "../models/knowledge_vector.js";
import { createEmbedding } from "./embeddings_service.js";

export async function searchKnowledge(query) {
  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is not set in environment variables");
  }

  // Normalize domain
  const domain = process.env.FRONTEND_URL.replace(/\/$/, "");

  // ✅ CREATE EMBEDDING FIRST
  const queryEmbedding = await createEmbedding(query);

  // Optional debug
  // console.log("Embedding length:", queryEmbedding.length);

  const results = await knowledge_vector.aggregate([
    {
      $vectorSearch: {
        index: "knowledge_vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 150,
        limit: 6,
        filter: {
          domain: domain,
        },
      },
    },
    {
      $project: {
        _id: 0,
        content: 1,
        source: 1,
        page: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results;
}