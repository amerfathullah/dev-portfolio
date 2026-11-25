// Post-build HTML optimizations (production only; `astro dev` serves the page untouched).
//
// 1. Repeated inline SVGs → <symbol> + <use>. Icons such as the Collapsible chevron appear a dozen
//    times; the first copy defines a <symbol> in place and every copy (first included) draws it with
//    <use>. Defining it at the first occurrence means no forward references and nothing extra
//    before the LCP element. Presentation attributes (fill, stroke, …) stay on the outer <svg> and
//    inherit into the <use> shadow tree; <title> stays on the outer <svg> for its accessible name.
//
// 2. @media print rules → a separate <link media="print"> stylesheet. The page inlines all CSS so
//    nothing blocks first render, but print rules are never needed on screen; a print-only
//    stylesheet does not block rendering. Rules keep their enclosing @layer, and land later in the
//    cascade than before, so they only ever win more often in print (verified with print PDF diffs).

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SVG_RE = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/g;
const TITLE_RE = /^\s*(<title\b[^>]*>[\s\S]*?<\/title>)/;

export function dedupeSvgs(html) {
	const counts = new Map();
	for (const [svg] of html.matchAll(SVG_RE)) counts.set(svg, (counts.get(svg) ?? 0) + 1);

	const ids = new Map();
	return html.replace(SVG_RE, (svg, attrs, inner) => {
		if (counts.get(svg) < 2) return svg;
		const viewBox = attrs.match(/\bviewBox="([^"]*)"/)?.[1];
		if (!viewBox) return svg;

		// Keep the title outside the symbol so the outer <svg> still carries the accessible name
		const title = inner.match(TITLE_RE)?.[1] ?? "";
		const body = title ? inner.replace(TITLE_RE, "") : inner;

		let id = ids.get(svg);
		let symbol = "";
		if (!id) {
			id = `i${ids.size}`;
			ids.set(svg, id);
			symbol = `<symbol id="${id}" viewBox="${viewBox}">${body}</symbol>`;
		}
		return `<svg${attrs}>${title}${symbol}<use href="#${id}"/></svg>`;
	});
}

// Index just past the block that opens at the first "{" at or after `from`
function blockEnd(css, from) {
	let depth = 0;
	for (let i = css.indexOf("{", from); i < css.length; i++) {
		if (css[i] === "{") depth++;
		else if (css[i] === "}" && --depth === 0) return i + 1;
	}
	throw new Error("Unbalanced CSS");
}

// Pull every @media print block out of `css`, keeping its enclosing at-rules (@layer, @supports…).
// Returns [remaining css, extracted css].
export function extractPrint(css) {
	let rest = "";
	let print = "";
	let i = 0;
	while (i < css.length) {
		const open = css.indexOf("{", i);
		const close = css.indexOf("}", i);
		if (open === -1 || (close !== -1 && close < open)) {
			rest += css.slice(i);
			break;
		}
		const prelude = css.slice(i, open);
		const end = blockEnd(css, open);
		// A statement such as "@layer theme, base;" can precede the rule in the same prelude
		const statements = prelude.slice(0, prelude.lastIndexOf(";") + 1);
		const header = prelude.slice(statements.length).trim();
		if (/^@media\s+print$/.test(header)) {
			rest += statements;
			print += css.slice(i + statements.length, end).trim();
		} else if (/^@(layer|supports|media)\b/.test(header)) {
			const [inner, innerPrint] = extractPrint(css.slice(open + 1, end - 1));
			rest += `${prelude}{${inner}}`;
			if (innerPrint) print += `${header}{${innerPrint}}`;
		} else {
			rest += css.slice(i, end);
		}
		i = end;
	}
	return [rest, print];
}

export default function optimizeHtml() {
	return {
		name: "optimize-html",
		hooks: {
			"astro:build:done": async ({ dir, logger }) => {
				const root = fileURLToPath(dir);
				const pages = (await readdir(root, { recursive: true })).filter((f) => f.endsWith(".html"));
				for (const page of pages) {
					const path = join(root, page);
					const before = await readFile(path, "utf8");
					let html = dedupeSvgs(before);

					let print = "";
					html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_, open, css, close) => {
						const [rest, extracted] = extractPrint(css);
						print += extracted;
						return `${open}${rest}${close}`;
					});
					if (print) {
						const hash = createHash("sha256").update(print).digest("hex").slice(0, 10);
						const href = `/_astro/print.${hash}.css`;
						await mkdir(join(root, "_astro"), { recursive: true });
						await writeFile(join(root, href), print);
						html = html.replace("</head>", `<link rel="stylesheet" href="${href}" media="print"></head>`);
					}

					await writeFile(path, html);
					logger.info(`${page}: ${before.length} → ${html.length} bytes (print CSS ${print.length} bytes moved out)`);
				}
			},
		},
	};
}
