module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
    root: true,
    env: {
        node: true,
    },
    ignorePatterns: ['.eslintrc.js', 'node_modules/'],
    rules: {
        // Off because it's a dumb rule.
        '@typescript-eslint/interface-name-prefix': 'off',
        // Need this off since we use it until I have a better idea what the types should be.
        '@typescript-eslint/no-explicit-any': 'off',
        // Need this off since we place @ts-ignore in places.
        '@typescript-eslint/ban-ts-comment': 'off',
        // Need this off since we force using ! everywhere.
        '@typescript-eslint/no-non-null-assertion': 'off',
        // Prettier too dumb to understand that auto-crlf exists in git
        'prettier/prettier': [
            'error',
            {
                'endOfLine': 'auto',
            },
        ]
    },
};
