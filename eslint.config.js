import js from '@eslint/js'
import globals from 'globals'

export default [
	{
		...js.configs.recommended,
		files: ['index.js', 'ketch.js'],
		languageOptions: {
			globals: globals.browser,
		},
	},
]
