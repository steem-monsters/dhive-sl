module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint/eslint-plugin', 'sort-imports-es6-autofix'],
    extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
    root: true,
    env: {
        node: true,
        browser: true
    },
    ignorePatterns: ['.eslintrc.js', 'node_modules/', 'data/generated'],
    rules: {
        "sort-imports-es6-autofix/sort-imports-es6": [2, {
            "ignoreCase": false,
            "ignoreMemberSort": false,
            "memberSyntaxSortOrder": ["none", "all", "single", "multiple"]
        }],
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
        ],
        "no-empty-function": "off",
        "@typescript-eslint/no-empty-function": "off",
    },
};
