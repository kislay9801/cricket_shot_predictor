export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",       // primary text (slate-900)
        canvas: "#f4f7fa",    // page background
        panel: "#ffffff",     // card / surface
        line: "#e6ebf1",      // borders
        pitch: "#0f9d63",     // primary green
        pitchdark: "#0b7a4d", // green hover
        gold: "#d97706",      // amber accent
        coral: "#e11d48"      // error / rose
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,0.04), 0 10px 30px -16px rgba(16,24,40,0.18)",
        glow: "0 18px 50px -22px rgba(15,157,99,0.45)"
      }
    }
  },
  plugins: []
};
