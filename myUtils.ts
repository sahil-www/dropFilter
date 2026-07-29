/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Try not to write here anything that imports webpacks / vencord stuff. It's my personal logics.
// This is for basic conversion functions like to int and type shit
// This will import dInters, not index.tsx


import { _watchArray, notifQueue, waitForMessageUpdate } from "./cache";
import { clickButton } from "./dInters";
import { settings } from "./settings";

function toInt(value: any): number | null {
    const num = Number(value);

    if (!Number.isFinite(num)) return null;

    // convert to integer (you can choose behavior)
    return Math.trunc(num); // or Math.floor / Math.round
}

// (window as any).TEMPUnobtainedEggsControl = {
//     get: (): number[] => settings.store.unobtainedEggs,

//     set: (arr: any[]) => {
//         settings.store.unobtainedEggs = arr
//             .map(toInt)
//             .filter((v): v is number => v !== null);
//     },

//     // push: (v: any) => {
//     //     const num = toInt(v);
//     //     if (num !== null) settings.store.unobtainedEggs.push(num);
//     // },

//     // pushMany: (arr: any[]) => {
//     //     arr.forEach(v => {
//     //         const num = toInt(v);
//     //         if (num !== null) TEMPVAR1.push(num);
//     //     });
//     // },

//     remove: (v: any) => {
//         const num = toInt(v);
//         if (num === null) throw new Error("Invalid number");

//         const index = settings.store.unobtainedEggs.indexOf(num);
//         if (index === -1) throw new Error("Value not found in array");

//         settings.store.unobtainedEggs.splice(index, 1);
//     },

//     clear: () => {
//         settings.store.unobtainedEggs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
//     }
// };

// Used in createToast to display it on the message
function flagsToString(flags: Record<string, boolean>): string {
    return Object.keys(flags)
        .filter(key => flags[key])
        .join(", ");
}

// Used to parse EggBasket
export function parseEggBasket(str: string): number[] {
    const result: number[] = [];

    const regex = /stEgg(\d+)b/g;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(str)) !== null) {
        result.push(Number(match[1]));
    }

    return result;
}

// Actual alerts generation
// Although alerts are handled in alertHandler, this function still calls flagsToString in order to display or truthy flags on the notification
function createToast(message: Message, flags: Record<string, boolean>, onClick: () => void) {
    const toast = document.createElement("div");
    const str = flagsToString(flags);

    // decide zone + duration
    let bottomOffset = 20;
    let duration = 8000;

    if (flags.personalEggFlag === true) {
        bottomOffset = 20;
        duration = 14000;
    }
    else if (flags.userDropFlag === true) {
        bottomOffset = 140;
        duration = 8000;
    }
    else if (flags.serverDropFlag === true) {
        bottomOffset = 260;
        duration = 8000;
    }
    else if (flags.wishlistFlag === true) {
        bottomOffset = 380;
        duration = 8000;
    }
    else if (flags.heavyWishlistFlag === true) {
        bottomOffset = 500;
        duration = 8000;
    }

    // Main container
    toast.style.position = "fixed";
    toast.style.bottom = `${bottomOffset}px`;
    toast.style.right = "20px";
    toast.style.zIndex = "999999";
    toast.style.background = "#2b2d31";
    toast.style.border = "1px solid #444";
    toast.style.padding = "12px 14px";
    toast.style.borderRadius = "10px";
    toast.style.color = "white";
    toast.style.cursor = "pointer";
    toast.style.maxWidth = "320px";
    toast.style.fontSize = "13px";
    toast.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";

    const title = document.createElement("div");
    title.innerText = `🚨 Drop Detected\n${str}`;
    title.style.fontWeight = "bold";
    title.style.marginBottom = "6px";

    const body = document.createElement("div");
    body.innerText = message.content || "Click to open message";

    const hint = document.createElement("div");
    hint.innerText = "Click to jump";
    hint.style.marginTop = "6px";
    hint.style.fontSize = "11px";
    hint.style.opacity = "0.7";

    toast.appendChild(title);
    toast.appendChild(body);
    toast.appendChild(hint);

    toast.onclick = () => {
        onClick();
        toast.remove();
    };

    document.body.appendChild(toast);

    // auto remove
    setTimeout(() => toast.remove(), duration);
}

// How alerts are handled
// flags = {}
function alertHandler(message: Message, flags: Record<string, boolean>) {
    if (_watchArray.some(key => flags[key])) {
        if (settings.store.actionMode === 1) {

            const url = `/channels/${message.guild_id}/${message.channel_id}/${message.id}`;

            // Creating the notification part
            createToast(message, flags, () => {
                // SPA-safe navigation (NO reload)
                history.pushState(null, "", url);
                window.dispatchEvent(new PopStateEvent("popstate"));
            });
            console.log("FIRED!");
        }
        else if (settings.store.actionMode === 2) {
            let priority: number = 0;
            let validity: number = 0;
            let duration: number = 0;
            const now: number = Date.now();
            if (flags.personalEggFlag) { priority += 5; validity = 8000 + now; duration = 4000; }
            if (flags.serverDropFlag && _watchArray.includes("serverDropFlag")) { priority += 3; validity = 8000 + now; duration = 5000; }
            if (flags.userDropFlag && _watchArray.includes("userDropFlag")) { priority += 1; validity = 8000 + now; duration = 5000; }
            if (flags.wishlistFlag && _watchArray.includes("wishlistFlag")) { priority += 0; validity = 10000 + now; duration = 10000; }
            const url = `/channels/${message.guild_id}/${message.channel_id}/${message.id}`;
            notifQueue?.push({
                value: url,
                priority: priority,
                duration: duration,
                validity: Date.now() + validity,
            });
            let str = "";
            for (const key in flags) {
                if (flags[key] === true)
                    str += `${key}, `;
            }

            console.log(message);
            console.log("======", str, "======");
        }
        else if (settings.store.actionMode === 3) {
            console.log("Action Mode 3 triggered: Desktop Notification");
        }
    }

}

