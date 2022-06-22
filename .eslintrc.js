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
        // Off - No IInterface instead of Interface
        '@typescript-eslint/interface-name-prefix': 'off',
        // Off
        '@typescript-eslint/no-explicit-any': 'off',
        // Need this off since we place @ts-ignore in places.
        '@typescript-eslint/ban-ts-comment': 'off',
        // auto-crlf exists in git
        'prettier/prettier': [
            'error',
            {
                'endOfLine': 'auto',
            },
        ]
    },
};
