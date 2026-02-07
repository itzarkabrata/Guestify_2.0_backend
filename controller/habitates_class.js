import { Habitate_Model } from "../models/habitate.js";
import {
  ApiError,
  TypeError as ApiTypeError,
} from "../server-utils/ApiError.js";

export class Habitate {
  static async createHabitate(personsData, req, index, session) {
    try {
      // if (!req) {
      //   throw new Error("Req body is required for Habitates creation");
      // }

      // // Find the uploaded file for this habitate
      // const habitatefile = req?.files?.find(
      //   (f) => f.fieldname === `persons[${index}][image]`
      // );

      // const doc_file = req?.files?.find(
      //   (f) => f.fieldname === `persons[${index}][identity_image]`
      // );

      // // Check if the files are found and assign their paths and filenames
      // if (Object?.keys(habitatefile)?.length !== 0) {
      //   personsData.image_url = habitatefile?.path; // storing the url
      //   personsData.image_id = habitatefile?.filename; // storing the public id
      // } else {
      //   throw new Error("Habitate Image is not been uploaded");
      // }
      // if (Object?.keys(doc_file)?.length !== 0) {
      //   personsData.identity_image_url = doc_file?.path; // storing the url
      //   personsData.identity_image_id = doc_file?.filename; // storing the public id
      // } else {
      //   throw new Error(
      //     "Habitate Identity Document Image is not been uploaded"
      //   );
      // }

      const {
        booking_id,
        first_name,
        last_name,
        age,
        gender,
        address,
        dial_code,
        contact_number,
        type_of_identity,
        identity_id,
        is_primary,
        image,
        image_id,
        identity_image,
        identity_image_id
      } = personsData;

      if (!booking_id) {
        throw new Error("Booking ID is required for Habitate creation");
      }

      // validate each habitate entry
      if (typeof first_name !== "string")
        throw new ApiTypeError("First name must be of type string");
      if (typeof last_name !== "string")
        throw new ApiTypeError("Last name must be of type string");
      if (typeof age !== "number")
        throw new ApiTypeError("Age must be of type number");
      if (typeof gender !== "string")
        throw new ApiTypeError("Gender must be of type string");
      if (!["male", "female", "other"].includes(gender))
        throw new ApiTypeError("Gender must be 'male', 'female', or 'other'");
      if (typeof address !== "string")
        throw new ApiTypeError("Address must be of type string");
      if (dial_code && typeof dial_code !== "string")
        throw new ApiTypeError("Dial code must be of type string");
      if (contact_number && typeof contact_number !== "string")
        throw new ApiTypeError("Contact number must be of type string");
      if (typeof type_of_identity !== "string")
        throw new ApiTypeError("Type of identity must be of type string");
      if (typeof identity_id !== "string")
        throw new ApiTypeError("Identity ID must be of type string");
      if (typeof is_primary !== "number" && typeof is_primary !== "undefined")
        throw new ApiTypeError("is_primary must be of type number");
      if (typeof image !== "string")
        throw new ApiTypeError("Image URL must be of type string");
      if (typeof image_id !== "string")
        throw new ApiTypeError("Image ID must be of type string");
      if (typeof identity_image !== "string")
        throw new ApiTypeError("Identity Image URL must be of type string");
      if (typeof identity_image_id !== "string")
        throw new ApiTypeError("Identity Image ID must be of type string");


      const newHabitate = new Habitate_Model({
        booking_id,
        first_name,
        last_name,
        age: Number(age),
        gender,
        address,
        dial_code,
        contact_number,
        type_of_identity,
        identity_id,
        image: image,
        image_id: image_id,
        identity_image: identity_image,
        identity_image_id: identity_image_id,
        is_primary: Number(is_primary) || 0,
      });

      const enlistedHabitate = await newHabitate.save({ session });

      return enlistedHabitate;

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error("Error creating habitate: " + error.message);
    }
  }
}
