import L from 'leaflet';
import ngeohash from 'ngeohash';
import { Relay } from 'nostr-tools';

// --- 1. CONFIGURACIÓN INICIAL ---
const map = L.map('map').setView([-34.6037, -58.3816], 13); 
const profileCache = JSON.parse(localStorage.getItem('nostr_profiles') || '{}');
let userPubkey = null;

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO'
}).addTo(map);

// Inicializar GPS
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(pos => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
        loadPublicAnchors();
    }, () => loadPublicAnchors());
}

// --- 2. INTERFAZ Y POPUPS ---

function createPopupHTML(event, name, pic) {
    const defaultPic = `https://ui-avatars.com/api/?name=${name}&background=5851db&color=fff`;
    const [titulo, ...descParts] = event.content.split('\n\n');
    const descripcion = descParts.join('\n\n');
    const imageTag = event.tags.find(t => t[0] === 'image');

    return `
        <div style="display:flex; flex-direction:column; gap:8px; min-width:200px; font-family: sans-serif;">
            <div style="display:flex; align-items:center; gap:8px; border-bottom:1px solid #eee; padding-bottom:5px;">
                <img src="${pic || defaultPic}" onerror="this.src='${defaultPic}'" style="width:25px; height:25px; border-radius:50%;">
                <small style="color:#5851db; font-weight:bold;">@${name}</small>
            </div>
            <div>
                <strong style="display:block; font-size:14px; color:#333;">${titulo}</strong>
                ${descripcion ? `<p style="font-size:12px; color:#666; margin:4px 0;">${descripcion}</p>` : ''}
                ${imageTag ? `<img src="${imageTag[1]}" style="width:100%; border-radius:10px; margin-top:8px; object-fit:cover; max-height:120px;">` : ''}
            </div>
            <button onclick="window.open('https://njump.me/${event.pubkey}', '_blank')" class="btn-popup">
                Ver Perfil
            </button>
        </div>
    `;
}

// --- 3. LÓGICA DE NOSTR (CARGA Y LOGIN) ---

async function loadPublicAnchors() {
    const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.snort.social'];
    RELAYS.forEach(async (url) => {
        try {
            const relay = await Relay.connect(url);
            relay.subscribe([{ kinds: [1], "#t": ["spatial_anchor"] }], {
                onevent(event) {
                    const gTag = event.tags.find(t => t[0] === 'g');
                    if (!gTag) return;
                    const { latitude, longitude } = ngeohash.decode(gTag[1]);
                    
                    const cached = profileCache[event.pubkey];
                    const marker = L.marker([latitude, longitude]).addTo(map)
                        .bindPopup(createPopupHTML(event, cached?.name || event.pubkey.substring(0,8), cached?.picture));

                    if (!cached) fetchProfile(event.pubkey, marker, event);
                }
            });
        } catch (e) { console.error("Relay error", e); }
    });
}

async function fetchProfile(pubkey, marker, event) {
    try {
        const res = await fetch(`https://api.nostr.band/v0/metadata/${pubkey}`);
        const data = await res.json();
        if (data?.content) {
            const p = JSON.parse(data.content);
            profileCache[pubkey] = { name: p.display_name || p.name, picture: p.picture };
            localStorage.setItem('nostr_profiles', JSON.stringify(profileCache));
            if (marker) marker.setPopupContent(createPopupHTML(event, profileCache[pubkey].name, profileCache[pubkey].picture));
        }
    } catch (e) { console.warn("Profile fetch failed"); }
}

async function loginWithNostr() {
    if (!window.nostr) return alert("Instala Alby.");
    try {
        userPubkey = await window.nostr.getPublicKey();
        const nameElem = document.getElementById('user-name');
        const loginBtn = document.getElementById('btn-login');
        
        if (nameElem) nameElem.innerText = userPubkey.substring(0, 8) + "...";
        if (loginBtn) loginBtn.style.display = 'none';

        fetchProfile(userPubkey).then(() => {
            const p = profileCache[userPubkey];
            if (p && nameElem) nameElem.innerText = p.name;
            if (p?.picture) {
                const avatar = document.getElementById('user-avatar');
                avatar.src = p.picture;
                avatar.style.display = 'block';
            }
        });
    } catch (e) { console.error("Login Error", e); }
}

// --- 4. EVENTOS ---

document.getElementById('btn-login').addEventListener('click', loginWithNostr);

document.getElementById('btn-anchor').addEventListener('click', async () => {
    if (!userPubkey) return alert("Haz login primero.");
    
    const nombre = document.getElementById('poi-name').value || "Punto de Interés";
    const desc = document.getElementById('poi-desc').value || "";
    const foto = document.getElementById('poi-photo').value || "";

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const hash = ngeohash.encode(latitude, longitude, 9);
        
        const event = {
            kind: 1,
            pubkey: userPubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: `${nombre}\n\n${desc}`,
            tags: [["g", hash], ["t", "spatial_anchor"], ["location", `${latitude},${longitude}`], ["image", foto]]
        };

        const relay = await Relay.connect('wss://relay.damus.io');
        const signed = await window.nostr.signEvent(event);
        await relay.publish(signed);
        alert("¡Anclaje publicado!");
        relay.close();
    });
});