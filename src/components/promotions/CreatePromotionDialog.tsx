import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, X } from 'lucide-react';
import { useCreatePromotion } from '@/hooks/useAppPromotions';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 30; // seconds

const CreatePromotionDialog = ({ open, onOpenChange }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useCreatePromotion();
  const { toast } = useToast();

  const reset = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCaption('');
    setLinkUrl('');
  };

  const handleFile = async (f: File) => {
    const isVideo = f.type.startsWith('video/');
    if (!isVideo && !f.type.startsWith('image/')) {
      toast({ title: 'Only image or video allowed', variant: 'destructive' });
      return;
    }
    if (isVideo && f.size > MAX_VIDEO_BYTES) {
      toast({ title: 'Video must be under 50MB', variant: 'destructive' });
      return;
    }
    if (!isVideo && f.size > MAX_IMAGE_BYTES) {
      toast({ title: 'Image must be under 8MB', variant: 'destructive' });
      return;
    }
    // Validate video duration ≤ 30s
    if (isVideo) {
      const ok = await new Promise<boolean>((resolve) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => resolve(v.duration <= MAX_VIDEO_DURATION);
        v.onerror = () => resolve(false);
        v.src = URL.createObjectURL(f);
      });
      if (!ok) {
        toast({ title: 'Video must be ≤ 30 seconds', variant: 'destructive' });
        return;
      }
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    try {
      await create.mutateAsync({ file, caption: caption.trim(), linkUrl: linkUrl.trim() });
      toast({ title: 'Promotion published', description: 'Live for 24 hours.' });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Failed to publish',
        description: err?.message || 'Try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New App Promotion</DialogTitle>
          <DialogDescription>
            Owner-only paid promotion shown as a status on the Sha-Verse logo for 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload image or video (≤30s)</span>
            </button>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {file.type.startsWith('video/') ? (
                <video src={preview!} className="w-full h-full object-contain" controls />
              ) : (
                <img src={preview!} alt="" className="w-full h-full object-contain" />
              )}
              <button
                type="button"
                onClick={reset}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />

          <div className="space-y-1.5">
            <Label htmlFor="promo-caption">Caption (optional)</Label>
            <Textarea
              id="promo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Short pitch shown over the media"
              maxLength={140}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promo-link">Link URL (optional)</Label>
            <Input
              id="promo-link"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!file || create.isPending}
            className="w-full"
          >
            {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Publish promotion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePromotionDialog;
