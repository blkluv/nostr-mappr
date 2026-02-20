import { nip46, generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';

export class NostrConnectService {
    constructor(nostrPool, relays) {
        this.pool = nostrPool;
        this.relays = relays;
        this.signerPubkey = null;
        this.clientSecretKey = null;
        this.clientPubkey = null;
        this.connection = null;
    }

    /**
     * Initializes a connection with a remote signer (Bunker).
     * @param {string} bunkerUrl - Connection string (bunker://<pubkey>?relay=<relay>&token=<token>)
     */
    async connect(bunkerUrl) {
        try {
            // 1. Setup ephemeral client key
            this.clientSecretKey = generateSecretKey();
            this.clientPubkey = getPublicKey(this.clientSecretKey);

            // 2. Parse bunker URL
            const target = nip46.parseBunkerUrl(bunkerUrl);
            this.signerPubkey = target.pubkey;
            
            // 3. Setup NIP-46 Connection
            this.connection = new nip46.NostrConnect(this.pool, this.relays, this.clientSecretKey, this.signerPubkey);

            // 4. Send connect request
            await this.connection.connect();
            
            console.log("✅ Nostr Connect established with:", this.signerPubkey);
            return this.signerPubkey;
        } catch (err) {
            console.error("Nostr Connect failure:", err);
            throw err;
        }
    }

    /**
     * Signs an event using the remote signer.
     */
    async signEvent(event) {
        if (!this.connection) throw new Error("No remote signer connected");
        
        try {
            const signedEvent = await this.connection.signEvent(event);
            return signedEvent;
        } catch (err) {
            console.error("Remote signing error:", err);
            throw err;
        }
    }

    /**
     * Deserializes connection from storage.
     */
    async resume(signerPubkey, secretKeyHex) {
        this.signerPubkey = signerPubkey;
        this.clientSecretKey = new Uint8Array(Buffer.from(secretKeyHex, 'hex'));
        this.clientPubkey = getPublicKey(this.clientSecretKey);
        
        this.connection = new nip46.NostrConnect(this.pool, this.relays, this.clientSecretKey, this.signerPubkey);
        // We don't necessarily need to call connect() again if using the same relays, 
        // but we might need to ensure subscription is active.
    }
}
