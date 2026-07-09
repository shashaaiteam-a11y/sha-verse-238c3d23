import { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Send, Image, Video, FileText, BarChart2, Smile, MapPin, 
  Globe, Users, Lock, X, Plus, Trash2, Clock
} from "lucide-react";
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { triggerImageCompression } from '@/lib/compressImage';
import { compressForUpload } from '@/lib/media/compressFile';
import { uploadWithProgress } from '@/lib/media/uploadWithProgress';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { LocationPicker } from '@/components/LocationPicker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type PostPrivacy = 'public' | 'friends' | 'private';

interface PollOption {
  id: string;
  text: string;
}

const privacyOptions = [
  { value: 'public' as PostPrivacy, label: 'Public', icon: <Globe className="w-4 h-4" />, description: 'Anyone can see' },
  { value: 'friends' as PostPrivacy, label: 'Friends', icon: <Users className="w-4 h-4" />, description: 'Only friends can see' },
  { value: 'private' as PostPrivacy, label: 'Only Me', icon: <Lock className="w-4 h-4" />, description: 'Only you can see' },
];

// Feelings/Activities options
const feelingsOptions = [
  { emoji: '😊', label: 'happy' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😍', label: 'loved' },
  { emoji: '🎉', label: 'celebrating' },
  { emoji: '😤', label: 'angry' },
  { emoji: '😴', label: 'tired' },
  { emoji: '🤔', label: 'thinking' },
  { emoji: '😎', label: 'cool' },
  { emoji: '🥳', label: 'excited' },
  { emoji: '😌', label: 'relaxed' },
  { emoji: '🤗', label: 'grateful' },
  { emoji: '😇', label: 'blessed' },
];

const activitiesOptions = [
  { emoji: '🎬', label: 'Watching', placeholder: 'movie/show name' },
  { emoji: '🎵', label: 'Listening to', placeholder: 'song/artist' },
  { emoji: '📖', label: 'Reading', placeholder: 'book name' },
  { emoji: '🎮', label: 'Playing', placeholder: 'game name' },
  { emoji: '🍽️', label: 'Eating', placeholder: 'food' },
  { emoji: '☕', label: 'Drinking', placeholder: 'beverage' },
  { emoji: '✈️', label: 'Traveling to', placeholder: 'place' },
  { emoji: '💪', label: 'Working out', placeholder: '' },
  { emoji: '🛒', label: 'Shopping', placeholder: '' },
  { emoji: '🎂', label: 'Celebrating', placeholder: 'event' },
];

export const CreatePostCard = () => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PostPrivacy>('public');
  const [location, setLocation] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<{ id: string; url: string; type: string; uploading?: boolean; failed?: boolean; progress?: number }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [pollDuration, setPollDuration] = useState<'1d' | '3d' | '1w'>('1d');
  const [feeling, setFeeling] = useState<{ emoji: string; text: string } | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [activityInput, setActivityInput] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<typeof activitiesOptions[0] | null>(null);
  // Facebook-style composer: start collapsed as a compact single row, expand on interaction.
  const [expanded, setExpanded] = useState(false);
  const isComposerExpanded =
    expanded ||
    !!content.trim() ||
    mediaFiles.length > 0 ||
    !!pollQuestion.trim() ||
    !!feeling;

  // Optimistic UI + Background upload — file select hote hi local preview dikha do,
  // upload background me chalti rahe. User ko wait nahi karna padega.
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'photo' | 'video') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!user) return;

    const accepted: { file: File; placeholder: { id: string; url: string; type: string; uploading: boolean } }[] = [];

    // Step 1: instantly add local previews to state
    for (const file of Array.from(files)) {
      const maxSize = mediaType === 'video' ? 200 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${mediaType === 'video' ? '200MB' : '50MB'} limit`,
          variant: 'destructive'
        });
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const localUrl = URL.createObjectURL(file);
      accepted.push({
        file,
        placeholder: {
          id,
          url: localUrl,
          type: mediaType === 'video' ? 'video' : 'image',
          uploading: true,
        },
      });
    }

    if (accepted.length === 0) {
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setMediaFiles(prev => [...prev, ...accepted.map(a => a.placeholder)]);
    setIsUploading(true);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';

    // Step 2: kick off uploads in parallel — non-blocking
    await Promise.all(
      accepted.map(async ({ file: rawFile, placeholder }) => {
        try {
          // Compress before upload (image/video). Safe no-op on failure.
          const file = await compressForUpload(rawFile);

          // Upload with live progress so the user sees a percentage again.
          const { path: fileName, publicUrl } = await uploadWithProgress({
            bucket: 'post-images',
            file,
            userId: user.id,
            onProgress: (pct) => {
              setMediaFiles(prev =>
                prev.map(m =>
                  m.id === placeholder.id ? { ...m, progress: pct } : m
                )
              );
            },
          });

          // Background: generate optimized WebP variants (gated by flag, silent)
          triggerImageCompression('post-images', fileName);

          setMediaFiles(prev =>
            prev.map(m =>
              m.id === placeholder.id
                ? { ...m, url: publicUrl, uploading: false, progress: 100 }
                : m
            )
          );
          // free the blob URL
          try { URL.revokeObjectURL(placeholder.url); } catch {}
        } catch (err: any) {
          setMediaFiles(prev =>
            prev.map(m => (m.id === placeholder.id ? { ...m, uploading: false, failed: true } : m))
          );
          toast({
            title: 'Upload failed',
            description: err?.message || 'Could not upload file',
            variant: 'destructive'
          });
        }
      })
    );

    setIsUploading(false);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => {
      const target = prev[index];
      if (target?.uploading && target.url.startsWith('blob:')) {
        try { URL.revokeObjectURL(target.url); } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const addPollOption = () => {
    if (pollOptions.length >= 4) return;
    setPollOptions(prev => [...prev, { id: String(Date.now()), text: '' }]);
  };

  const removePollOption = (id: string) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(prev => prev.filter(opt => opt.id !== id));
  };

  const updatePollOption = (id: string, text: string) => {
    setPollOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleSelectFeeling = (emoji: string, label: string) => {
    setFeeling({ emoji, text: `feeling ${label}` });
    setSelectedActivity(null);
    setActivityInput('');
    setShowFeelingPicker(false);
  };

  const handleSelectActivity = (activity: typeof activitiesOptions[0]) => {
    setSelectedActivity(activity);
    setFeeling(null);
  };

  const confirmActivity = () => {
    if (selectedActivity) {
      const activityText = activityInput 
        ? `${selectedActivity.label} ${activityInput}` 
        : selectedActivity.label;
      setFeeling({ emoji: selectedActivity.emoji, text: activityText });
      setSelectedActivity(null);
      setActivityInput('');
      setShowFeelingPicker(false);
    }
  };

  const clearFeeling = () => {
    setFeeling(null);
    setSelectedActivity(null);
    setActivityInput('');
  };

  // Calculate poll expiry based on duration
  const getPollExpiry = () => {
    const now = new Date();
    switch (pollDuration) {
      case '1d': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '3d': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      case '1w': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim() && mediaFiles.length === 0 && !pollQuestion.trim()) return;
    if (!user) return;

    // Block submit while any media is still uploading in background
    if (mediaFiles.some(m => m.uploading)) {
      toast({
        title: 'Please wait',
        description: 'Media is still uploading in the background',
      });
      return;
    }

    // Use only successfully uploaded media (skip failed ones)
    const uploaded = mediaFiles.filter(m => !m.uploading && !m.failed);

    setIsSubmitting(true);
    try {
      const metadata: any = {};
      if (location) metadata.location = location;
      if (feeling) metadata.feeling = feeling;

      const hasPoll = pollQuestion.trim() && pollOptions.filter(o => o.text.trim()).length >= 2;
      
      const postData: any = {
        content: content.trim(),
        user_id: user.id,
        visibility: privacy,
        image_url: uploaded[0]?.url || null,
        media_urls: uploaded.slice(1).map(m => m.url),
        metadata,
        type: hasPoll ? 'poll' : 'text'
      };

      // Add poll data if present (store in poll_data for reference)
      if (hasPoll) {
        postData.poll_data = {
          question: pollQuestion.trim(),
          expires_at: getPollExpiry().toISOString(),
          duration: pollDuration
        };
      }

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert(postData)
        .select('id')
        .single();

      if (error) throw error;

      // Create poll options in separate table
      if (hasPoll && newPost) {
        const validOptions = pollOptions.filter(o => o.text.trim());
        const { error: optionsError } = await supabase
          .from('poll_options')
          .insert(
            validOptions.map((opt, idx) => ({
              post_id: newPost.id,
              option_text: opt.text.trim(),
              position: idx,
              vote_count: 0,
            }))
          );
        
        if (optionsError) throw optionsError;
      }

      toast({ title: 'Post created!' });
      setContent('');
      setExpanded(false);
      setMediaFiles([]);
      setPrivacy('public');
      setLocation(null);
      setFeeling(null);
      setPollQuestion('');
      setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
      setPollDuration('1d');
      // REALTIME-FIX: Invalidate all 3 post-related caches with active refetch
      // so the new post appears instantly in Home feed (useFeed), Profile posts
      // tab (useUserPosts), and any legacy usePosts consumers — no manual refresh.
      queryClient.invalidateQueries({ queryKey: ['unified-feed'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['user-posts'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'active' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="p-3 shadow-md hover:shadow-lg transition-shadow">
        {/* Collapsed Facebook-style compact composer row */}
        {!isComposerExpanded && (
          <div className="flex items-center gap-2">
            <Avatar className="w-9 h-9 flex-shrink-0">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                {profile?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex-1 h-10 px-4 rounded-full bg-secondary/60 hover:bg-secondary text-left text-sm text-muted-foreground transition-colors"
            >
              What's on your mind?
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Add photo"
              onClick={() => {
                setExpanded(true);
                requestAnimationFrame(() => photoInputRef.current?.click());
              }}
              className="h-9 w-9 flex-shrink-0 rounded-full text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Image className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Header */}
        {isComposerExpanded && (
        <div className="flex items-start gap-3 mb-2">
          <Avatar className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
              {profile?.display_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {/* Feeling Badge */}
            {feeling && (
              <div className="flex items-center gap-1 mb-2 text-sm">
                <span className="text-muted-foreground">
                  {profile?.display_name} is
                </span>
                <span className="font-medium">{feeling.emoji} {feeling.text}</span>
                <button onClick={clearFeeling} className="ml-1 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="flex-1 min-h-[44px] resize-none border-0 bg-secondary/50 focus-visible:ring-0 rounded-xl text-sm sm:text-base py-2"
            />
          </div>
        </div>
        )}

        {/* Media Preview */}
        {mediaFiles.length > 0 && (
          <div className={`mb-3 grid gap-2 ${
            mediaFiles.length === 1 ? 'grid-cols-1' :
            mediaFiles.length === 2 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {mediaFiles.map((media, idx) => (
              <div key={media.id ?? idx} className="relative rounded-lg overflow-hidden">
                {media.type === 'video' ? (
                  <video src={media.url} className="w-full aspect-video object-cover" />
                ) : media.type === 'pdf' ? (
                  <div className="flex items-center gap-2 p-3 bg-secondary">
                    <FileText className="w-8 h-8 text-destructive" />
                    <span className="text-sm truncate">PDF Document</span>
                  </div>
                ) : (
                  <img src={media.url} alt="" className="w-full aspect-square object-cover" />
                )}
                {media.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] pointer-events-none">
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-black/70 rounded-full text-white text-xs">
                      <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      {media.progress != null && media.progress > 0
                        ? `Uploading ${media.progress}%`
                        : 'Uploading…'}
                    </div>
                  </div>
                )}
                {media.failed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-destructive/70 text-white text-xs font-medium pointer-events-none">
                    Upload failed
                  </div>
                )}
                <button
                  onClick={() => removeMedia(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Poll Preview */}
        {pollQuestion && (
          <div className="mb-3 p-3 bg-secondary rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{pollQuestion}</span>
              </div>
              <button onClick={() => { setPollQuestion(''); setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]); setPollDuration('1d'); }}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="space-y-1 mb-2">
              {pollOptions.filter(o => o.text.trim()).map((opt, idx) => (
                <div key={opt.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border border-muted-foreground/50 flex-shrink-0" />
                  {opt.text}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {pollDuration === '1d' ? '1 Day' : pollDuration === '3d' ? '3 Days' : '1 Week'}
              </span>
            </div>
          </div>
        )}

        {/* Actions Row */}
        {isComposerExpanded && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Photo Input */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'photo')}
            />
            
            {/* Video Input */}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'video')}
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 px-2 gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Image className="w-5 h-5" />
              <span className="hidden sm:inline">Photo</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 px-2 gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Video className="w-5 h-5" />
              <span className="hidden sm:inline">Video</span>
            </Button>

            {/* Feelings/Activity Picker */}
            <Popover open={showFeelingPicker} onOpenChange={setShowFeelingPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                >
                  <Smile className="w-5 h-5" />
                  <span className="hidden sm:inline">Feeling</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                {!selectedActivity ? (
                  <>
                    <p className="text-sm font-medium mb-2">How are you feeling?</p>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {feelingsOptions.map((f) => (
                        <button
                          key={f.label}
                          onClick={() => handleSelectFeeling(f.emoji, f.label)}
                          className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary transition-colors"
                        >
                          <span className="text-2xl">{f.emoji}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">{f.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm font-medium mb-2">What are you doing?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {activitiesOptions.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => handleSelectActivity(a)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                        >
                          <span className="text-lg">{a.emoji}</span>
                          <span className="text-xs">{a.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedActivity.emoji}</span>
                      <span className="font-medium">{selectedActivity.label}</span>
                    </div>
                    {selectedActivity.placeholder && (
                      <Input
                        value={activityInput}
                        onChange={(e) => setActivityInput(e.target.value)}
                        placeholder={selectedActivity.placeholder}
                        className="text-sm"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedActivity(null)}>
                        Back
                      </Button>
                      <Button size="sm" onClick={confirmActivity}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPollDialog(true)}
              className="h-8 px-2 gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <BarChart2 className="w-5 h-5" />
              <span className="hidden sm:inline">Poll</span>
            </Button>

            <LocationPicker value={location || undefined} onChange={setLocation} />
          </div>

          <div className="flex items-center gap-2">
            {/* Privacy Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  {privacyOptions.find(p => p.value === privacy)?.icon}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Who can see this?</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {privacyOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => setPrivacy(option.value)}
                    className="gap-3"
                  >
                    <span className={privacy === option.value ? 'text-primary' : ''}>
                      {option.icon}
                    </span>
                    <div>
                      <p className={`font-medium ${privacy === option.value ? 'text-primary' : ''}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              size="icon"
              onClick={handleCreatePost}
              disabled={isSubmitting || isUploading || (!content.trim() && mediaFiles.length === 0 && !pollQuestion.trim())}
              className="h-8 w-8 bg-gradient-primary shadow-glow"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Poll Creation Dialog - Facebook Style */}
      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent className="w-[min(92vw,32rem)] max-h-[85vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-5 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Create a Poll
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-4 pb-4 sm:px-5 sm:pb-5">
            <div>
              <label className="text-sm font-medium">Question</label>
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="mt-2 h-11"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{pollQuestion.length}/200</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Options (2-4)</label>
              {pollOptions.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <div className="flex h-11 w-7 flex-shrink-0 items-center justify-center text-sm text-muted-foreground">
                    {idx + 1}.
                  </div>
                  <Input
                    value={opt.text}
                    onChange={(e) => updatePollOption(opt.id, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="h-11"
                    maxLength={100}
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePollOption(opt.id)}
                      className="h-11 w-11 flex-shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPollOption}
                  className="mt-2 h-11 w-full gap-2 border-dashed"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </Button>
              )}
            </div>

            {/* Poll Duration */}
            <div>
              <label className="text-sm font-medium">Poll Duration</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { value: '1d' as const, label: '1 Day' },
                  { value: '3d' as const, label: '3 Days' },
                  { value: '1w' as const, label: '1 Week' },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={pollDuration === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPollDuration(opt.value)}
                    className="h-10 w-full"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Poll Rules Info */}
            <div className="space-y-1 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              <p>• Single vote only - users can't change their vote</p>
              <p>• Results hidden until you vote</p>
              <p>• Poll can't be edited after publishing</p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setShowPollDialog(false)}>
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => setShowPollDialog(false)}
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.text.trim()).length < 2}
              >
                Add Poll
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
