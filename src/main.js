// main.js - El Director de Orquesta
import { MapManager } from './ui-map.js';
import { NostrService } from './nostr-service.js';
import { GeoLogic } from './geo-utils.js';
import { AuthManager } from './auth.js';
import { initUI, openModal, closeModal, getDraftModalHTML, getJournalModalHTML } from './ui-controller.js';
import { initFilters } from './filter-controller.js';
import { initAnchor } from './anchor-controller.js';
import { initSearch } from './search-controller.js';

// --- CONFIGURACIÓN ---
const RELAYS = ['wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.damus.io']; 
const ROSARIO_COORDS = [-32.9468, -60.6393];


// --- SESIÓN DE USUARIO ---
const sessionActive = AuthManager.isLoggedIn(); 
if (sessionActive) console.log("🔐 Sesión recuperada:", AuthManager.userPubkey);

// --- INICIALIZACIÓN ---
const map = new MapManager('map', ROSARIO_COORDS); 
window.map = map;

initSearch(map);
initFilters(map);

const nostr = new NostrService(RELAYS);

initAnchor(map, nostr);

// Cargar puntos existentes
const eventosProcesados = new Set();

function iniciarSuscripcion() {
    nostr.subscribeToAnchors(async (event) => {
        
        if (eventosProcesados.has(event.id)) return;
        eventosProcesados.add(event.id);

        const name = AuthManager.getDisplayName(event.pubkey);

        const hash = GeoLogic.getHashFromEvent(event);
        if (hash) {
            const { lat, lon } = GeoLogic.decode(hash);
            const tagCat = event.tags.find(t => t[0] === 't' && t[1] !== 'spatial_anchor');
            const categoriaEvento = tagCat ? tagCat[1] : 'todos';
            const popupHTML = map.createPopupHTML(event, null, categoriaEvento);
            map.addMarker(event.id, lat, lon, popupHTML, categoriaEvento);
        }
    });
}

// Llamada inicial
iniciarSuscripcion();

// centrar mapa por GPS al inicio
map.getCurrentLocation()
    .then(pos => map.setView(pos.lat, pos.lon))
    .catch(err => console.warn("Usando ubicación por defecto:", err));


initUI(nostr);


window.followUser = async (pubkey, name) => {
    // 1. Verificamos si el usuario está logueado
    if (!AuthManager.userPubkey) {
        alert("¡Hola! Necesitas iniciar sesión para seguir a otros usuarios.");
        return;
    }

    if (pubkey === AuthManager.userPubkey) {
        alert("¡Ese eres tú! No puedes seguirte a ti mismo (aún).");
        return;
    }

    console.log(`✅ Siguiendo a ${name} (${pubkey})`);
    alert(`Próximamente: Siguiendo a ${name} en la red Nostr`);
};

window.zapUser = (pubkey, name, titulo) => {
    if (!AuthManager.userPubkey) {
        alert("Debes estar conectado para enviar Zaps.");
        return;
    }

    console.log(`⚡ Zap iniciado para ${name} por: ${titulo}`);
    alert(`⚡ Próximamente: Enviando sats a ${name} por recomendar "${titulo}"`);
};

document.getElementById('btn-locate-me').onclick = async (e) => {
    e.stopPropagation();
    const btn = document.getElementById('btn-locate-me');
    const icon = btn.querySelector('i');
    
    // Cambiamos el icono por uno de carga
    icon.className = "fas fa-spinner fa-spin"; 
    
    try {
        const pos = await map.getCurrentLocation();
        map.setView(pos.lat, pos.lon, 16);
    } catch (err) {
        alert("📍 Error al obtener ubicación");
    } finally {
        // Restauramos el icono original
        icon.className = "fas fa-crosshairs";
    }
};

map.map.on('popupopen', (e) => {
    // Obtenemos el contenedor del popup recién abierto
    const container = e.popup._contentNode.querySelector('.popup-container');
    if (container) {
        const pubkeyPunto = container.getAttribute('data-pubkey');
        const miPubkey = window.userPubkey || AuthManager.userPubkey; // Doble verificación

        if (miPubkey && miPubkey === pubkeyPunto) {
            container.classList.add('is-owner');
        }
    }
});

window.borrarPunto = async (eventId) => {
    // 1. Confirmación de seguridad
    if (!confirm("¿Deseas eliminar permanentemente este anclaje de la red Nostr?")) return;

    console.log(`🗑️ Intentando borrar evento: ${eventId}`);

    try {
        // 2. Llamamos al servicio de Nostr para firmar el borrado (Kind 5)
        const exito = await nostr.deleteEvent(eventId); 

        if (exito) {
            // 3. Si tuvo éxito, lo eliminamos visualmente del mapa
            const marcador = map.markers.get(eventId);
            if (marcador) {
                map.map.removeLayer(marcador);
                map.markers.delete(eventId);
            }
            
            // 4. Lo quitamos de nuestra lista de control interna
            if (typeof eventosProcesados !== 'undefined') {
                eventosProcesados.delete(eventId);
            }
            
            alert("✅ Solicitud de borrado enviada con éxito.");
        } else {
            alert("❌ Hubo un problema al procesar el borrado.");
        }
    } catch (err) {
        console.error("Error en el proceso de borrado:", err);
        alert("Ocurrió un error inesperado al intentar borrar.");
    }
};

