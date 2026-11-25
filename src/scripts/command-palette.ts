// Command palette (Cmd/Ctrl + K). Built as a standalone bundle and injected lazily by
// KeyboardManager.astro, so the hotkeypad library never sits on the critical request chain.
import HotKeyPad from "hotkeypad";
// The library's stylesheet ships inside this bundle. As its own <link rel="stylesheet"> it was fetched
// at Highest priority even when injected after load, which Lighthouse counts as a critical chain.
import paletteCss from "hotkeypad/index.css?inline";

interface Info {
	id: string;
	section: string;
	title: string;
	url: string;
	icon: string;
	hotkey: string;
}

const PRINT_ICON = `<svg style="margin-right: 8px" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
</svg>`;

function createCommandPalette(): HotKeyPad {
	// Applied before the library builds the palette, which starts hidden.
	const style = document.createElement("style");
	style.textContent = paletteCss;
	document.head.append(style);

	const hotkeypad = new HotKeyPad();
	const info = hotkeypad.instance.getAttribute("data-info") ?? "[]";
	const profiles = (JSON.parse(info) as Info[]).map(({ url, hotkey, icon, id, section, title }) => ({
		id,
		title,
		icon,
		hotkey,
		section,
		handler: () => {
			window.open(url, "_blank");
		},
	}));

	hotkeypad.setCommands([
		{
			id: "print",
			title: "Print Resume",
			icon: PRINT_ICON,
			hotkey: "ctrl+P",
			section: "Actions",
			handler: () => {
				window.print();
			},
		},
		...profiles,
	]);

	return hotkeypad;
}

const palette = createCommandPalette();
window.openCommandPalette = () => palette.open();
if (window.commandPaletteRequested) palette.open();
