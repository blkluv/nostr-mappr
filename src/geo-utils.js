import ngeohash from 'ngeohash'; 

export const GeoUtils = {

    /* Converts latitude and longitude to a precision 9 geohash. */
    encode: (lat, lon) => {
        return ngeohash.encode(lat, lon, 9);
    },

    /* Decodes a geohash string into a latitude/longitude object. */
    decode: (hash) => {
        const decoded = ngeohash.decode(hash);
        return {
            lat: decoded.latitude,
            lon: decoded.longitude
        };
    },

    /* Extracts geohash or raw coordinates from Nostr event tags. */
    getHashFromEvent: (event) => {
        const gTag = event.tags.find(t => t[0] === 'g');
        if (!gTag) return null;

        const value = gTag[1];

        /* If value contains a comma, it is treated as raw coordinates (Lat, Lon). */
        if (value.includes(',')) {
            const [lat, lon] = value.split(',').map(Number);
            return { lat, lon, isRaw: true }; 
        }

        /* Otherwise, assume it is a standard Geohash string. */
        return value;
    }
};