// --- 1. CONFIGURACIÓN Y VARIABLES GLOBALES ---
// Declaramos las variables fuera del onload para que sean accesibles por todas las funciones
let profileCache = JSON.parse(localStorage.getItem('nostr_profiles')) || {};
let userPubkey = null;


import L from 'leaflet';

import ngeohash from 'ngeohash';

import { Relay } from 'nostr-tools';

    // --- 2. INICIALIZAR MAPA EN ROSARIO ---
    const map = L.map('map').setView([-32.9468, -60.6393], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO'
    }).addTo(map);

    console.log("Mapa cargado con éxito");

    // Activar GPS automático (Requiere HTTPS en HostGator)
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(pos => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 14);
            loadPublicAnchors(map, L, ngeohash, NostrTools);
        }, () => {
            console.warn("GPS denegado, cargando puntos globales.");
            loadPublicAnchors(map, L, ngeohash, NostrTools);
        });
    }

    // --- 3. VINCULACIÓN DE EVENTOS ---
    // Usamos funciones anónimas para pasar las librerías como parámetros si es necesario
    document.getElementById('btn-login').addEventListener('click', loginWithNostr);
    document.getElementById('btn-anchor').addEventListener('click', publishAnchor);


// --- 4. FUNCIONES DE LÓGICA NOSTR ---

async function loadPublicAnchors(map, L, ngeohash, NostrTools) {
    // Lista de relays optimizada para estabilidad
    const RELAYS = [
        'wss://relay.damus.io', 
        'wss://nos.lol', 
        'wss://relay.current.land', 
        'wss://relay.primal.net'
    ];

    RELAYS.forEach(async (url) => {
        try {
            // Usamos la ruta global para evitar errores de undefined
            const relay = await window.NostrTools.Relay.connect(url);
            relay.subscribe([{ kinds: [1], "#t": ["spatial_anchor"] }], {
                onevent(event) {
                    const gTag = event.tags.find(t => t[0] === 'g');
                    if (!gTag) return;
                    
                    const { latitude, longitude } = window.ngeohash.decode(gTag[1]);
                    const cached = profileCache[event.pubkey];
                    
                    L.marker([latitude, longitude]).addTo(map)
                        .bindPopup(createPopupHTML(event, cached?.name || event.pubkey.substring(0,8), cached?.picture));
                }
            });
        } catch (e) { 
            console.error("Error de conexión con relay:", url); 
        }
    });
}

async function loginWithNostr() {
    if (!window.nostr) {
        alert("Por favor, instala la extensión Alby o nos2x.");
        return;
    }

    try {
        // Obtenemos la llave pública (Abre ventana de Alby)
        userPubkey = await window.nostr.getPublicKey();
        console.log("Login exitoso. Pubkey:", userPubkey);

        const nameElem = document.getElementById('user-name');
        if (nameElem) nameElem.innerText = userPubkey.substring(0, 8) + "...";
        
        const loginBtn = document.getElementById('btn-login');
        if (loginBtn) loginBtn.style.display = 'none';

        alert("¡Conectado con éxito!");
    } catch (error) {
        console.error("Error en login:", error);
        alert("No se pudo conectar con Nostr.");
    }
}

async function publishAnchor() {
    if (!userPubkey) {
        alert("Primero debes conectar tu Nostr (Login).");
        return;
    }
    
    const nombre = document.getElementById('poi-name').value || "Lugar en Rosario";
    const desc = document.getElementById('poi-desc').value || "";
    const foto = document.getElementById('poi-photo')?.value || "";

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Referencia global absoluta para evitar fallos de 'undefined'
        const hash = window.ngeohash.encode(latitude, longitude, 9);
        
        const event = {
            kind: 1,
            pubkey: userPubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: `${nombre}\n\n${desc}`,
            tags: [
                ["g", hash], 
                ["t", "spatial_anchor"], 
                ["location", `${latitude},${longitude}`]
            ]
        };

        if (foto) event.tags.push(["image", foto]);

        try {
            const signed = await window.nostr.signEvent(event);
            // Uso de la ruta global exacta para corregir el error de tus capturas
            const relay = await window.NostrTools.Relay.connect('wss://relay.damus.io');
            
            await relay.publish(signed);
            alert("¡Punto anclado con éxito en Rosario!");
            
            relay.close();
            location.reload(); 
        } catch (err) {
            console.error("Error al publicar:", err);
            alert("Hubo un problema al firmar o publicar el evento.");
        }
    }, (error) => {
        alert("Error de GPS: Asegúrate de estar en HTTPS y dar permisos de ubicación.");
    });
}

// --- 5. UTILIDADES ---

function createPopupHTML(event, name, pic) {
    return `
        <div style="padding:10px; min-width:150px;">
            <strong style="color:#5851db;">@${name}</strong>
            <p style="margin:5px 0; font-size:13px;">${event.content.split('\n\n')[0]}</p>
        </div>
    `;
}