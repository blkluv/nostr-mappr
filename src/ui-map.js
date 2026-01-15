// ui-map.js
import L from 'leaflet';

export class MapManager {
    constructor(containerId, defaultCoords) {
        this.map = L.map(containerId).setView(defaultCoords, 13);
        this.markers = new Map(); // Para rastrear marcadores por ID de evento

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO'
        }).addTo(this.map);
    }

    /**
     * Obtiene la ubicación actual del usuario mediante el navegador.
     */
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!("geolocation" in navigator)) {
                reject("GPS no disponible");
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                err => reject(err)
            );
        });
    }

    /**
     * Mueve la vista del mapa a una ubicación.
     */
    setView(lat, lon, zoom = 14) {
        this.map.setView([lat, lon], zoom);
    }

    /**
     * Añade un marcador al mapa si no existe ya.
     */
    addMarker(id, lat, lon, popupHTML) {
        if (this.markers.has(id)) return; // Evitar duplicados

        const marker = L.marker([lat, lon]).addTo(this.map).bindPopup(popupHTML);
        this.markers.set(id, marker);
    }

    /**
     * Genera el HTML para el popup del marcador.
     */
    createPopupHTML(event, name) {
        return `
            <div style="padding:10px; min-width:150px;">
                <strong style="color:#5851db;">@${name}</strong>
                <p style="margin:5px 0; font-size:13px;">${event.content.split('\n\n')[0]}</p>
            </div>
        `;
    }
}