import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TranscodingStatusProps {
  status: string;
  progress?: number;
}

export const TranscodingStatus = ({ status, progress = 0 }: TranscodingStatusProps) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4 text-yellow-500" />,
          text: 'Queued for processing',
          color: 'text-yellow-500',
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
          text: `Processing: ${progress}%`,
          color: 'text-blue-500',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
          text: 'Ready in all qualities',
          color: 'text-green-500',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4 text-red-500" />,
          text: 'Processing failed',
          color: 'text-red-500',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-muted-foreground" />,
          text: 'Original quality only',
          color: 'text-muted-foreground',
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      {display.icon}
      <div className="flex-1">
        <p className={`text-sm font-medium ${display.color}`}>{display.text}</p>
        {status === 'processing' && (
          <Progress value={progress} className="h-1 mt-2" />
        )}
        {status === 'completed' && (
          <p className="text-xs text-muted-foreground mt-1">
            Available in 360p, 720p, 1080p
          </p>
        )}
      </div>
    </div>
  );
};
