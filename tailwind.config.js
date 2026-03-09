/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                arcade: {
                    purple: "#BC13FE",
                    dark: "#1A1A2E",
                    gold: "#FFD700",
                    accent: "#8A2BE2",
                }
            },
        },
    },
    plugins: [],
}
