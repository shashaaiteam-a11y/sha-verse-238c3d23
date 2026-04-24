import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Image, FileText, X, HelpCircle, Check, Loader2, ArrowLeft, BookOpen, Globe, Tag, Lock, Eye, EyeOff, AlertCircle, Plus, Trash2, GripVertical, Sparkles, Calendar, Clock, DollarSign, Shield, FileCheck, Download, Copy, Printer, Brain, ExternalLink, Share2, Edit, CheckCircle2, XCircle, Save, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useBooks } from "@/hooks/useBooks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import CopyrightAgreementDialog from "./CopyrightAgreementDialog";

interface EnhancedUploadBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}

interface Chapter {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  summary?: string;
}

interface FormErrors {
  title?: string;
  author?: string;
  description?: string;
  category?: string;
  bookFile?: string;
  coverFile?: string;
  bookPrice?: string;
  scheduleDate?: string;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
  progress?: number;
}

const CATEGORIES = [
  "Fiction", "Non-Fiction", "Science", "Technology", "Self-Help", 
  "Biography", "Business", "Education", "Coding", "AI", 
  "Romance", "Thriller", "Mystery", "Fantasy", "History",
  "Comic", "Motivational", "Health", "Travel", "Cooking",
  "Poetry", "Religion", "Philosophy", "Psychology", "Children"
];

const LANGUAGES = [
  "English", "Hindi", "Urdu", "Spanish", "French", "German", 
  "Chinese", "Japanese", "Arabic", "Portuguese", "Russian",
  "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"
];

type UploadStep = "form" | "processing" | "success" | "error";

const INITIAL_PROCESSING_STEPS: ProcessingStep[] = [
  { id: "upload", label: "Uploading book file", status: "pending" },
  { id: "extract", label: "Extracting pages", status: "pending" },
  { id: "preview", label: "Generating preview", status: "pending" },
  { id: "metadata", label: "Processing metadata", status: "pending" },
  { id: "thumbnails", label: "Creating thumbnails", status: "pending" },
  { id: "violations", label: "Checking for violations", status: "pending" },
  { id: "save", label: "Saving book", status: "pending" },
  { id: "link", label: "Creating public link", status: "pending" },
  { id: "finalize", label: "Finalizing publish", status: "pending" },
];

