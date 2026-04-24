import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { AVAILABLE_MODELS, NovaSettings } from '@/hooks/useNovaChat';

interface NovaChatSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: NovaSettings;
  onSave: (patch: Partial<NovaSettings>) => void;
  isSaving?: boolean;
}

const NovaChatSettingsDialog = ({
  open,
  onOpenChange,
  settings,
  onSave,
  isSaving,
}: NovaChatSettingsDialogProps) => {
  const [model, setModel] = useState(settings.preferred_model);
  const [systemPrompt, setSystemPrompt] = useState(settings.custom_system_prompt ?? '');
  const [memory, setMemory] = useState(settings.memory_facts ?? '');
  const [voice, setVoice] = useState(settings.voice_enabled);
  const [showReasoning, setShowReasoning] = useState(settings.show_reasoning);

  useEffect(() => {
    if (open) {
      setModel(settings.preferred_model);
      setSystemPrompt(settings.custom_system_prompt ?? '');
      setMemory(settings.memory_facts ?? '');
      setVoice(settings.voice_enabled);
      setShowReasoning(settings.show_reasoning);
    }
  }, [open, settings]);

  const handleSave = () => {
    onSave({
      preferred_model: model,
      custom_system_prompt: systemPrompt.trim() || null,
      memory_facts: memory.trim() || null,
      voice_enabled: voice,
      show_reasoning: showReasoning,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            NovaChat Settings
          </DialogTitle>
          <DialogDescription>
            Customize how NovaChat behaves for you. Changes apply to new messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">· {m.tag}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the AI brain that powers your conversations.
            </p>
          </div>

          {/* Custom system prompt */}
          <div className="space-y-2">
            <Label htmlFor="system">Custom Instructions</Label>
            <Textarea
              id="system"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. Always reply in Hindi. I prefer concise answers with bullet points."
              rows={4}
              maxLength={4000}
            />
            <p className="text-xs text-muted-foreground">
              These instructions are added to every chat. {systemPrompt.length}/4000
            </p>
          </div>

          {/* Memory */}
          <div className="space-y-2">
            <Label htmlFor="memory">Memory (Facts about you)</Label>
            <Textarea
              id="memory"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder="e.g. I'm a React developer building a social platform called SHA-VERSE. I like detailed code examples."
              rows={3}
              maxLength={4000}
            />
            <p className="text-xs text-muted-foreground">
              NovaChat remembers these across all conversations. {memory.length}/4000
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="voice" className="cursor-pointer">Voice replies</Label>
                <p className="text-xs text-muted-foreground">Read assistant replies aloud</p>
              </div>
              <Switch id="voice" checked={voice} onCheckedChange={setVoice} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reason" className="cursor-pointer">Show reasoning</Label>
                <p className="text-xs text-muted-foreground">Display model's thinking when available</p>
              </div>
              <Switch id="reason" checked={showReasoning} onCheckedChange={setShowReasoning} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NovaChatSettingsDialog;
