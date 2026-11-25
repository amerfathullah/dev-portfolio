/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Handshake between the inline command-palette loader and the lazily stamped palette script
interface Window {
	openCommandPalette?: () => void;
	commandPaletteRequested?: boolean;
}
