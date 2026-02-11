export const AuthManager = {
    /* Load stored pubkey and profile cache from localStorage on startup. */
    userPubkey: localStorage.getItem('nostr_user_pubkey') || null,
    profileCache: JSON.parse(localStorage.getItem('nostr_profiles')) || {},

    /* Requests public key from Nostr extension (NIP-07) and persists it. */
    async login() {
        if (!window.nostr) {
            throw new Error("Please install a Nostr extension (e.g., Alby or nos2x).");
        }

        try {
            const pubkey = await window.nostr.getPublicKey();
            this.userPubkey = pubkey;
            
            /* Persist the pubkey for session maintenance. */
            localStorage.setItem('nostr_user_pubkey', pubkey);
            
            console.log("Login successful. Pubkey:", this.userPubkey);
            return this.userPubkey;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    },

    /* Clears session data and reloads the application. */
    logout() {
        this.userPubkey = null;
        localStorage.removeItem('nostr_user_pubkey');
        console.log("Logged out successfully.");
        location.reload(); 
    },

    /* Stores profile metadata in the local cache. */
    saveProfile(pubkey, profileData) {
        this.profileCache[pubkey] = profileData;
        localStorage.setItem('nostr_profiles', JSON.stringify(this.profileCache));
    },

    /* Retrieves a display name from cache or returns a shortened pubkey. */
    getDisplayName(pubkey) {
        return this.profileCache[pubkey]?.name || 
               this.profileCache[pubkey]?.display_name || 
               pubkey.substring(0, 8);
    },

    /* Simple check to verify if a user session is active. */
    isLoggedIn() {
        return !!this.userPubkey;
    }
};