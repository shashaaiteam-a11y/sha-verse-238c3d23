import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { triggerImageCompression } from '@/lib/compressImage';
import { compressImage } from '@/lib/media/compressImage';
import { Button } from '@/components/ui/button';
import { Camera, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProfileImageUploadProps {
  type: 'avatar' | 'cover';
  onUpload: (url: string) => void;
  onRemove?: () => void;
  hasImage?: boolean;
  disabled?: boolean;
}

export const ProfileImageUpload = ({ type, onUpload, onRemove, hasImage = false, disabled }: ProfileImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

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

      // Use different prefixes for avatar and cover to ensure uniqueness
      const prefix = type === 'avatar' ? 'avatar' : 'cover';
      const fileName = `${user.id}/${prefix}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Background: generate optimized WebP variants (fire-and-forget, silent)
      triggerImageCompression('avatars', fileName);

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      onUpload(data.publicUrl);

      toast({
        title: type === 'avatar' ? 'Profile photo updated!' : 'Cover photo updated!',
        description: 'Your image has been updated successfully',
      });

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
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

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (type === 'avatar') {
    return (
      <div className="relative inline-flex items-center gap-1">
        {hasImage && onRemove && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-8 w-8 rounded-full shadow-md"
            onClick={onRemove}
            disabled={disabled || uploading}
            title="Remove profile photo"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full shadow-md"
          onClick={handleClick}
          disabled={disabled || uploading}
        >
          <Camera className="h-4 w-4" />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading || disabled}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      {hasImage && onRemove && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-9 w-9 shadow-md"
          onClick={onRemove}
          disabled={disabled || uploading}
          title="Remove cover photo"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-2 shadow-md"
        onClick={handleClick}
        disabled={disabled || uploading}
      >
        <Camera className="h-4 w-4" />
        <span className="hidden sm:inline">
          {uploading ? 'Uploading...' : 'Edit Cover'}
        </span>
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading || disabled}
        className="hidden"
      />
    </div>
  );
};
