import forms from "@tailwindcss/forms";
const config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}", "../editor/src/**/*.{ts,tsx}"],
    theme: {
        extend: {}
    },
    plugins: [forms]
};
export default config;
