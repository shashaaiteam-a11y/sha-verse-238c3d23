import { useState } from 'react';
import { Image, Send, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { usePage } from '@/hooks/usePages';
import { toast } from 'sonner';

interface CreatePagePostProps {
  pageId: string;
}

const CreatePagePost = ({ pageId }: CreatePagePostProps) => {
  const { createPost } = usePage(pageId);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please write something');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `page-post-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      await createPost.mutateAsync({
        content: content.trim(),
        image_url: imageUrl || undefined,
        scheduled_at: scheduledAt || undefined
      });

      // Reset form
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setScheduledAt('');
      setShowSchedule(false);
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What would you like to share?"
          rows={3}
          className="resize-none mb-3"
        />

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative mb-3">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="rounded-lg max-h-64 w-full object-cover"
            />
            <Button 
              variant="destructive" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              Remove
            </Button>
          </div>
        )}

        {/* Schedule */}
        {showSchedule && (
          <div className="mb-3 p-3 bg-muted rounded-lg">
            <Label className="text-sm">Schedule for later</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mt-1"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <label>
              <Button variant="ghost" size="sm" asChild>
                <span>
                  <Image className="h-4 w-4 mr-2" />
                  Photo
                </span>
              </Button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageChange}
              />
            </label>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSchedule(!showSchedule)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {scheduledAt ? 'Schedule' : 'Post'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePagePost;
