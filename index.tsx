/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// drop filter 2.1
import definePlugin from "@utils/types";
import { FluxDispatcher, UserStore } from "@webpack/common";

import { changeUrl, clearCache, pendingMessageUpdateResolvers } from "./cache";
import { getSessionId } from "./dInters";
import { filterKarutaMessage } from "./myUtils";
import { handleSettings, settings } from "./settings";


// Sometimes vencord internally reloads the plugin (IDK)
let isActive: Boolean = false;
export default definePlugin({
    name: "ADropFilter2.1",
    description: "Shows clickable in-app overlays for filtered messages 2.1",
    authors: [{ name: "you", id: 1n }],
    settings,
    listener: null as ((event: any) => void) | null,
    updateListener: null as ((event: any) => void) | null,

    // Runs once on plugin start
    start() {
        this.stop(); // Runs stop first incase internal vencord plugin reload occurs without proper stop() called.
        isActive = true; // First make isActive true;
        console.log("=================DropFilter loaded (overlay mode)=================");
        handleSettings;
        console.log(`Watch Mode initially loaded: Mode: ${settings.store.watchMode}, WW: ${settings.store.wishlistWatch}, WWM: ${settings.store.actionMode}`);
        const myId = UserStore.getCurrentUser()?.id;
        console.log("MY ID: ", myId);
        console.log(typeof (myId));
        console.log("Initial socketStore loaded, Session ID: ", getSessionId());
        changeUrl("/channels/806764640464928789/852922350147731486/");
        console.log("==================================================================");

        // AFTER things loaded, main runs from here
        this.listener = (event: any) => {
            if (!isActive) return; // Neutralize i.e. stop() occured but unsubscribe failed, since it's referenced here it doesn't die.
            const message = event?.message;
            if (!message) return;

            // temp mudae reactor
            // if (message?.author?.id === "432610292342587392") {
            //     console.log("Initiating tempMudaeFunc");
            //     tempMudaeFunc(message);
            //     return;
            // }
            // else setTimeout(() => {
            //     sendMessage(message.channel_id, "$im sakura igawa");
            // }, 10000);

            // Run Filters for Karuta first - returns false only if message not by Karuta
            if (filterKarutaMessage(message, myId)) return;
            // If you want to destructure message
            else if (message.author?.id === myId && message.content === "sup") { changeUrl(`/channels/${message.guild_id}/${message.channel_id}`); console.log("My own: "); console.log(message); }

            // sent by user vvv
            // if (filterUserKeventMessage(message, myId)) return;
            // if (flags) alertHandler(message, flags)
            // else filterKeventMessage(message, myId)
        };

        // Runs everytime a message is updated
        // Only does the job of resolving if update msg id === id in pendingResolvers and calls the associated resolved function with the message passed as argument (so that the resolver can retur it)
        this.updateListener = (event: any) => {
            const upMessage = event?.message;
            if (!upMessage) return;
            const resolver = pendingMessageUpdateResolvers?.get(upMessage.id);
            if (!resolver) return;
            resolver(upMessage); // This is the function that ultimately calls resolve from the promise, this also takes the full updated msg
            // console.log("Message Updated: ", event?.message);
        };

        // Every time MESSAGE_CREATE occurs, this.listener is called internally like this.listener(event : message)

        // Safe: unsubscribe first, then subscribe
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.listener);
        FluxDispatcher.unsubscribe("MESSAGE_UPDATE", this.updateListener);

        FluxDispatcher.subscribe("MESSAGE_CREATE", this.listener);
        FluxDispatcher.subscribe("MESSAGE_UPDATE", this.updateListener);
    },

    stop() {
        // Kill switch FIRST (neutralizes even if unsubscribe fails)
        isActive = false;

        try {
            if (this.listener) {
                FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.listener);
                this.listener = null;
            }
            if (this.updateListener) {
                FluxDispatcher.unsubscribe("MESSAGE_UPDATE", this.updateListener);
                this.updateListener = null;
            }
        }
        catch (err) {
            console.error("Error while unsubscribing: ", err);
        }
        // Resets the watch array
        try {
            clearCache();
        }
        catch (err) {
            console.error("Error while clearing cache: ", err);
        }

        console.log("DropFilter stopped.");
    }
});