// Filter Karuta Message Speicifically - can either return an obj or boolean - if operation is not valid - spam msg
export function filterKarutaMessage(message: any, myId: string): boolean {
    if (message.author?.id !== "646937666251915264") return false;
    const content = message.content || "";

    // maybe remove it
    if (/must wait/.test(content)) return true; // must wait before dropping -> no action
    // All message we are concerned with will contain this word, if not - return
    if (!/dropping/.test(content)) {
        if (message.referenced_message?.author?.id === myId && message.embeds?.[0]?.title === "Hamako's Springtide Shack") {
            // parse
            settings.store.unobtainedEggs = parseEggBasket(message.embeds[0].fields[0].value);
            console.log(settings.store.unobtainedEggs);
        } // return true because msg by karuta but still no further action needed
        // If doesn't contain the dropping keyword... then need to return regardless
        return true;
    }
    // Init vars if the message is what we want - ordered acc. to rarity
    const flags: Record<string, boolean> = {
        userDropFlag: false,
        serverDropFlag: false,
        eggFlag: false,
        personalEggFlag: false,
        reactionDropFlag: false,
        wishlistFlag: false,
        moderateWishlistFlag: false, // To be used later
        heavyWishlistFlag: false,
    };

    if (/dropping \d+ cards/.test(content)) {
        if (/I'm/.test(content)) flags.serverDropFlag = true;
        else flags.userDropFlag = true;

        // Is a drop, lets check buttons
        // Egg Check
        const buttonArray = message.components?.[0]?.components;// This will give me an array of objects/buttons
        const ButtonsLength = buttonArray?.length;
        if (ButtonsLength > 3) {
            // accessing last element
            const eggNo = Number(buttonArray[ButtonsLength - 1].emoji?.name?.match(/stEgg(\d+)a/)?.[1]);
            if (settings.store.unobtainedEggs.includes(eggNo)) flags.personalEggFlag = true;
            else if (eggNo > 0 && eggNo < 21) flags.eggFlag = true;
            // console.log("EGGNO: ", eggNo, "\nunobtainedEggs: ", settings.store.unobtainedEggs);
        }
        else if (!(ButtonsLength > 2)) flags.reactionDropFlag = true;
    }

    else if (/your wishlist/.test(content)) flags.wishlistFlag = true;
    // Later I need to add something moderateWishlistFlag to track mentions at least 10 to 15... later even server based, and ignore server ID stuff
    else flags.heavyWishlistFlag = true;

    alertHandler(message, flags);
    // message was from karuta so return true
    return true;
}

// WORKS - I can await updated msg and have it over here.
async function tempMudaeFunc(message: Message) {
    // (async () => {
    //     await doSomethingAsync();
    // })();
    // setTimeout(async () => {
    //     try {
    //         const button = message.components?.[0]?.components?.[1];
    //         console.log("Message object: ", button);
    //         await clickButton(message, button);
    //     } catch (err) {
    //         console.error("Async error:", err);
    //     }
    // }, 2000);

    console.log("Message by Mudae: ", message);
    await setTimeout(() => {
        const button = message.components?.[0]?.components?.[1];
        clickButton(message, button);
        console.log("Button clicked.");
    }, 1500);

    console.log("Message wait initiated.");
    const updatedMsg = await waitForMessageUpdate(message.id, 6000);
    try {
        // const updatedButton = updatedMsg.components?.[0].components[1];
        // await clickButton(updatedMsg, updatedButton);
        console.log("Updated Message: ", updatedMsg);
        const button = updatedMsg.components?.[0]?.components?.[1];
        await clickButton(updatedMsg, button); // Not awaited.
        console.log("==================UpdatedMsg block executed fully=============");
    }
    catch (err) {
        console.log("updatedMsg error: ", err);
    }

    console.log("============Outside the updatedMsg block================");
}


// This will only be useful once I (if I) implement my own event listeners.... i.e.
// This will create a listener in Promise obj with channl id refernce,
// Once that happens, since we are already checking for every message whether it's channel ID is in the listened messages,
// We would not add extra workload, but new features that work like this
// I.e. user types a message: creates an entry in pendingPromise Object with channel ID as key and resolver function if condition passes.
// ON MESSAGE CREATE runs that function for every message within the given channel ID until the associated promise is actually resolved.

// Temporary... I'm planning to do hamako springtide content and reference thing instead
// Filter your kevent // I am planning to add an event listener in the same channel when this message is typed. which expires after 10 seconds and tracks karuta messages that have the message.reference.authorid == myid match
// function filterUserKeventMessage(message: any, userID: string): boolean {
//     if (message.author?.id !== userID) return false;

//     if (message.content?.toLowerCase().startsWith("kevent")) {
//         console.log(message); return true;
//     }

//     else if (message.content?.startsWith("st!settings")) console.log(settings);
//     return false;
// }
