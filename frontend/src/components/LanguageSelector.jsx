
import React from 'react';

export default function LanguageSelector({ value, onChange }) {
	const LANGUAGES = [
		{ code: 'es', name: 'Spanish' },
		{ code: 'fr', name: 'French' },
		{ code: 'de', name: 'German' },
		{ code: 'hi', name: 'Hindi' },
		{ code: 'ar', name: 'Arabic' },
		{ code: 'zh', name: 'Chinese' },
		{ code: 'ja', name: 'Japanese' },
		{ code: 'ko', name: 'Korean' },
		{ code: 'pt', name: 'Portuguese' }
	];
	return (
		<select value={value} onChange={onChange} className="bg-slate-800 text-white rounded px-3 py-1">
			{LANGUAGES.map(lang => (
				<option key={lang.code} value={lang.code}>{lang.name}</option>
			))}
		</select>
	);
}
