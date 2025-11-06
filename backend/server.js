import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Validate that Gemini API key is available
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in environment variables');
  console.error('Please set your Gemini API key in the .env file');
  process.exit(1);
}

// CORS configuration for your Netlify frontend
app.use(cors({
  origin: [
    'https://nextadhikarichatassistant.netlify.app',
    'http://localhost:3000', // Keep for local development
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Gemini AI with environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store conversation history
const conversationHistory = new Map();

// Function to generate related questions
function generateRelatedQuestionsPrompt(mainQuestion) {
  return `
    Main Question: ${mainQuestion}
    
    Based on this question, generate 3 related questions that might be asked in government exams like UPSC, SSC, State PSCs, Banking, Railways, etc.
    
    Format the response as:
    RELATED_QUESTIONS:
    1. [First related question]
    2. [Second related question] 
    3. [Third related question]
    
    Make sure the questions are relevant to government exam patterns and cover different aspects of the topic.
    Focus on creating questions that would actually appear in competitive exams.
  `;
}

// Enhanced prompt for better government exam responses
function createMainPrompt(question, context = '') {
  return `
You are "Next Adhikari" - an expert AI assistant specialized in government exam preparation in India. Your role is to provide comprehensive, accurate, and exam-focused guidance.

IMPORTANT GUIDELINES:
1. Provide structured, well-organized answers suitable for competitive exams
2. Include relevant facts, dates, constitutional articles, and current affairs
3. Use bullet points and headings for better readability
4. Focus on UPSC, SSC, Banking, State PSCs, Railways, Defense exams
5. Include mnemonics and memory techniques where helpful
6. Highlight important keywords and concepts
7. Provide practical preparation tips when relevant
8. Keep answers comprehensive but concise

${context ? `CONVERSATION CONTEXT:\n${context}\n\n` : ''}
USER QUESTION: ${question}

Provide a detailed, exam-oriented response that would genuinely help aspirants.
`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }

    // Validate message length
    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long. Please keep under 1000 characters.'
      });
    }

    // Initialize or get conversation history for this session
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    const history = conversationHistory.get(sessionId);

    // Use Gemini 2.0 Flash Experimental model (latest available)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    // Create context with history
    const context = history.map(entry => 
      `User: ${entry.question}\nAssistant: ${entry.answer}`
    ).join('\n\n');

    const fullPrompt = createMainPrompt(message, context);

    // Generate main answer
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const answer = response.text();

    // Generate related questions
    const relatedQuestionsPrompt = generateRelatedQuestionsPrompt(message);
    const relatedResult = await model.generateContent(relatedQuestionsPrompt);
    const relatedResponse = await relatedResult.response;
    const relatedText = relatedResponse.text();

    // Parse related questions
    let relatedQuestions = [];
    const lines = relatedText.split('\n');
    for (const line of lines) {
      if (line.match(/^\d+\.\s/)) {
        const question = line.replace(/^\d+\.\s/, '').trim();
        if (question && !question.includes('RELATED_QUESTIONS')) {
          relatedQuestions.push(question);
        }
      }
    }

    // If parsing failed, generate meaningful default related questions
    if (relatedQuestions.length === 0) {
      relatedQuestions = [
        `What are the key concepts and important facts about this topic for competitive exams?`,
        `How is this topic relevant to current affairs and recent government exams?`,
        `What are the common mistakes aspirants make while studying this topic?`
      ];
    }

    // Limit to 3 questions
    relatedQuestions = relatedQuestions.slice(0, 3);

    // Update conversation history
    history.push({
      question: message,
      answer: answer,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10 messages to manage memory
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    res.json({
      success: true,
      answer,
      relatedQuestions,
      sessionId,
      model: "gemini-2.5-pro",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating response:', error);
    
    // More specific error handling
    let errorMessage = 'Failed to generate response';
    let suggestion = 'Please try again with a different question.';
    
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
      errorMessage = 'Invalid API key. Please check your Gemini API configuration.';
      suggestion = 'Contact the administrator to verify the API key.';
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      errorMessage = 'API quota exceeded. Please try again later.';
      suggestion = 'The daily limit for API requests has been reached.';
    } else if (error.message.includes('MODEL_NOT_FOUND')) {
      errorMessage = 'AI model is currently unavailable.';
      suggestion = 'Please try again in a few moments.';
    }

    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      suggestion: suggestion
    });
  }
});

// Health check endpoint with API key validation
app.get('/api/health', async (req, res) => {
  try {
    // Test the API key by making a simple request
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const testResult = await model.generateContent('Say "OK" if working');
    const testResponse = await testResult.response;
    
    res.json({ 
      success: true,
      status: 'OK', 
      message: 'Next Adhikari API is running successfully',
      model: 'Gemini 2.5 Pro',
      apiKey: process.env.GEMINI_API_KEY ? 'Configured' : 'Missing',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'ERROR',
      message: 'API key validation failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get conversation history for a session (for debugging)
app.get('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const history = conversationHistory.get(sessionId) || [];
  
  res.json({
    success: true,
    sessionId,
    messageCount: history.length,
    history: history
  });
});

// Clear conversation history for a session
app.delete('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const deleted = conversationHistory.delete(sessionId);
  
  res.json({
    success: true,
    sessionId,
    deleted: deleted,
    message: deleted ? 'Conversation cleared' : 'No conversation found'
  });
});

// Clean up old conversations periodically (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  let cleanedCount = 0;
  
  for (const [sessionId, history] of conversationHistory.entries()) {
    if (history.length > 0) {
      const lastMessageTime = new Date(history[history.length - 1].timestamp).getTime();
      if (now - lastMessageTime > oneHour) {
        conversationHistory.delete(sessionId);
        cleanedCount++;
      }
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old conversations`);
  }
}, 30 * 60 * 1000);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Next Adhikari Govt Exam Assistant API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat (POST)',
      conversation: '/api/conversation/:sessionId (GET)'
    },
    frontend: 'https://nextadhikarichatassistant.netlify.app'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/chat',
      'GET /api/conversation/:sessionId'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🚨 Global error handler:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Next Adhikari Server running on port ${PORT}`);
  console.log(`🤖 Using Gemini API Key: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`🌐 Frontend: https://nextadhikarichatassistant.netlify.app`);
  console.log(`📚 Govt Exam Assistant Backend Ready!`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});
