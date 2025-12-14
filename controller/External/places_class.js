import { Location } from "../../lib/externalAPI/location.js";
import { ApiError, EvalError } from "../../server-utils/ApiError.js";
import { ApiResponse } from "../../server-utils/ApiResponse.js";

export class Places {
  static async getPlaceSuggesion(req, res) {
    try {
      const { query, limit = 10, countryCode = "in" } = req.query;

      if(!query){
        throw new EvalError("Query Param is required");
      }

      const places = await Location.getPlaces(query, limit, countryCode);

      //   {
      // 		"place_id": 230538575,
      // 		"licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
      // 		"osm_type": "way",
      // 		"osm_id": 52097785,
      // 		"lat": "22.5642488",
      // 		"lon": "88.3407860",
      // 		"class": "leisure",
      // 		"type": "park",
      // 		"place_rank": 24,
      // 		"importance": 0.08007340428778513,
      // 		"addresstype": "park",
      // 		"name": "Eden Garden Park",
      // 		"display_name": "Eden Garden Park, Esplanade, Kolkata, West Bengal, India",
      // 		"address": {
      // 			"park": "Eden Garden Park",
      // 			"suburb": "Esplanade",
      // 			"city": "Kolkata",
      // 			"state_district": "Kolkata",
      // 			"state": "West Bengal",
      // 			"ISO3166-2-lvl4": "IN-WB",
      // 			"country": "India",
      // 			"country_code": "in"
      // 		},
      // 		"boundingbox": [
      // 			"22.5629077",
      // 			"22.5657630",
      // 			"88.3390510",
      // 			"88.3424771"
      // 		]
      // 	},

      const finalRes = places?.map((p) => ({
        placeid: p?.place_id || null,
        place_name: p?.display_name || "",
        state: p?.address?.state || "",
        country: p?.address?.country || "",
        type: p?.type || p?.addresstype || "",
        location: {
          type: "Point",
          coordinates: [Number(p?.lon), Number(p?.lat)],
        },
      }));

      return ApiResponse.success(
        res,
        finalRes,
        "Place suggestions fetched successfully",
        200
      );
    } catch (error) {
      console.error("Error in place suggestion:", error);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to get place suggestions",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to get place suggestions",
          500,
          error.message
        );
      }
    }
  }
}
