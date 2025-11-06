import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const conversationHistory = new Map();

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
  `;
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
      `User: ${entry.question}\nAssistant: ${entry.answer}`
    ).join('\n\n');

    const fullPrompt = `
      You are an expert assistant for government exam preparation in India. Your role is to:
      1. Answer questions clearly and concisely with exam-focused information
      2. Provide information relevant to exams like UPSC, SSC, Banking, State PSCs, Railways, Defense
      3. Include important facts, dates, concepts, and current affairs
      4. Structure answers in an easy-to-understand format with bullet points where helpful
      5. Focus on accuracy and relevance for competitive exams
      
      ${context ? `Previous conversation:\n${context}\n\n` : ''}
      Current question: ${message}
      
      Please provide a comprehensive answer that would help in government exam preparation.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const answer = response.text();

    const relatedQuestionsPrompt = generateRelatedQuestionsPrompt(message);
    const relatedResult = await model.generateContent(relatedQuestionsPrompt);
    const relatedResponse = await relatedResult.response;
    const relatedText = relatedResponse.text();

    let relatedQuestions = [];
    const lines = relatedText.split('\n');
    for (const line of lines) {
      if (line.match(/^\d+\.\s/)) {
        const question = line.replace(/^\d+\.\s/, '').trim();
        if (question) {
          relatedQuestions.push(question);
        }
      }
    }

    if (relatedQuestions.length === 0) {
      relatedQuestions = [
        `Explain the key concepts related to ${message.substring(0, 50)}...`,
        `What are the important facts about ${message.substring(0, 40)}... for government exams?`,
        `How is ${message.substring(0, 40)}... relevant to current affairs?`
      ];
    }

    relatedQuestions = relatedQuestions.slice(0, 3);

    history.push({
      question: message,
      answer: answer,
      timestamp: new Date().toISOString()
    });

    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    res.json({
      answer,
      relatedQuestions,
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
    model: 'Gemini 2.5 Pro'
  });
});

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
});