const EnhancedUploadBookDialog = ({
  open,
  onOpenChange,
  channelId,
}: EnhancedUploadBookDialogProps) => {
  const { uploadBook } = useBooks();
  const { user } = useAuth();
  const [step, setStep] = useState<UploadStep>("form");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(INITIAL_PROCESSING_STEPS);
  const [currentProcessingStep, setCurrentProcessingStep] = useState(0);
  const [publishedBookId, setPublishedBookId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [pages, setPages] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("English");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [ageRestriction, setAgeRestriction] = useState("none");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [ratingsEnabled, setRatingsEnabled] = useState(true);
  
  // Chapters state
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  
  // Schedule state
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  
  // Monetization state
  const [monetizationEnabled, setMonetizationEnabled] = useState(false);
  const [monetizationType, setMonetizationType] = useState<string[]>([]);
  const [pricingModel, setPricingModel] = useState<"free" | "paid">("free");
  const [bookPrice, setBookPrice] = useState("");
  
  // Advanced settings state
  const [copyrightOwner, setCopyrightOwner] = useState<"me" | "other">("me");
  const [licenseType, setLicenseType] = useState("standard");
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [allowCopyPaste, setAllowCopyPaste] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [enableAiSummary, setEnableAiSummary] = useState(true);
  
  // Files
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  // Error state
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Draft state
  const [draftSaved, setDraftSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Copyright agreement gate
  const [showCopyrightDialog, setShowCopyrightDialog] = useState(false);
  
  // Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save draft every 20 seconds
  const saveDraft = useCallback(() => {
    if (!title && !author && !description && !bookFile) return;
    
    const draft = {
      title,
      subtitle,
      author,
      description,
      pages,
      category,
      language,
      tags,
      visibility,
      ageRestriction,
      commentsEnabled,
      ratingsEnabled,
      chapters,
      publishMode,
      scheduleDate,
      scheduleTime,
      monetizationEnabled,
      monetizationType,
      pricingModel,
      bookPrice,
      copyrightOwner,
      licenseType,
      allowDownloads,
      allowCopyPaste,
      allowPrinting,
      enableAiSummary,
    };
    
    localStorage.setItem(`book_draft_${channelId}`, JSON.stringify(draft));
    setDraftSaved(true);
    setLastSavedAt(new Date());
    toast.success("Draft saved", { duration: 2000 });
    
    setTimeout(() => setDraftSaved(false), 2000);
  }, [title, subtitle, author, description, pages, category, language, tags, visibility, ageRestriction, commentsEnabled, ratingsEnabled, chapters, publishMode, scheduleDate, scheduleTime, monetizationEnabled, monetizationType, pricingModel, bookPrice, copyrightOwner, licenseType, allowDownloads, allowCopyPaste, allowPrinting, enableAiSummary, channelId, bookFile]);

  // Auto-save effect
  useEffect(() => {
    if (open && step === "form") {
      autoSaveTimerRef.current = setInterval(() => {
        saveDraft();
      }, 20000); // 20 seconds
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [open, step, saveDraft]);

  // Load draft on open
  useEffect(() => {
    if (open) {
      const savedDraft = localStorage.getItem(`book_draft_${channelId}`);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setTitle(draft.title || "");
          setSubtitle(draft.subtitle || "");
          setAuthor(draft.author || "");
          setDescription(draft.description || "");
          setPages(draft.pages || "");
          setCategory(draft.category || "");
          setLanguage(draft.language || "English");
          setTags(draft.tags || []);
          setVisibility(draft.visibility || "public");
          setAgeRestriction(draft.ageRestriction || "none");
          setCommentsEnabled(draft.commentsEnabled !== false);
          setRatingsEnabled(draft.ratingsEnabled !== false);
          setChapters(draft.chapters || []);
          setMonetizationEnabled(draft.monetizationEnabled || false);
          setMonetizationType(draft.monetizationType || []);
          setPricingModel(draft.pricingModel || "free");
          setBookPrice(draft.bookPrice || "");
        } catch (e) {
          console.error("Failed to load draft:", e);
        }
      }
    }
  }, [open, channelId]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (!author.trim()) {
      newErrors.author = "Author name is required";
    }
    
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (!category) {
      newErrors.category = "Please select a category";
    }
    
    if (bookFile && bookFile.size > 200 * 1024 * 1024) {
      newErrors.bookFile = "File size exceeds 200MB limit";
    }
    
    if (bookFile) {
      const ext = bookFile.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'epub', 'mobi', 'txt', 'docx'].includes(ext || '')) {
        newErrors.bookFile = "Unsupported file format. Use PDF, EPUB, TXT, or DOCX";
      }
    }
    
    if (pricingModel === "paid" && monetizationEnabled) {
      const price = parseInt(bookPrice);
      if (!bookPrice || isNaN(price) || price < 10 || price > 999) {
        newErrors.bookPrice = "Price must be between ₹10 and ₹999";
      }
      if (!monetizationEnabled) {
        newErrors.bookPrice = "Enable monetization first to set a price";
      }
    }
    
    if (publishMode === "schedule") {
      if (!scheduleDate) {
        newErrors.scheduleDate = "Please select a date";
      } else {
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime || "00:00"}`);
        if (scheduledDateTime <= new Date()) {
          newErrors.scheduleDate = "Schedule time must be in the future";
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, coverFile: undefined }));
    }
  };

  const handleBookSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > 200 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, bookFile: "File size exceeds 200MB limit" }));
        return;
      }
      
      // Validate format
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'epub', 'mobi', 'txt', 'docx'].includes(ext || '')) {
        setErrors(prev => ({ ...prev, bookFile: "Unsupported format. Use PDF, EPUB, TXT, or DOCX" }));
        return;
      }
      
      setBookFile(file);
      setErrors(prev => ({ ...prev, bookFile: undefined }));
      
      // Auto-fill title from filename
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        setTitle(fileName);
      }
    }
  };

  const addTag = () => {
    if (tagInput.trim() && tags.length < 15 && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Chapter functions
  const addChapter = () => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: `Chapter ${chapters.length + 1}`,
      startPage: chapters.length > 0 ? (chapters[chapters.length - 1].endPage + 1) : 1,
      endPage: chapters.length > 0 ? (chapters[chapters.length - 1].endPage + 10) : 10,
    };
    setChapters([...chapters, newChapter]);
  };

  const removeChapter = (id: string) => {
    setChapters(chapters.filter((ch) => ch.id !== id));
  };

  const updateChapter = (id: string, field: keyof Chapter, value: string | number) => {
    setChapters(chapters.map((ch) => ch.id === id ? { ...ch, [field]: value } : ch));
  };

  const moveChapter = (index: number, direction: "up" | "down") => {
    const newChapters = [...chapters];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < chapters.length) {
      [newChapters[index], newChapters[newIndex]] = [newChapters[newIndex], newChapters[index]];
      setChapters(newChapters);
    }
  };

  const generateChapterSummary = (id: string) => {
    // AI summary placeholder - would call AI API
    updateChapter(id, "summary", "AI-generated summary coming soon...");
  };

  const simulateProcessing = async () => {
    const steps = [...INITIAL_PROCESSING_STEPS];
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentProcessingStep(i);
      
      // Update current step to processing
      setProcessingSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "processing" } : s
      ));
      
      // Simulate progress for this step
      for (let progress = 0; progress <= 100; progress += 20) {
        setProcessingSteps(prev => prev.map((s, idx) => 
          idx === i ? { ...s, progress } : s
        ));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Mark step as completed
      setProcessingSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "completed", progress: 100 } : s
      ));
      
      setUploadProgress(((i + 1) / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  // Step 1: validate form, then open copyright agreement gate.
  const handleRequestPublish = () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before publishing");
      return;
    }
    setShowCopyrightDialog(true);
  };

  // Step 2: actual publish flow, runs only after copyright agreement.
  const handleSubmit = async () => {
    setShowCopyrightDialog(false);
    setStep("processing");
    setProcessingSteps(INITIAL_PROCESSING_STEPS);
    setUploadProgress(0);
    setCurrentProcessingStep(0);

    try {
      // Start processing animation
      const processingPromise = simulateProcessing();

      // Actual upload with all metadata (file_hash + duplicate check happens inside the hook)
      const result = await uploadBook.mutateAsync({
        title,
        author,
        description,
        coverFile: coverFile || undefined,
        bookFile: bookFile || undefined,
        pages: pages ? parseInt(pages) : undefined,
        channelId,
        category,
        language,
        tags,
        visibility,
        ageRestriction,
        commentsEnabled,
        ratingsEnabled,
      });

      await processingPromise;
      setPublishedBookId(result?.id || null);

      // Clear draft on successful publish
      localStorage.removeItem(`book_draft_${channelId}`);

      setStep("success");
    } catch (error: any) {
      // Mark current step as error
      setProcessingSteps(prev => prev.map((s, idx) =>
        idx === currentProcessingStep ? { ...s, status: "error" } : s
      ));
      setStep("error");
      // Hook already shows a specific toast for duplicates; avoid generic override.
      const msg = error?.message || "";
      const isDuplicate = msg.includes("already exists") || msg.includes("title and author");
      if (!isDuplicate) {
        toast.error("Failed to publish book. Please try again.");
      }
    }
  };

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setAuthor("");
    setDescription("");
    setPages("");
    setCategory("");
    setLanguage("English");
    setTags([]);
    setVisibility("public");
    setAgeRestriction("none");
    setCommentsEnabled(true);
    setRatingsEnabled(true);
    setChapters([]);
    setChaptersOpen(false);
    setPublishMode("now");
    setScheduleDate("");
    setScheduleTime("");
    // Monetization reset
    setMonetizationEnabled(false);
    setMonetizationType([]);
    setPricingModel("free");
    setBookPrice("");
    // Advanced settings reset
    setCopyrightOwner("me");
    setLicenseType("standard");
    setAllowDownloads(true);
    setAllowCopyPaste(false);
    setAllowPrinting(true);
    setEnableAiSummary(true);
    // Files reset
    setCoverFile(null);
    setBookFile(null);
    setCoverPreview(null);
    setStep("form");
    setProcessingSteps(INITIAL_PROCESSING_STEPS);
    setUploadProgress(0);
    setErrors({});
    setPublishedBookId(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-0">
        {step === "form" && (
          <>
            <DialogHeader className="p-4 sm:p-6 pb-0 sticky top-0 bg-background z-10 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleClose}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <DialogTitle className="text-lg sm:text-xl">Upload Book</DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                  {draftSaved ? (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 animate-in fade-in">
                      <Save className="w-3 h-3 mr-1" />
                      Draft Saved
                    </Badge>
                  ) : lastSavedAt ? (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Last saved {lastSavedAt.toLocaleTimeString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Draft
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" onClick={saveDraft} title="Save Draft">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Book File Upload */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Book File</Label>
                <div
                  onClick={() => bookInputRef.current?.click()}
                  className={`p-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer bg-muted/30 ${
                    errors.bookFile 
                      ? "border-destructive/50 bg-destructive/5" 
                      : "border-muted-foreground/30 hover:border-primary/50"
                  }`}
                >
                  {bookFile ? (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{bookFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(bookFile.size / 1024 / 1024).toFixed(2)} MB • {bookFile.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Preview</Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookFile(null);
                            setErrors(prev => ({ ...prev, bookFile: undefined }));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium">Upload PDF/EPUB/TXT/DOCX</p>
                      <p className="text-sm text-muted-foreground">Max size: 200MB</p>
                    </div>
                  )}
                </div>
                {errors.bookFile && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.bookFile}
                  </p>
                )}
                <input
                  ref={bookInputRef}
                  type="file"
                  accept=".pdf,.epub,.mobi,.txt,.docx"
                  className="hidden"
                  onChange={handleBookSelect}
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Cover Image</Label>
                <div className="flex gap-4">
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    className="w-32 h-48 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center overflow-hidden flex-shrink-0"
                  >
                    {coverPreview ? (
                      <div className="relative w-full h-full">
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverFile(null);
                            setCoverPreview(null);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center p-2">
                        <Image className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Upload Cover</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                      <Image className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      toast.info('Feature coming soon: Auto-generate cover from first page');
                    }}>
                      Use First Page
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      toast.info('Feature coming soon: AI-generated cover design');
                    }}>
                      Auto Generate (AI)
                    </Button>
                  </div>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverSelect}
                />
              </div>

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                    }}
                    placeholder="Enter book title"
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Optional subtitle"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => {
                      setAuthor(e.target.value);
                      if (errors.author) setErrors(prev => ({ ...prev, author: undefined }));
                    }}
                    placeholder="Author name"
                    className={errors.author ? "border-destructive" : ""}
                  />
                  {errors.author && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.author}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pages">Pages</Label>
                  <Input
                    id="pages"
                    type="number"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    placeholder="Number of pages"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Write a detailed description of your book...

• Use bullet points for key highlights
• Add emojis to make it engaging 📚
• Include what readers will learn
• Mention target audience"
                  rows={6}
                  className={`resize-none ${errors.description ? "border-destructive" : ""}`}
                />
                {errors.description && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Use **bold**, *italic*, bullet points (•), emojis, and links to make your description stand out
                </p>
              </div>

              {/* Category & Language */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select 
                    value={category} 
                    onValueChange={(val) => {
                      setCategory(val);
                      if (errors.category) setErrors(prev => ({ ...prev, category: undefined }));
                    }}
                  >
                    <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.category}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags (up to 15)</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} disabled={tags.length >= 15}>
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Chapters Section */}
              <Collapsible open={chaptersOpen} onOpenChange={setChaptersOpen}>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-semibold">Chapters</span>
                        <Badge variant="outline" className="text-xs">{chapters.length}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {chaptersOpen ? "Click to collapse" : "Click to expand"}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Add chapters to help readers navigate your book. This is optional but recommended.
                    </p>
                    
                    {chapters.map((chapter, index) => (
                      <div key={chapter.id} className="p-3 rounded-lg border bg-background space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => moveChapter(index, "up")}
                              disabled={index === 0}
                            >
                              <GripVertical className="w-3 h-3 rotate-90" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => moveChapter(index, "down")}
                              disabled={index === chapters.length - 1}
                            >
                              <GripVertical className="w-3 h-3 -rotate-90" />
                            </Button>
                          </div>
                          <div className="flex-1 space-y-2">
                            <Input
                              value={chapter.title}
                              onChange={(e) => updateChapter(chapter.id, "title", e.target.value)}
                              placeholder="Chapter title"
                              className="font-medium"
                            />
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label className="text-xs">Start Page</Label>
                                <Input
                                  type="number"
                                  value={chapter.startPage}
                                  onChange={(e) => updateChapter(chapter.id, "startPage", parseInt(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs">End Page</Label>
                                <Input
                                  type="number"
                                  value={chapter.endPage}
                                  onChange={(e) => updateChapter(chapter.id, "endPage", parseInt(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </div>
                            </div>
                            {chapter.summary && (
                              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{chapter.summary}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => generateChapterSummary(chapter.id)}
                              title="Generate AI Summary"
                            >
                              <Sparkles className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeChapter(chapter.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button variant="outline" size="sm" onClick={addChapter} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Chapter
                    </Button>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Monetization Section */}
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Monetization
                  </h3>
                  <Switch checked={monetizationEnabled} onCheckedChange={setMonetizationEnabled} />
                </div>

                {monetizationEnabled && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Monetize With</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "ads", label: "Ads per chapter" },
                          { id: "rewarded", label: "Rewarded ads" },
                          { id: "membership", label: "Membership only" },
                          { id: "premium", label: "Premium pricing" },
                        ].map((option) => (
                          <Button
                            key={option.id}
                            type="button"
                            variant={monetizationType.includes(option.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setMonetizationType(prev =>
                                prev.includes(option.id)
                                  ? prev.filter(t => t !== option.id)
                                  : [...prev, option.id]
                              );
                            }}
                            className="text-xs"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Pricing</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={pricingModel === "free" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setPricingModel("free");
                            setErrors(prev => ({ ...prev, bookPrice: undefined }));
                          }}
                          className="flex-1"
                        >
                          Free
                        </Button>
                        <Button
                          type="button"
                          variant={pricingModel === "paid" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPricingModel("paid")}
                          className="flex-1"
                        >
                          Paid
                        </Button>
                      </div>
                      {pricingModel === "paid" && (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">₹</span>
                            <Input
                              type="number"
                              placeholder="10 - 999"
                              value={bookPrice}
                              onChange={(e) => {
                                setBookPrice(e.target.value);
                                if (errors.bookPrice) setErrors(prev => ({ ...prev, bookPrice: undefined }));
                              }}
                              min="10"
                              max="999"
                              className={`flex-1 ${errors.bookPrice ? "border-destructive" : ""}`}
                            />
                          </div>
                          {errors.bookPrice && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.bookPrice}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <Button variant="link" size="sm" className="p-0 h-auto text-primary">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Check your earnings
                    </Button>
                  </div>
                )}
              </div>

              {/* Advanced Settings */}
              <Collapsible>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Advanced Settings
                      </h3>
                      <span className="text-xs text-muted-foreground">Click to expand</span>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-4 space-y-4">
                    {/* Copyright */}
                    <div className="space-y-2">
                      <Label>Copyright Owner</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={copyrightOwner === "me" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCopyrightOwner("me")}
                          className="flex-1"
                        >
                          <FileCheck className="w-4 h-4 mr-1" />
                          Me
                        </Button>
                        <Button
                          type="button"
                          variant={copyrightOwner === "other" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCopyrightOwner("other")}
                          className="flex-1"
                        >
                          Someone else
                        </Button>
                      </div>
                      {copyrightOwner === "other" && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Proof of authorization may be required
                        </p>
                      )}
                    </div>

                    {/* License Type */}
                    <div className="space-y-2">
                      <Label>License Type</Label>
                      <Select value={licenseType} onValueChange={setLicenseType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard License</SelectItem>
                          <SelectItem value="cc-by">Creative Commons (CC BY)</SelectItem>
                          <SelectItem value="cc-by-sa">Creative Commons (CC BY-SA)</SelectItem>
                          <SelectItem value="cc-by-nc">Creative Commons (CC BY-NC)</SelectItem>
                          <SelectItem value="cc-zero">Public Domain (CC0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Permission toggles */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label>Allow Downloads</Label>
                            <p className="text-xs text-muted-foreground">Readers can download the book</p>
                          </div>
                        </div>
                        <Switch checked={allowDownloads} onCheckedChange={setAllowDownloads} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Copy className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label>Allow Copy-Paste</Label>
                            <p className="text-xs text-muted-foreground">Readers can copy text</p>
                          </div>
                        </div>
                        <Switch checked={allowCopyPaste} onCheckedChange={setAllowCopyPaste} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label>Allow Printing</Label>
                            <p className="text-xs text-muted-foreground">Readers can print pages</p>
                          </div>
                        </div>
                        <Switch checked={allowPrinting} onCheckedChange={setAllowPrinting} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label>Enable AI Summary</Label>
                            <p className="text-xs text-muted-foreground">Auto-generate summary for readers</p>
                          </div>
                        </div>
                        <Switch checked={enableAiSummary} onCheckedChange={setEnableAiSummary} />
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Publish Settings */}
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Publish Settings
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select value={visibility} onValueChange={setVisibility}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Public</span>
                        </SelectItem>
                        <SelectItem value="unlisted">
                          <span className="flex items-center gap-2"><EyeOff className="w-4 h-4" /> Unlisted</span>
                        </SelectItem>
                        <SelectItem value="private">
                          <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Private</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Age Restriction</Label>
                    <Select value={ageRestriction} onValueChange={setAgeRestriction}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="13+">13+</SelectItem>
                        <SelectItem value="18+">18+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Comments</Label>
                    <p className="text-xs text-muted-foreground">Let readers comment on your book</p>
                  </div>
                  <Switch checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Ratings</Label>
                    <p className="text-xs text-muted-foreground">Let readers rate your book</p>
                  </div>
                  <Switch checked={ratingsEnabled} onCheckedChange={setRatingsEnabled} />
                </div>

                {/* Schedule Publishing */}
                <div className="pt-2 border-t space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Publish Schedule
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={publishMode === "now" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setPublishMode("now");
                        setErrors(prev => ({ ...prev, scheduleDate: undefined }));
                      }}
                      className="flex-1"
                    >
                      Publish Now
                    </Button>
                    <Button
                      type="button"
                      variant={publishMode === "schedule" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPublishMode("schedule")}
                      className="flex-1"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Schedule
                    </Button>
                  </div>
                  {publishMode === "schedule" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Date</Label>
                          <Input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => {
                              setScheduleDate(e.target.value);
                              if (errors.scheduleDate) setErrors(prev => ({ ...prev, scheduleDate: undefined }));
                            }}
                            min={new Date().toISOString().split('T')[0]}
                            className={errors.scheduleDate ? "border-destructive" : ""}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Time</Label>
                          <Input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                          />
                        </div>
                      </div>
                      {errors.scheduleDate && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.scheduleDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2">
                <Button variant="outline" className="flex-1" onClick={saveDraft}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRequestPublish}
                  disabled={uploadBook.isPending}
                >
                  {uploadBook.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : publishMode === "schedule" && scheduleDate ? (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </>
                  ) : (
                    "Publish Book"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-8">
            {/* YouTube-style Processing Header */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{Math.round(uploadProgress)}%</span>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Processing Your Book</h2>
              <p className="text-muted-foreground max-w-sm">
                Please don't close this window. We're preparing your book for readers worldwide.
              </p>
            </div>

            {/* Main Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <Progress value={uploadProgress} className="h-3 bg-muted" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing...</span>
                <span>{Math.round(uploadProgress)}% complete</span>
              </div>
            </div>

            {/* Processing Steps List */}
            <div className="w-full max-w-md space-y-3 bg-muted/30 rounded-xl p-4">
              {processingSteps.map((procStep, i) => (
                <div key={procStep.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 flex-shrink-0">
                    {procStep.status === "completed" && (
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                    {procStep.status === "processing" && (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      </div>
                    )}
                    {procStep.status === "pending" && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      </div>
                    )}
                    {procStep.status === "error" && (
                      <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      procStep.status === "completed" ? "text-green-600" :
                      procStep.status === "processing" ? "text-primary" :
                      procStep.status === "error" ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      {procStep.label}
                    </p>
                    {procStep.status === "processing" && procStep.progress !== undefined && (
                      <Progress value={procStep.progress} className="h-1 mt-1" />
                    )}
                  </div>
                  {procStep.status === "completed" && (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Cancel button */}
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
              Cancel Upload
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-6">
            {/* Big Green Checkmark */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-500 text-white">Published</Badge>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-green-600">Your book is published!</h2>
              <p className="text-muted-foreground">Readers can now discover and enjoy your book</p>
            </div>

            {/* Book Cover Preview */}
            {coverPreview && (
              <div className="relative group">
                <img 
                  src={coverPreview} 
                  alt="Book cover" 
                  className="w-32 h-48 rounded-lg object-cover shadow-xl border-4 border-background ring-2 ring-green-500/20" 
                />
                <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">by {author}</p>
              {category && (
                <Badge variant="secondary" className="mt-2">{category}</Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-primary to-primary/80"
                onClick={() => { 
                  handleClose(); 
                  if (publishedBookId) {
                    window.location.href = `/book/${publishedBookId}`;
                  } else {
                    window.location.reload();
                  }
                }}
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View Book
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setStep("form");
                    // Don't reset form, allow editing
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const shareUrl = publishedBookId 
                      ? `${window.location.origin}/book/${publishedBookId}`
                      : window.location.href;
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Link copied to clipboard!");
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Link
                </Button>
              </div>
              <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-destructive">Upload Failed</h2>
              <p className="text-muted-foreground max-w-sm">
                Something went wrong while processing your book. Please try again.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("form")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={handleSubmit}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <CopyrightAgreementDialog
        open={showCopyrightDialog}
        onOpenChange={setShowCopyrightDialog}
        onAgree={handleSubmit}
        currentUserName={user?.user_metadata?.display_name || user?.email || null}
      />
    </Dialog>
  );
};

export default EnhancedUploadBookDialog;
