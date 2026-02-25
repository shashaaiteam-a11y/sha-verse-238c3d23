import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ArrowLeft, Search, HelpCircle, MessageCircle, 
  Shield, Users, Video, BookOpen, Settings,
  Mail, Phone, ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const HelpSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const helpCategories = [
    { icon: Users, label: "Account & Profile", color: "text-blue-500" },
    { icon: Shield, label: "Privacy & Security", color: "text-green-500" },
    { icon: MessageCircle, label: "Messages & Chat", color: "text-purple-500" },
    { icon: Video, label: "Movion (Videos)", color: "text-red-500" },
    { icon: BookOpen, label: "Bookshelf", color: "text-orange-500" },
    { icon: Settings, label: "Settings", color: "text-gray-500" },
  ];

  const faqs = [
    {
      question: "How do I change my profile picture?",
      answer: "Go to your Profile page, tap on your current profile picture, and select 'Change Photo' to upload a new image from your device or take a new photo."
    },
    {
      question: "How do I add friends?",
      answer: "You can add friends by searching for their name in the search bar, visiting their profile, and tapping the 'Add Friend' button. They will receive a friend request notification."
    },
    {
      question: "How do I block someone?",
      answer: "Visit the user's profile, tap the three-dot menu, and select 'Block'. Blocked users cannot see your posts, send you messages, or tag you."
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Settings & Privacy > Security > Deactivate Account. Note that account deletion is permanent and cannot be undone after 30 days."
    },
    {
      question: "How do I upload videos to Movion?",
      answer: "Go to the Movion section, tap the upload button (+ icon), select your video file, add a title and description, then tap 'Upload'. Your video will be processed and published."
    },
    {
      question: "How do I create a Group?",
      answer: "Go to the Groups section, tap 'Create Group', enter your group name and description, set privacy settings, and invite members."
    },
    {
      question: "How do I report inappropriate content?",
      answer: "Tap the three-dot menu on any post or profile and select 'Report'. Choose the reason for reporting and submit. Our team will review it within 24-48 hours."
    },
    {
      question: "How do I change my password?",
      answer: "Go to Settings & Privacy > Privacy & Security, tap on the Security tab, and use the 'Change Password' section to update your password."
    },
  ];

  const filteredFaqs = faqs.filter(
    faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendFeedback = () => {
    if (!feedbackMessage.trim()) return;
    
    toast({
      title: "Feedback sent!",
      description: "Thank you for your feedback. We'll review it soon.",
    });
    setFeedbackMessage("");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg">Help & Support</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search for help..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {helpCategories.map(({ icon: Icon, label, color }) => (
              <Card 
                key={label}
                className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full bg-secondary ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Frequently Asked Questions
          </h2>
          <Card>
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="px-4 text-left text-sm">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>

        {/* Contact Us */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contact Us
          </h2>
          <Card className="divide-y divide-border">
            <button className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Email Support</p>
                  <p className="text-xs text-muted-foreground">support@sha-verse.com</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Live Chat</p>
                  <p className="text-xs text-muted-foreground">Chat with support team</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Send Feedback */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Send Feedback
          </h2>
          <Card className="p-4 space-y-4">
            <Textarea 
              placeholder="Tell us how we can improve Sha-Verse..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={4}
            />
            <Button 
              className="w-full"
              onClick={handleSendFeedback}
              disabled={!feedbackMessage.trim()}
            >
              Send Feedback
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
