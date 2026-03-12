import fetch from 'node-fetch';

const TRANSLATE_RETRIES = 2;
const TRANSLATE_RETRY_MS = 1500;

const LINGVA_BASE = 'https://lingva.ml/api/v1';

// --- LibreTranslate (commented out)
// const url = `${process.env.LIBRETRANSLATE_URL}/translate`;
// const body = JSON.stringify({ q: trimmed, source: 'en', target: targetLang, format: 'text' });
// const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
// const data = await response.json();
// return data.translatedText;

export async function translate(text, targetLang = 'hi') {
	const trimmed = typeof text === 'string' ? text.trim() : String(text || '').trim();
	if (!trimmed) return trimmed;

	const url = `${LINGVA_BASE}/en/${targetLang}/${encodeURIComponent(trimmed)}`;

	for (let attempt = 1; attempt <= TRANSLATE_RETRIES; attempt++) {
		try {
			const res = await fetch(url);
			const data = await res.json();
			if (data.translation != null) return data.translation;
			if (!res.ok && attempt < TRANSLATE_RETRIES) {
				await new Promise((r) => setTimeout(r, TRANSLATE_RETRY_MS));
				continue;
			}
		} catch (err) {
			if (attempt === TRANSLATE_RETRIES) {
				console.warn('Translation unavailable:', err.code || err.message);
			} else {
				await new Promise((r) => setTimeout(r, TRANSLATE_RETRY_MS));
			}
		}
	}
	return trimmed;
}
