import { SimplePool } from 'nostr-tools';
import { AuthManager } from './auth.js';

export class NostrService {
    constructor(relayUrls) {
        this.relays = relayUrls;
        this.pool = new SimplePool();
    }

    /**
     * Se suscribe a los eventos de anclaje espacial.
     * Corregido: Uso de Array para soportar múltiples filtros.
     */
    subscribeToAnchors(onEvent) {
        // 1. Iniciamos 'filtros' como un ARRAY (con corchetes [])
        const filtros = [
            {
                kinds: [1],
                "#t": ["spatial_anchor"],
                limit: 100
            }
        ];

        // 2. Ahora .push() funcionará porque 'filtros' es un Array
        if (AuthManager.userPubkey) {
            filtros.push({
                kinds: [1],
                authors: [AuthManager.userPubkey],
                limit: 50
            });
        }

        // 3. Enviamos el array de filtros a la pool
        return this.pool.subscribeMany(
            this.relays, 
            filtros, 
            {
                onevent(event) {
                    if (event && event.id) {
                        onEvent(event);
                    }
                },
                oneose() {
                    console.log("📡 Conexión exitosa: Historial sincronizado.");
                },
                onclose(relay) {
                    console.warn("🔌 Relay cerrado:", relay);
                },
                onerror(err) {
                    console.error("⚠️ Error de relay:", err);
                }
            }
        );
    }

    /**
     * Firma y publica un nuevo anclaje en la red Nostr.
     */
    async publishAnchor(eventData) {
        const event = {
            kind: 1,
            pubkey: eventData.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: eventData.content,
            tags: eventData.tags
        };

        try {
            // Requiere extensión compatible (Alby)
            const signedEvent = await window.nostr.signEvent(event);
            
            // Publica en los relays configurados
            await Promise.any(this.pool.publish(this.relays, signedEvent));
            
            console.log("✅ Evento publicado con éxito:", signedEvent);
            return signedEvent;
        } catch (err) {
            console.error("❌ Error al firmar o publicar:", err);
            throw err;
        }
    }

    /**
     * Obtiene los metadatos de perfil (Kind 0) de un usuario.
     */
    async getUserProfile(pubkey) {
        const filter = { kinds: [0], authors: [pubkey], limit: 1 };
        
        try {
            // Timeout de 3 segundos para evitar bloqueos por relays lentos
            const event = await this.pool.get(this.relays, filter, { timeout: 3000 });
            
            if (event && event.content) {
                return JSON.parse(event.content);
            }
        } catch (e) {
            console.warn("⚠️ No se pudo obtener el perfil de:", pubkey);
        }
        return null;
    }
}