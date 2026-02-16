/**
 * Gemini AI Integration
 * Handles Dynamic Theming and Smart Commentary
 */

class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    }

    async generateTheme(score, style = "cyberpunk") {
        const themes = [
            { name: "Oceanic", bg: 0x001133, grid: 0x00ffff, fog: 0x001133, obstacle: 0x0088ff },
            { name: "Martian", bg: 0x220500, grid: 0xff4400, fog: 0x220500, obstacle: 0xffcc00 },
            { name: "Matrix", bg: 0x001100, grid: 0x00ff00, fog: 0x001100, obstacle: 0x003300 },
            { name: "Vaporwave", bg: 0x220022, grid: 0xff00ff, fog: 0x220022, obstacle: 0x00ffff }
        ];

        if (!this.apiKey) {
            console.log("Demo Mode: Switching Theme...");
            return themes[Math.floor(Math.random() * themes.length)];
        }

        const prompt = {
            contents: [{
                parts: [{
                    text: `Context: A futuristic endless runner game. Payer Score: ${score}.
                    Task: Generate a JSON object for a color theme based on score/intensity.
                    Strict JSON Format: { "bg": "#hex", "grid": "#hex", "fog": "#hex" }`
                }]
            }]
        };

        try {
            console.log("Gemini API Call...");
            const response = await fetch(this.endpoint + '?key=' + this.apiKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prompt)
            });
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            // Extract JSON from potential markdown code block
            const jsonStr = text.replace(/```json|```/g, '').trim();
            const theme = JSON.parse(jsonStr);

            // Convert Hex Strings to Ints
            return {
                bg: parseInt(theme.bg.replace('#', '0x'), 16),
                grid: parseInt(theme.grid.replace('#', '0x'), 16),
                fog: parseInt(theme.fog.replace('#', '0x'), 16)
            };
        } catch (e) {
            console.error("Gemini API Error (Fallback to Demo):", e);
            return themes[Math.floor(Math.random() * themes.length)];
        }
    }

    async getCommentary(situation) {
        if (!this.apiKey) return null;
        console.log("Mock - Fetching Commentary...");
        return "Not bad for a rookie!"; // Stub
    }
}

// Export global for vanilla JS
window.GeminiService = GeminiService;
