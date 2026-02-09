import { GeoLogic } from './geo-utils.js';
import { CATEGORIAS } from './categories.js';
import { AuthManager } from './auth.js';

export function initAnchor(mapManager, nostrService) {
    const categorySelect = document.getElementById('poi-category');
    const btnAnchor = document.getElementById('btn-anchor');
    const debugToggle = document.getElementById('debug-mode-toggle');

    if (!categorySelect || !btnAnchor) return;

    // 1. Poblamos el selector de categorías
    CATEGORIAS.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.label;
        categorySelect.appendChild(option);
    });

    btnAnchor.onclick = async () => {
        const categoria = categorySelect.value || 'nostr';
        const isDebug = debugToggle?.checked; 

        try {
            const pos = await mapManager.getCurrentLocation();
            const nombre = document.getElementById('poi-name').value || "Punto";
            const desc = document.getElementById('poi-desc').value || "";

            if (isDebug) {
                // --- MODO PRUEBA (Pin Violeta / Volátil) ---
                const mockEvent = {
                    id: "test-" + Date.now(),
                    pubkey: AuthManager.userPubkey || "00000000",
                    content: `${nombre}\n\n${desc}`,
                    tags: [["t", categoria], ["t", "spatial_anchor"]]
                };
                
                // Generamos el HTML y lo añadimos como 'temp' (Violeta)
                const html = mapManager.createPopupHTML(mockEvent, null, categoria);
                mapManager.addMarker(mockEvent.id, pos.lat, pos.lon, html, categoria, 'temp');
                
                console.log("🧪 Prueba local creada (Violeta).");
            } else {
                // --- MODO REAL (Pin Azul / Nostr) ---
                if (!AuthManager.userPubkey) return alert("Inicia sesión para publicar.");
                
                const eventData = {
                    pubkey: AuthManager.userPubkey,
                    content: `${nombre}\n\n${desc}`,
                    tags: [
                        ["g", GeoLogic.encode(pos.lat, pos.lon)],
                        ["t", "spatial_anchor"],
                        ["t", categoria],
                        ["location", pos.lat + "," + pos.lon]
                    ]
                };

                const signedEvent = await nostrService.publishAnchor(eventData);
                
                // Generamos el HTML y lo añadimos como 'public' (Azul)
                const html = mapManager.createPopupHTML(signedEvent, null, categoria);
                mapManager.addMarker(signedEvent.id, pos.lat, pos.lon, html, categoria, 'public');
                
                alert("🚀 ¡Posición anclada con éxito en Nostr!");
            }

            // Limpieza de campos
            document.getElementById('poi-name').value = '';
            document.getElementById('poi-desc').value = '';
            categorySelect.value = '';

        } catch (err) {
            console.error("Error al anclar:", err);
            alert("Error: " + err.message);
        }
    };
}