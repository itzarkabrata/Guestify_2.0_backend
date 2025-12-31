import mongoose from "mongoose";

const knowledgeVectorSchema = new mongoose.Schema(
  {
    source: { type: String }, // page URL
    domain: { type: String }, // domain name
    page: { type: String },   // page name
    content: { type: String },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("KnowledgeVector", knowledgeVectorSchema);