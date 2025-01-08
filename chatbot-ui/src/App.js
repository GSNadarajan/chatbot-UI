import './App.css';
import ChatbotComponent from './components/Chatbot/ChatbotComponent';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Medical Assistant Chatbot</h1>
      </header>
      <main className="App-main">
        <ChatbotComponent />
      </main>
    </div>
  );
}

export default App;
