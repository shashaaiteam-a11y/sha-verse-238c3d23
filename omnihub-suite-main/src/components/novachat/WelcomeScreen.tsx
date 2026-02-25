import { Button } from '@/components/ui/button';
import { 
  Code, FileText, Lightbulb, 
  PenTool, Calculator, Globe, Zap 
} from 'lucide-react';

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
}

const WelcomeScreen = ({ onSuggestionClick }: WelcomeScreenProps) => {
  const categories = [
    {
      icon: Code,
      title: 'Code',
      color: 'text-blue-500',
      suggestions: [
        'Write a Python function to sort a list',
        'Explain async/await in JavaScript',
        'Create a React component with hooks'
      ]
    },
    {
      icon: FileText,
      title: 'Write',
      color: 'text-purple-500',
      suggestions: [
        'Write a professional email template',
        'Help me draft a cover letter',
        'Create a blog post outline'
      ]
    },
    {
      icon: Lightbulb,
      title: 'Ideas',
      color: 'text-yellow-500',
      suggestions: [
        'Brainstorm startup ideas for AI',
        'Suggest creative project names',
        'Help me plan a marketing strategy'
      ]
    },
    {
      icon: Calculator,
      title: 'Analyze',
      color: 'text-green-500',
      suggestions: [
        'Explain this math problem step by step',
        'Analyze the pros and cons of...',
        'Compare different approaches to...'
      ]
    }
  ];

  const quickPrompts = [
    { icon: Globe, text: "Explain quantum computing simply", color: "bg-blue-500/10 text-blue-500" },
    { icon: PenTool, text: "Write a poem about technology", color: "bg-purple-500/10 text-purple-500" },
    { icon: Zap, text: "Give me productivity tips", color: "bg-yellow-500/10 text-yellow-500" },
    { icon: Code, text: "Debug my code snippet", color: "bg-green-500/10 text-green-500" }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 pt-8">
      {/* Logo */}
      <div className="relative mb-8 mt-4">
        <div className="w-20 h-20 shadow-lg bg-black" style={{ borderRadius: '1rem', overflow: 'hidden', clipPath: 'inset(0 round 1rem)', transform: 'translateZ(0)' }}>
          <video
            src="/novachat-logo.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-primary-foreground">AI</span>
        </div>
      </div>
      
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">
        How can I help you today?
      </h1>
      <p className="text-muted-foreground mb-10 text-center max-w-md">
        I'm NovaChat, powered by advanced AI. Ask me anything about coding, writing, analysis, or just have a conversation.
      </p>

      {/* Quick Prompts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mb-10">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(prompt.text)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all ${prompt.color}`}
          >
            <prompt.icon className="w-6 h-6" />
            <span className="text-xs text-center text-foreground line-clamp-2">{prompt.text}</span>
          </button>
        ))}
      </div>

      {/* Category Suggestions */}
      <div className="w-full max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((category, i) => (
            <div key={i} className="rounded-xl border border-border p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <category.icon className={`w-5 h-5 ${category.color}`} />
                <h3 className="font-semibold">{category.title}</h3>
              </div>
              <div className="space-y-2">
                {category.suggestions.map((suggestion, j) => (
                  <button
                    key={j}
                    onClick={() => onSuggestionClick(suggestion)}
                    className="w-full text-left text-sm text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-10 text-center">
        NovaChat can make mistakes. Consider checking important information.
      </p>
    </div>
  );
};

export default WelcomeScreen;
