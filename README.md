# Interviewer AI

Interviewer AI is a web application designed to help users prepare for job interviews by analyzing their responses to practice questions. Powered by the Gemini API, it provides detailed feedback on interview answers, including ratings, repetitive word usage, and suggestions for improvement. The application generates a comprehensive report and allows users to download their results as a PDF.

## Features

- **Question Analysis**: Evaluates clarity, relevance, and depth of answers with a 1-5 rating.
- **Repetitive Word Detection**: Identifies overused words (e.g., "um," "like") and their frequencies.
- **Improvement Suggestions**: Offers concise recommendations to enhance answer structure and content.
- **Summary Report**: Provides an overall summary of interview performance.
- **PDF Export**: Allows users to download a detailed report of their results.
- **Responsive UI**: Built with React and Tailwind CSS for a modern, user-friendly experience.
- **Local Storage**: Caches results to prevent redundant API calls.

## Prerequisites

Before setting up the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- A [Gemini API key](https://ai.google.dev/) for analyzing interview responses

## Installation

Follow these steps to set up and run Interviewer AI locally:

1. **Clone the Repository**  
   Clone the project to your local machine using:
   ```bash
   git clone https://github.com/your-username/interviewer-ai.git
   cd interviewer-ai
   ```

2. **Install Dependencies**  
   Install the required Node.js packages using npm or Yarn:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

3. **Configure Environment Variables**  
   Create a `.env.local` file in the project root and add your Gemini API key:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   Replace `your_gemini_api_key_here` with your actual Gemini API key.

4. **Install Additional Dependencies**  
   The project uses specific libraries. Ensure they are installed:
   ```bash
   npm install react lucide-react jspdf next tailwindcss
   ```
   or
   ```bash
   yarn add react lucide-react jspdf next tailwindcss
   ```

5. **Configure Tailwind CSS**  
   If not already set up, initialize Tailwind CSS by running:
   ```bash
   npx tailwindcss init -p
   ```
   Update `tailwind.config.js` to include your content paths:
   ```js
   module.exports = {
     content: [
       "./pages/**/*.{js,ts,jsx,tsx}",
       "./components/**/*.{js,ts,jsx,tsx}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   };
   ```
   Ensure `styles/globals.css` includes Tailwind directives:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

## Running the Project Locally

1. **Start the Development Server**  
   Run the Next.js development server:
   ```bash
   npm run dev
   ```
   or
   ```bash
   yarn dev
   ```
   The application will be available at `http://localhost:3000`.

2. **Access the Application**  
   Open your browser and navigate to `http://localhost:3000` to use Interviewer AI.

3. **Interact with the Application**  
   - Enter interview questions and answers via the setup form.
   - View analysis results, including ratings, repetitive words, and improvement suggestions.
   - Download a PDF report of your results.
   - Use the "Retry Analysis" or "Back to Setup" buttons to refine your practice.

## Usage Notes

- **API Key Security**: Never commit your `.env.local` file to version control. Add it to `.gitignore`.
- **Gemini API Limits**: Be aware of the Gemini API's rate limits and usage quotas to avoid request failures.
- **Local Storage**: Results are cached in the browser's `localStorage` under the key `interviewResults`.
- **Error Handling**: The app displays errors if the API fails or responses are malformed. Check the console for detailed logs.

## Troubleshooting

- **API Errors**: Ensure your Gemini API key is valid and has sufficient quota. Verify the key in `.env.local`.
- **Dependency Issues**: Run `npm install` or `yarn install` again if you encounter module errors.
- **Styling Issues**: Confirm Tailwind CSS is correctly configured in `tailwind.config.js` and `globals.css`.
- **Port Conflicts**: If `localhost:3000` is in use, Next.js will prompt you to use another port (e.g., `localhost:3001`).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or support, please contact [kaushalkrishna011@gmail.com](mailto:kaushalkrishna011@gmail.com) or open an issue on the [GitHub repository](https://github.com/kaushalkrishnax/interviewer-ai).

---

Built with ❤️ by [Kaushal Krishna](https://github.com/kaushalkrishnax)