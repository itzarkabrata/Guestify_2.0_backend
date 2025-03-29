import { fileURLToPath } from "url";
import path from "path";

// Resolve __dirname in ES modules
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);