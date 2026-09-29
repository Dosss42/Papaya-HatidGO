/**
 * Authored icon: a Philippine tricycle (motorcycle with a roofed sidecar), side view.
 * Drawn to match Ionicons' outline style (512 grid, 32px round strokes, currentColor), so it
 * sits beside the library icons without looking borrowed. Used for the DRIVER role.
 * The viewBox is cropped to the drawing (a tricycle is wide and short), so it matches person-outline in size.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 56 464 464">
<g fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round">
<path d="M64 336V176a32 32 0 0 1 32-32h160v192H64"/>
<path d="M112 200h96v64h-96z"/>
<path d="M256 288h96l40-96"/>
<path d="M368 176h56"/>
<path d="M392 192l40 192"/>
<circle cx="144" cy="384" r="48"/>
<circle cx="432" cy="384" r="48"/>
</g>
</svg>`;

// Raw (NOT percent-encoded): ionicons parses the text after ";utf8," as markup to find the <svg>,
// exactly like its own icon exports.
export const TRICYCLE_ICON = `data:image/svg+xml;utf8,${svg.replace(/\n/g, '')}`;
