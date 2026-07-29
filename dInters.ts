/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Discord interactions file: Everything related to discord interactions:
// Slash commands and emoji reactions will be here in the future
// If I find a better clickButton logic it will be here
import { findByPropsLazy } from "@webpack";
import { RestAPI } from "@webpack/common";

// These are NOT runtime data - They are “lookups into Discord’s memory”
// Set using setSocket(socket)
const SocketStore = findByPropsLazy("getSocket");
const MessageActions = findByPropsLazy("sendMessage", "editMessage");

// Not loading in lazy loader as it might change every restart -- Will comfirm later;
// Loads value of SocketStore (an obj that has a method getSocket())
// Don't run befoere plugin start/socket loaded
// export function setSocket(): void {
//     SocketStore = findByProps("getSocket");
//     if (!SocketStore) throw new Error("Socket empty!");
// }

// By the time this runs. Socket should have already been retrieved. If an error inside setSocket occurs,
// Updated: It retrieves SocketStore in first call and caches it: I don't have to call setSocket() manually in start();
// I.e. I can call getSessionId() reliably without worrying about whether it runs before it retrieves these modules from discord. (During complilation)
export function getSessionId(): string {
    if (!SocketStore) throw new Error("MINE: Could not retrieve SocketStore!");
    const sessionId = SocketStore.getSocket()?.sessionId;
    if ((typeof sessionId) === "string") return sessionId;
    else throw new Error("MINE: Could not retrieve sessionId!");


    // return (
    // Fallback chain — tries multiple sources
    //     // SocketStore?.getSocket()?.sessionId ??
    //     // findByProps("getMediaSessionId")?.getSocket?.()?.sessionId ??
    //     // ""
    // );
}

export async function clickButton(message: any, button: any) {
    try {
        const sessionId: string = getSessionId(); // Throws error if sesssionId isn't retrieved.
        const nonce = String(BigInt(Date.now() - 1420070400000) << 22n);
        await RestAPI.post({
            url: "/interactions",
            body: {
                type: 3,
                nonce,
                guild_id: message.guild_id,
                channel_id: message.channel_id,
                message_id: message.id,
                message_flags: message.flags ?? 0,
                application_id: message.application_id ?? message.author.id,
                session_id: sessionId,
                data: {
                    component_type: 2,
                    custom_id: button.custom_id,
                }
            }
        });
        console.log("Within clickButton: interaction sent.");
    }
    catch (err: any) {
        console.error("Error inside clickButton: ", err.message);
    }
}

// Lazy loading MessageActions (Doesn't trigger till first use)
export async function sendMessage(channelId: string, content: string) {
    try {
        await MessageActions.sendMessage(channelId, { content }, true, {});
        console.log("Message Sent.");
    }
    catch (err) {
        console.log("Error while sending message: ", err);
    }
}
