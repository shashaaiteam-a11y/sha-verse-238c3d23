import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { triggerImageCompression } from '@/lib/compressImage';
import { compressImage } from '@/lib/media/compressImage';
import { Button } from '@/components/ui/button';
import { ImagePlus, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ImageUploadProps {
  bucket: 'avatars' | 'post-images';
  onUpload: (url: string) => void;
  currentImage?: string;
  onRemove?: () => void;
}

export const ImageUpload = ({ bucket, onUpload, currentImage, onRemove }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = await compressImage(event.target.files[0]);
      const fileExt = file.name.split('.').pop();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Background: generate optimized WebP variants (fire-and-forget, silent)
      triggerImageCompression(bucket, fileName);

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onUpload(data.publicUrl);

      toast({
        title: 'Image uploaded!',
        description: 'Your image has been uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      {currentImage && onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <label htmlFor={`upload-${bucket}`} className="cursor-pointer">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-3 hover:bg-secondary/80 transition-colors">
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? 'Uploading...' : currentImage ? 'Change Image' : 'Add Image'}
          </span>
        </div>
        <input
          id={`upload-${bucket}`}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  );
};
