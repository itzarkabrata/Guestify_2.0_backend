import { Habitate_Model } from "../models/habitate.js";

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
        type_of_identity,
        identity_id,
        is_primary,
        image,
        image_id,
        identity_image,
        identity_image_id
      } = personsData;

      if(!booking_id) {
        throw new Error("Booking ID is required for Habitate creation");
      }

      // validate each habitate entry
      if (typeof first_name !== "string")
        throw new TypeError("First name must be of type string");
      if (typeof last_name !== "string")
        throw new TypeError("Last name must be of type string");
      if (typeof age !== "number")
        throw new TypeError("Age must be of type number");
      if (typeof gender !== "string")
        throw new TypeError("Gender must be of type string");
      if (!["male", "female", "other"].includes(gender))
        throw new TypeError("Gender must be 'male', 'female', or 'other'");
      if (typeof address !== "string")
        throw new TypeError("Address must be of type string");
      if (typeof type_of_identity !== "string")
        throw new TypeError("Type of identity must be of type string");
      if (typeof identity_id !== "string")
        throw new TypeError("Identity ID must be of type string");
      if( typeof is_primary !== "number" && typeof is_primary !== "undefined")
        throw new TypeError("is_primary must be of type number");
      if (typeof image !== "string")
        throw new TypeError("Image URL must be of type string");
      if (typeof image_id !== "string")
        throw new TypeError("Image ID must be of type string");
      if (typeof identity_image !== "string")
        throw new TypeError("Identity Image URL must be of type string");
      if (typeof identity_image_id !== "string")
        throw new TypeError("Identity Image ID must be of type string");
      

      const newHabitate = new Habitate_Model({
        booking_id,
        first_name,
        last_name,
        age: Number(age),
        gender,
        address,
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
      throw new Error("Error creating habitate: " + error.message);
    }
  }
}
