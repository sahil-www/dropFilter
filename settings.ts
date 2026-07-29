/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { handleActionMode, handleWatchMode } from "./cache";


export function handleSettings() {
    handleWatchMode(settings.store.watchMode, settings.store.wishlistWatch, settings.store.wishlistWatchMode);
    handleActionMode(settings.store.actionMode);
}

// function onAmChange() {
//     handleActionMode(settings.store.actionMode);
// }

export const settings = definePluginSettings({
    // presets {} - my own + user can define and store. Regardless. This interacts with every value here.
    // I will ONLY implement it if I have nothing better to do.

    watchMode: {
        type: OptionType.SELECT,
        description: "Select Watch Mode from given presets",
        default: 0,
        options: [
            { label: "Event Only", value: 2 },
            { label: "Server Drops and Event", value: 1 },
            // { label: "User Drops + SD + E", value:  },
            { label: "Priority, All", value: 0 },
        ],

        onChange: (): void => handleSettings()
    },

    actionMode: {
        type: OptionType.SLIDER,
        description: "Select action mode: 1: Passive, 2: Active, 3: Notification (Future Update), 4: Auto (Future Update)",
        default: 1,
        min: 1,
        max: 4,
        markers: [1, 2, 3, 4],
        stickToMarkers: true,

        // onChange: onAmChange,
    },

    unobtainedEggs: {
        type: OptionType.CUSTOM,
        default: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    },

    wishlistWatch: {
        type: OptionType.BOOLEAN,
        description: "Toggle whether you want to be notified for wishlist",
        default: true,
        onChange: (): void => handleSettings()
    },

    wishlistWatchMode: {
        type: OptionType.SLIDER,
        description: "Select which wishes you want to be notified for: 1: All wl, 2: Moderate wl+, 3: Heavy wl only",
        default: 1,
        min: 1,
        max: 3,
        markers: [1, 2, 3],
        stickToMarkers: true,

        // Stays disabled if wishlistWatch = false
        disabled: () => !settings.store.wishlistWatch,
        onChange: (): void => handleSettings()
    }
});
