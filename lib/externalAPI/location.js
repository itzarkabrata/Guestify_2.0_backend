export class Location {
    static async getLatLong(CountryRegion,locality,postalCode,addressLine) {
        try {
            const address = addressLine?.replaceAll(" ","%20");

            const res = await fetch(`http://dev.virtualearth.net/REST/v1/Locations?CountryRegion=${CountryRegion}&locality=${locality}&postalCode=${postalCode}&addressLine=${address}&key=${process.env.MAP_KEY}`);

            const data = await res.json()

            // console.log(data?.resourceSets[0]?.resources[0]?.point);

            return {
                addressName : data?.resourceSets[0]?.resources[0]?.name,
                point : data?.resourceSets[0]?.resources[0]?.point
            }
        } catch (error) {
            // console.log(error.message);
            throw new Error(`Error while calling lat-long api : ${error.message}`);
        }
    }
}

// Location.getLatLong("IN","Kolkata","700054","33 Dhan Devi Khanna Road");