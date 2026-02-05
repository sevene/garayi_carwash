import type { Config } from "tailwindcss";
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
    content: [
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                lime: {
                    DEFAULT: '#f0ff00',
                },
            },
            fontFamily: {
                // Map the Cascadia Code variable to the 'mono' utility.
                mono: ['var(--font-cascadia)', ...defaultTheme.fontFamily.mono],

                // Custom Sans
                sans: ['"UI Sans"', 'var(--font-lato)', ...defaultTheme.fontFamily.sans],
            },
        },
    },
    plugins: [],
};

export default config;
