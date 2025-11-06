import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  FiSend, 
  FiTrash2, 
  FiMessageSquare, 
  FiCpu, 
  FiStar,
  FiChevronRight,
  FiZap,
  FiBook,
  FiAward,
  FiTarget,
  FiHelpCircle
} from 'react-icons/fi';
import { 
  RiGovernmentLine, 
  RiLightbulbFlashLine,
  RiRobotLine,
  RiChatQuoteLine
} from 'react-icons/ri';
import { 
  IoRocketOutline,
  IoTimeOutline,
  IoSparkles
} from 'react-icons/io5';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end"
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
const API_URL = import.meta.env.VITE_BACKEND_URL;

    try {
const response = await axios.post(`${API_URL}/api/chat`, {    
      message: messageText,
        sessionId: sessionId
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.answer,
        sender: 'bot',
        relatedQuestions: response.data.relatedQuestions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: response.data.model
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again in a moment.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleExampleClick = (question) => {
    sendMessage(question);
  };

  const handleRelatedQuestionClick = (question) => {
    setInputMessage(question);
    setTimeout(() => {
      document.querySelector('input')?.focus();
    }, 100);
  };

  const formatMessage = (text) => {
    return text.split('\n').map((line, index) => (
      <div key={index} className="message-line">
        {line}
      </div>
    ));
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Example questions with icons
  const exampleQuestions = [
    {
      text: "What is the complete structure of UPSC Civil Services exam?",
      icon: <RiGovernmentLine className="question-icon" />,
      category: "UPSC"
    },
    {
      text: "Explain the fundamental rights in Indian Constitution with examples",
      icon: <FiBook className="question-icon" />,
      category: "Constitution"
    },
    {
      text: "What are the most important topics for SSC CGL 2024?",
      icon: <FiTarget className="question-icon" />,
      category: "SSC"
    },
    {
      text: "Current affairs related to Indian economy and budget",
      icon: <FiZap className="question-icon" />,
      category: "Current Affairs"
    },
    {
      text: "How to prepare for State PSC exams effectively?",
      icon: <FiAward className="question-icon" />,
      category: "Strategy"
    }
  ];

  // Generate background particles
  const renderParticles = () => {
    const particles = [];
    for (let i = 0; i < 20; i++) {
      particles.push(
        <div
          key={i}
          className="particle"
          style={{
            width: `${Math.random() * 8 + 2}px`,
            height: `${Math.random() * 8 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 4 + 4}s`
          }}
        />
      );
    }
    return particles;
  };

  return (
    <div className="App">
      <div className="background-particles">
        {renderParticles()}
      </div>
      
      <div className="chat-container">
        {/* Premium Header */}
        <div className="chat-header">
          <div className="header-content">
            <div className="header-main">
              <div className="brand-logo">
                <RiGovernmentLine className="logo-icon" />
                <div className="logo-glow"></div>
              </div>
              <div className="brand-text">
                <h1>Next Adhikari</h1>
                <p className="subtitle">Your AI-Powered Govt Exam Assistant</p>
              </div>
            </div>
            
            <div className="header-stats">
              <div className="stat-item">
                <div className="stat-icon">
                  <FiMessageSquare />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{messages.filter(m => m.sender === 'user').length}</div>
                  <div className="stat-label">Questions Asked</div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon">
                  <FiStar />
                </div>
                <div className="stat-content">
                  <div className="stat-number">Premium</div>
                  <div className="stat-label">Experience</div>
                </div>
              </div>
            </div>
            
            <button className="clear-chat-btn" onClick={clearChat}>
              <FiTrash2 className="btn-icon" />
              Clear Chat
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <div className="welcome-icon">
                <IoSparkles className="sparkle-icon" />
                <RiRobotLine className="robot-icon" />
              </div>
              <h2>Welcome to Next Adhikari! <span className="gradient-text">🚀</span></h2>
              <p>Your intelligent assistant for UPSC, SSC, Banking, State PSCs, Railways, Defense exams and more. Get expert guidance and personalized study support.</p>
              
              <div className="features-grid">
                <div className="feature-card">
                  <RiGovernmentLine className="feature-icon" />
                  <h4>UPSC Expert</h4>
                  <p>Complete guidance for Civil Services</p>
                </div>
                <div className="feature-card">
                  <FiTarget className="feature-icon" />
                  <h4>SSC & Banking</h4>
                  <p>Targeted preparation strategies</p>
                </div>
                <div className="feature-card">
                  <FiZap className="feature-icon" />
                  <h4>Current Affairs</h4>
                  <p>Latest updates and analysis</p>
                </div>
              </div>

              <div className="example-questions">
                <div className="section-header">
                  <RiLightbulbFlashLine className="section-icon" />
                  <h3>Quick Start Questions</h3>
                </div>
                <div className="questions-grid">
                  {exampleQuestions.map((question, index) => (
                    <div
                      key={index}
                      className="example-question-card"
                      onClick={() => handleExampleClick(question.text)}
                    >
                      <div className="question-main">
                        {question.icon}
                        <span className="question-text">{question.text}</span>
                      </div>
                      <div className="question-footer">
                        <span className="question-category">{question.category}</span>
                        <FiChevronRight className="chevron-icon" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'} ${message.isError ? 'error-message' : ''}`}
              >
                <div className="message-content">
                  <div className="message-header">
                    {message.sender === 'bot' && (
                      <div className="bot-avatar">
                        <RiRobotLine />
                      </div>
                    )}
                    <div className="message-sender">
                      {message.sender === 'user' ? 'You' : 'Next Adhikari'}
                    </div>
                  </div>
                  
                  <div className="message-text">
                    {formatMessage(message.text)}
                  </div>
                  
                  <div className="message-footer">
                    <span className="message-timestamp">
                      <IoTimeOutline className="time-icon" />
                      {message.timestamp}
                    </span>
                    {message.model && (
                      <span className="model-badge">
                        <FiCpu className="model-icon" />
                        Next Adhikari
                      </span>
                    )}
                  </div>
                  
                  {message.sender === 'bot' && message.relatedQuestions && message.relatedQuestions.length > 0 && (
                    <div className="related-questions">
                      <div className="related-header">
                        <RiChatQuoteLine className="related-icon" />
                        <h4>Related Exam Questions</h4>
                      </div>
                      <div className="related-grid">
                        {message.relatedQuestions.map((question, index) => (
                          <button
                            key={index}
                            className="related-question-btn"
                            onClick={() => handleRelatedQuestionClick(question)}
                          >
                            <span className="related-number">0{index + 1}</span>
                            <span className="related-text">{question}</span>
                            <FiChevronRight className="related-chevron" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="message bot-message">
              <div className="message-content">
                <div className="loading-container">
                  <div className="loading-header">
                    <div className="bot-avatar thinking">
                      <RiRobotLine />
                    </div>
                    <span>Next Adhikari is thinking...</span>
                  </div>
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="scroll-anchor" />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <div className="input-wrapper">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Next Adhikari your doubts and govt exams (UPSC, SSC, Banking, etc.)..."
                disabled={loading}
                autoFocus
                className="premium-input"
              />
              <div className="input-decoration"></div>
            </div>
            <button 
              type="submit" 
              disabled={loading || !inputMessage.trim()}
              className="send-button premium-send-btn"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <IoRocketOutline className="send-icon" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
          <div className="input-hint">
            <FiHelpCircle className="hint-icon" />
            Press Enter to send • Click example questions to start
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;