import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Zap, Film } from "lucide-react";
import { useMyChannel } from "@/hooks/useChannels";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { PulseUploadDialog } from "./PulseUploadDialog";
import { LongVideoUploadDialog } from "./LongVideoUploadDialog";

interface UploadEntryDialogProps {
  trigger?: React.ReactNode;
}

export const UploadEntryDialog = ({ trigger }: UploadEntryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'pulse' | 'long' | null>(null);
  const { channel, isLoading: channelLoading } = useMyChannel();

  const handleSelectType = (type: 'pulse' | 'long') => {
    setUploadType(type);
    setOpen(false);
  };

  const handleCloseUpload = () => {
    setUploadType(null);
  };

  // Show channel creation if no channel exists
  if (!channelLoading && !channel) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="rounded-full">
              <Upload className="w-5 h-5" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a Channel First</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground mb-4">
            You need to create a channel before you can upload videos.
          </p>
          <CreateChannelDialog 
            trigger={<Button className="w-full">Create Channel</Button>}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="rounded-full">
              <Upload className="w-5 h-5" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Upload Video</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Pulse Video Option */}
            <button
              onClick={() => handleSelectType('pulse')}
              className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-border hover:border-accent hover:bg-accent/5 transition-all duration-200"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">Pulse Video</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  0-60 seconds • Vertical
                </p>
              </div>
            </button>

            {/* Normal/Long Video Option */}
            <button
              onClick={() => handleSelectType('long')}
              className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                <Film className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">Normal Video</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  1+ minutes • Horizontal
                </p>
              </div>
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Select the type of video you want to upload
          </p>
        </DialogContent>
      </Dialog>

      {/* Pulse Upload Dialog */}
      {uploadType === 'pulse' && (
        <PulseUploadDialog open={true} onClose={handleCloseUpload} />
      )}

      {/* Long Video Upload Dialog */}
      {uploadType === 'long' && (
        <LongVideoUploadDialog open={true} onClose={handleCloseUpload} />
      )}
    </>
  );
};
