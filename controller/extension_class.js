import { Database } from "../lib/connect.js";
import { Extension_Model } from "../models/extensions.js";
import {
  ApiError,
  AuthorizationError,
  InternalServerError,
  NotFoundError,
  TypeError,
} from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";

export class Extension {
  static async create(req, res) {
    try {
      const isConnected = await Database.isConnected();
      if (!isConnected) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      // getting request body
      const {
        name,
        slug,
        description,
        image_url,
        users = [],
        display = true,
        version = "1.0.0",
        category = "general",
      } = req.body;

      /* ================= VALIDATIONS ================= */

      if (typeof name !== "string" || name.trim().length < 3) {
        throw new TypeError("Name must be at least 3 characters long");
      }

      if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
        throw new TypeError(
          "Slug must contain only lowercase letters, numbers, and hyphens"
        );
      }

      if (
        typeof description !== "string" ||
        description.trim().length < 30 ||
        description.trim().length > 1000
      ) {
        throw new TypeError("Description must be 30–1000 characters long");
      }

      if (typeof image_url !== "string" || !image_url.trim()) {
        throw new TypeError("Image URL is required");
      }

      if (!Array.isArray(users)) {
        throw new TypeError("Users must be an array");
      }

      for (const entry of users) {
        if (!entry.user || !mongoose.Types.ObjectId.isValid(entry.user)) {
          throw new TypeError("Invalid user ObjectId in users array");
        }

        if (
          entry.installed_at &&
          isNaN(new Date(entry.installed_at).getTime())
        ) {
          throw new TypeError("installed_at must be a valid date");
        }
      }

      /* ================= DUPLICATE CHECK ================= */

      const existing = await Extension_Model.findOne({
        $or: [{ name: name.trim() }, { slug: slug.trim() }],
      });

      if (existing) {
        throw new ApiError(
          409,
          "Extension with same name or slug already exists"
        );
      }

      /* ================= CREATE ================= */

      const extension = await Extension_Model.create({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        image_url: image_url.trim(),
        users,
        install_count: users.length,
        display,
        version,
        category,
      });

      return ApiResponse.success(
        res,
        extension,
        "Extension created successfully"
      );
    } catch (error) {
      console.error(error);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to create extension",
          error.statusCode,
          error.message
        );
      }

      return ApiResponse.error(
        res,
        "Failed to create extension",
        500,
        error.message
      );
    }
  }

  static async list(req, res) {
    try {
      const isConnected = await Database.isConnected();
      if (!isConnected) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { is_admin, id } = req?.user;

      if (!is_admin) {
        throw new AuthorizationError(
          "Only Admins are allowed to view the extension list"
        );
      }

      const extensions = await Extension_Model.find();

      const result = extensions.map((ext) => {
        const isInstalled = ext.users?.some(
          (u) => u.user.toString() === id.toString()
        );

        return {
          ...ext._doc,
          is_installed: isInstalled,
        };
      });

      return ApiResponse.success(res, result, "Extension fetched successfully");
    } catch (error) {
      console.error(error);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to fetch extension",
          error.statusCode,
          error.message
        );
      }

      return ApiResponse.error(
        res,
        "Failed to fetch extension",
        500,
        error.message
      );
    }
  }

  static async install(req, res) {
    try {
      const isConnected = await Database.isConnected();
      if (!isConnected) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { is_admin, id } = req?.user;

      if (!is_admin) {
        throw new AuthorizationError(
          "Only Admins are allowed to install the extension"
        );
      }

      const { ext_id } = req.params;

      const result = await Extension_Model.findOneAndUpdate(
        {
          _id: ext_id,
          "users.user": { $ne: id }, // prevent duplicate install
        },
        {
          $push: {
            users: {
              user: id,
              installed_at: new Date(),
            },
          },
        },
        { new: true }
      );

      if (!result) {
        throw new NotFoundError("Extension not found or installed already");
      }

      return ApiResponse.success(
        res,
        result,
        "Extension insatlled successfully"
      );
    } catch (error) {
      console.error(error);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to insatlled extension",
          error.statusCode,
          error.message
        );
      }

      return ApiResponse.error(
        res,
        "Failed to insatlled extension",
        500,
        error.message
      );
    }
  }

  static async uninstall(req, res) {
    try {
      const isConnected = await Database.isConnected();
      if (!isConnected) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { is_admin, id } = req.user;
      const { ext_id } = req.params;

      if (!is_admin) {
        throw new AuthorizationError(
          "Only Admins are allowed to uninstall the extension"
        );
      }

      const result = await Extension_Model.findOneAndUpdate(
        {
          _id: ext_id,
          "users.user": id, // must be installed
        },
        {
          $pull: {
            users: { user: id },
          },
        },
        { new: true }
      );

      if (!result) {
        throw new NotFoundError("Extension not found or not installed");
      }

      return ApiResponse.success(
        res,
        result,
        "Extension uninstalled successfully"
      );
    } catch (error) {
      console.error(error);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to uninstall extension",
          error.statusCode,
          error.message
        );
      }

      return ApiResponse.error(
        res,
        "Failed to uninstall extension",
        500,
        error.message
      );
    }
  }
}
