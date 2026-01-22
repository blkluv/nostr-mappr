import { SimplePool } from 'nostr-tools';
import { AuthManager } from './auth.js';

export class NostrService {
    constructor(relayUrls) {
        this.relays = relayUrls;
        this.pool = new SimplePool();
    }



subscribeToAnchors(onEvent) {

    const filtroPrincipal = {
        kinds: [1],
        "#t": ["spatial_anchor"]
    };

    console.log("🔍 Enviando filtro único:", filtroPrincipal);

    /*const filtrosParaEnviar = [filtroPrincipal];*/
    
    return this.pool.subscribeMany(
        this.relays, 
        filtroPrincipal, 
        {
            onevent(event) {
                if (event && event.id) {
                    console.log("✨ ¡Punto encontrado!", event.id);
                    onEvent(event);
                }
            },
            oneose() {
                console.log("✅ Conexión limpia: Historial sincronizado.");
            }
        }
    );
}
    
    async publishAnchor(eventData) {
        const event = {
            kind: 1,
            pubkey: eventData.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: eventData.content,
            tags: eventData.tags
        };

        try {
            // Llama a la extensión del navegador para firmar
            const signedEvent = await window.nostr.signEvent(event);
            
            // Publica el evento firmado en todos los relays
            await Promise.any(this.pool.publish(this.relays, signedEvent));
            
            console.log("🚀 Evento anclado y publicado:", signedEvent);
            return signedEvent;
        } catch (err) {
            console.error("❌ Error en el proceso de anclaje:", err);
            throw err;
        }
    }

    /**
     * Recupera los metadatos de perfil del usuario (Kind 0).
     */
    async getUserProfile(pubkey) {
        const filter = { kinds: [0], authors: [pubkey], limit: 1 };
        
        try {
            // Intentamos obtener el perfil con un límite de tiempo de 3 segundos
            const event = await this.pool.get(this.relays, filter, { timeout: 3000 });
            
            if (event && event.content) {
                return JSON.parse(event.content);
            }
        } catch (e) {
            console.warn("⚠️ No se pudo cargar el perfil para:", pubkey);
        }
        return null;
    }
}