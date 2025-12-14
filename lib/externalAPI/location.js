// export class Location {
//     static async getLatLong(CountryRegion,locality,postalCode,addressLine) {
//         try {
//             const address = addressLine?.replaceAll(" ","%20");

//             const res = await fetch(`http://dev.virtualearth.net/REST/v1/Locations?CountryRegion=${CountryRegion}&locality=${locality}&postalCode=${postalCode}&addressLine=${address}&key=${process.env.MAP_KEY}`);

//             const data = await res.json()

//             if(data?.statusCode===403){
//                 throw new Error("Something Went erong while getting data from MAP API. API key may expire");
//             }

//             return {
//                 addressName : data?.resourceSets[0]?.resources[0]?.name,
//                 point : data?.resourceSets[0]?.resources[0]?.point
//             }
//         } catch (error) {
//             // console.log(error.message);
//             throw new Error(`Error while calling lat-long api : ${error.message}`);
//         }
//     }
// }

// // Location.getLatLong("IN","Kolkata","700054","33 Dhan Devi Khanna Road");

export class Location {
    static async getLatLong(CountryRegion, locality, postalCode, addressLine, stateLine) {
        try {
            const fullAddress = `${addressLine}, ${locality}, ${postalCode}, ${stateLine}, ${CountryRegion}`;
            const encodedAddress = encodeURIComponent(fullAddress);
            
            const res = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=f5e374417ef8475db9a203a60a40d072`);
            const data = await res.json();

            // console.log(encodedAddress,"Encoded Address");
            // console.log(data,"Response Data");
            const {code, message} = data?.status;

            if(code===401){
                throw new Error(`Map Error : ${message}` ?? "Error in response of map api");
            }

            if (!data || data.results.length === 0) {
                // Fallback location (e.g., center of Kolkata)
                return {
                    addressName: "Fallback Location: Kolkata, India",
                    point: {
                        type: "Point",
                        coordinates: [22.5726,88.3639]  // [lat, lng] for Kolkata
                    }
                };
            }

            const { formatted, geometry } = data.results[0];

            return {
                addressName: formatted,
                point: {
                    type: "Point",
                    coordinates: [geometry.lat, geometry.lng]
                }
            };
        } catch (error) {
            throw new Error(`Error while calling lat-long api : ${error.message}`);
        }
    }

    static async getPlaces(query, limit, countryCode) {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1&countrycodes=${countryCode}`, {
            headers: {
                'User-Agent': 'Guestify Admin Panel (admin@guestify.in)'
            }
        });
        const data = await res.json();
        return data;
    }
}

// console.log(await Location.getLatLong("India","Kolkata","700054","A-1, Janakpuri","West Bengal"));

// console.log(await Location.getLatLong(
//   "India",
//   "Pune",               // district
//   "411001",             // postal code
//   "301, MG Road, Camp",
//   "Maharashtra"
// ));