window.addEventListener('trigger-pop', (e) => {
    const { lat, lng } = e.detail;

    // Centramos el mapa en el usuario para que vea su marcador
    window.map.setView(lat, lng, 18);

    if (window.tempPoPMarker) window.map.map.removeLayer(window.tempPoPMarker);

    // El marcador ahora es FIJO (draggable: false) para asegurar presencia
    window.tempPoPMarker = L.marker([lat, lng], {
        draggable: false, 
        icon: L.divIcon({
            className: 'pop-temp-marker',
            html: '<i class="fas fa-thumbtack" style="color: #8e44ad; font-size: 30px;"></i>',
            iconAnchor: [15, 30]
        })
    }).addTo(window.map.map);

    window.tempPoPMarker.bindPopup(`
    <div class="pop-decision-container">
        <strong>📍 Ubicación Confirmada</strong>
        <p>Estás aquí. ¿Cómo quieres registrar este punto?</p>
        <div class="pop-btn-grid">
            <button onclick="window.abrirModalResena(${lat}, ${lng})" class="btn-pop-resena">
                📝 Reseña
            </button>
            <button onclick="window.abrirModalBorrador(${lat}, ${lng})" class="btn-pop-draft">
                💾 Borrador
            </button>
        </div>
    </div>
`, { closeButton: false, offset: [0, -10] }).openPopup();
});

window.abrirModalResena = (lat, lng) => {
    alert(`Abriendo formulario de reseña para: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
};

window.abrirModalBorrador = (lat, lng) => {
    // 1. Cerramos cualquier popup abierto en el mapa para limpiar la vista
    if (window.map && window.map.map) window.map.map.closePopup();
    
    // 2. Abrimos el modal con la estructura de borrador
    openModal(getDraftModalHTML(lat, lng));

    // 3. Vinculamos el botón de cierre (X)
    const closeBtn = document.getElementById('btn-close-draft');
    if (closeBtn) closeBtn.onclick = () => closeModal();

    // 4. Configuración de la zona de fotos
    const fileInput = document.getElementById('draft-photo');
    const previewContainer = document.getElementById('preview-container');
    const uploadZone = document.getElementById('upload-zone');
    let imagesBase64 = []; // Almacén temporal de fotos seleccionadas

    if (uploadZone && fileInput) {
        uploadZone.onclick = () => fileInput.click();

        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    imagesBase64.push(base64);

                    // Renderizado de miniatura en el modal
                    const imgThumb = document.createElement('img');
                    imgThumb.src = base64;
                    imgThumb.style.cssText = "width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid #8e44ad; margin-bottom: 5px;";
                    previewContainer.appendChild(imgThumb);
                };
                reader.readAsDataURL(file);
            });

            // Actualización visual del contador de fotos
            const icon = uploadZone.querySelector('i');
            const label = uploadZone.querySelector('p');
            if (icon) icon.style.display = 'none';
            if (label) label.textContent = `${files.length} fotos seleccionadas`;
        };
    }

    // 5. Lógica de GUARDADO Y FIRMA DIRECTA (Kind 30024)
    const btnSave = document.getElementById('btn-save-draft');
    if (btnSave) {
        btnSave.onclick = async () => {
            const titleInput = document.getElementById('draft-title');
            const title = titleInput ? titleInput.value.trim() : "";

            if (!title) {
                alert("Por favor, ponle un nombre al lugar.");
                return;
            }

            // Efecto visual de carga y firma
            const originalHTML = btnSave.innerHTML;
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> FIRMANDO...';
            btnSave.disabled = true;

            try {
                // Construcción del evento de borrador bajo estándar Nostr
                const eventoBorrador = {
                    kind: 30024,
                    content: `Borrador de anclaje creado desde la app.`,
                    tags: [
                        ["d", `anchor_${Date.now()}`],      // Identificador único
                        ["title", title],                  // Título para la tabla del diario
                        ["g", `${lat},${lng}`],            // Coordenadas geográficas
                        ["t", "spatial_anchor"]            // Tag para filtrado en relays
                    ],
                    created_at: Math.floor(Date.now() / 1000)
                };

                // NOTA: Si imagesBase64 tiene datos, el lunes implementaremos NIP-94 aquí
                
                // Firmar y enviar directamente a los Relays configurados
                const exito = await nostr.publishEvent(eventoBorrador);

                if (exito) {
                    alert(`✅ "${title}" firmado y guardado en tu Diario (Nostr).`);
                    closeModal();
                    // Limpiamos el marcador temporal del mapa si existe
                    if (window.tempPoPMarker) window.map.map.removeLayer(window.tempPoPMarker);
                } else {
                    throw new Error("Firma rechazada");
                }

            } catch (err) {
                console.error("Error en el proceso de firma:", err);
                alert("❌ No se pudo firmar el borrador. Verifica tu extensión (Alby/Nos2x).");
                btnSave.innerHTML = originalHTML;
                btnSave.disabled = false;
            }
        };
    }
};

// main.js

window.cargarYMostrarDiario = async () => {
    const pubkey = AuthManager.userPubkey;
    const bodyTabla = document.querySelector('.journal-table tbody');
    
    if (bodyTabla) {
        bodyTabla.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i> Consultando Relays...</td></tr>';
    }

    try {
        // Consultamos a los relays por eventos Kind 30024 de nuestra autoría
        const filtros = {
            kinds: [30024],
            authors: [pubkey],
            "#t": ["spatial_anchor"] // Filtramos solo nuestros anclajes
        };

        const eventosBorradores = await nostr.fetchEvents(filtros);

        // Actualizamos el modal con los datos reales
        openModal(getJournalModalHTML(eventosBorradores));

        // Re-vinculamos el cierre porque openModal refresca el contenido
        document.getElementById('btn-close-journal').onclick = () => closeModal();

    } catch (err) {
        console.error("Error al cargar el diario:", err);
        if (bodyTabla) {
            bodyTabla.innerHTML = '<tr><td colspan="6">Error al conectar con los relays.</td></tr>';
        }
    }
};

// Función auxiliar para que el botón "📍 Ver" de la tabla funcione
window.centrarMapa = (lat, lng) => {
    closeModal();
    window.map.setView(lat, lng, 16);
};