import knowledge_vector from "../models/knowledge_vector.js";
import { createEmbedding } from "./embeddings_service.js";


export async function ingestKnowledge(chunks, source = "website") {
  const docs = [];

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk);

    docs.push({
      source,
      content: chunk,
      embedding,
    });
  }

  await knowledge_vector.insertMany(docs);
}
