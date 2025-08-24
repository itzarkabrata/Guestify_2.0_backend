export function getPublicIdFromUrl(url) {
  // Remove any query params if they exist
  const cleanUrl = url.split("?")[0];

  // Find the "/upload/" segment
  const parts = cleanUrl.split("/upload/");
  if (parts.length < 2) {
    throw new Error("Invalid Cloudinary URL");
  }

  // The part after /upload/ is: v<version>/<public_id>.<ext>
  const afterUpload = parts[1];

  // Remove version
  const versionAndPublicId = afterUpload.split("/");
  versionAndPublicId.shift(); // remove version

  // Join back the public ID path
  const publicIdWithExt = versionAndPublicId.join("/");

  // Remove file extension
  const dotIndex = publicIdWithExt.lastIndexOf(".");
  const publicId =
    dotIndex !== -1 ? publicIdWithExt.substring(0, dotIndex) : publicIdWithExt;

  return publicId;
}

export function filterPGsAndRoomsByRent(data, minRent, maxRent) {
  const min = minRent !== undefined && minRent !== "" ? Number(minRent) : null;
  const max = maxRent !== undefined && maxRent !== "" ? Number(maxRent) : null;

  const hasMin = min !== null && !isNaN(min);
  const hasMax = max !== null && !isNaN(max);

  return data.filter((pg) => {
    return pg.rooms.some((room) => {
      const rent = room.room_rent;
      if (hasMin && hasMax) return rent >= min && rent <= max;
      if (hasMin) return rent >= min;
      if (hasMax) return rent <= max;
      return true;
    });
  });
}

export function toBoolean(value) {
  if (typeof value === "boolean") return value; // already boolean
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return false;
}

export function haversineDistance(coord1, coord2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((R * c).toFixed(2));; // distance in km
}
