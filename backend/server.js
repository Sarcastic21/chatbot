import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - ONLY ONCE
app.use(cors({
  origin: [
    "https://nextadhikarichatassistant.netlify.app",
    "http://localhost:3000", // For local development
    "http://127.0.0.1:3000"  // Alternative localhost
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const conversationHistory = new Map();

function generateStructuredPrompt(question) {
  return `
You are an expert government exam preparation assistant for Indian competitive exams (UPSC, SSC, Banking, State PSCs, Railways, Defense).

For the question: "${question}"

Provide a structured response in the following EXACT JSON format:

{
  "introduction": "Brief 2-3 line introduction about the topic and its significance",
  "explanation": "Detailed explanation covering key concepts, provisions, historical context, current relevance",
  "examples": "Relevant examples, case studies, or practical applications",
  "numericalSolution": "If the question involves numerical problems, provide step-by-step solution here, otherwise leave empty",
  "previousYearQuestions": [
    {
      "exam": "Exam Name (e.g., UPSC Civil Services)",
      "year": "Year",
      "question": "Exact question asked"
    }
  ],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "relatedQuestions": ["Question 1", "Question 2", "Question 3"]
}

IMPORTANT GUIDELINES:
- Keep all content exam-focused and accurate
- Include constitutional articles, amendments, dates where relevant
- For previousYearQuestions, provide REAL questions from actual exams if known
- If no specific PYQs are available, mention "This topic is frequently asked in [Exam Names]"
- Make explanations clear and conceptual
- Focus on frequently asked aspects in competitive exams
- Ensure JSON format is strictly maintained
- For numerical questions, show complete step-by-step solutions
  `;
}

function extractJSONFromText(text) {
  try {
    // Try to find JSON in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // If no JSON found, create a structured response from text
    return {
      introduction: "Introduction to the topic...",
      explanation: text,
      examples: "Relevant examples and case studies...",
      numericalSolution: "",
      previousYearQuestions: [],
      relatedTopics: [],
      relatedQuestions: []
    };
  } catch (error) {
    console.error('JSON parsing error:', error);
    // Fallback structure
    return {
      introduction: text.split('.')[0] + '.',
      explanation: text,
      examples: "",
      numericalSolution: "",
      previousYearQuestions: [],
      relatedTopics: [],
      relatedQuestions: []
    };
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    const history = conversationHistory.get(sessionId);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
    });

    const context = history.map(entry => 
      `User: ${entry.question}\nAssistant: ${JSON.stringify(entry.answer)}`
    ).join('\n\n');

    const structuredPrompt = generateStructuredPrompt(message);

    const fullPrompt = `
      ${context ? `Previous conversation:\n${context}\n\n` : ''}
      ${structuredPrompt}
      
      Current question: ${message}
      
      Provide response in the exact JSON format specified above.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const answerText = response.text();

    // Parse the structured response
    const structuredResponse = extractJSONFromText(answerText);

    // Generate additional related questions
    const relatedQuestionsPrompt = `
      Based on the topic: "${message}"
      Generate 3 related exam questions in this format:
      RELATED_QUESTIONS:
      1. [Question 1]
      2. [Question 2] 
      3. [Question 3]
    `;

    const relatedResult = await model.generateContent(relatedQuestionsPrompt);
    const relatedResponse = await relatedResult.response;
    const relatedText = relatedResponse.text();

    let additionalRelatedQuestions = [];
    const lines = relatedText.split('\n');
    for (const line of lines) {
      if (line.match(/^\d+\.\s/)) {
        const question = line.replace(/^\d+\.\s/, '').trim();
        if (question) {
          additionalRelatedQuestions.push(question);
        }
      }
    }

    // Merge with existing related questions
    if (structuredResponse.relatedQuestions && structuredResponse.relatedQuestions.length === 0) {
      structuredResponse.relatedQuestions = additionalRelatedQuestions.slice(0, 3);
    }

    history.push({
      question: message,
      answer: structuredResponse,
      timestamp: new Date().toISOString()
    });

    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    res.json({
      answer: structuredResponse,
      relatedQuestions: structuredResponse.relatedQuestions || additionalRelatedQuestions.slice(0, 3),
      sessionId,
      model: "gemini-2.5-pro"
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message,
      suggestion: 'Please try again with a different question.'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Govt Exam Assistant API is running',
    model: 'Gemini 2.5 Pro',
    features: 'Structured JSON responses for exam preparation'
  });
});

// Handle preflight requests
app.options('*', cors());

setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [sessionId, history] of conversationHistory.entries()) {
    if (history.length > 0) {
      const lastMessageTime = new Date(history[history.length - 1].timestamp).getTime();
      if (now - lastMessageTime > oneHour) {
        conversationHistory.delete(sessionId);
      }
    }
  }
}, 30 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Using Gemini 2.5 Pro API`);
  console.log(`📚 Govt Exam Assistant Backend Ready!`);
  console.log(`🎯 Structured JSON response format enabled`);
  console.log(`🌐 CORS enabled for: https://nextadhikarichatassistant.netlify.app`);
});
