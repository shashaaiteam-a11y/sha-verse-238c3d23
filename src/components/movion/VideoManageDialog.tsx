import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings2, Trash2, Edit3, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useSubmitVideoEditRequest, useSubmitVideoDeleteRequest, useVideoManagementRequests } from "@/hooks/useVideoManagement";
import { format } from "date-fns";

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  channel_id: string;
}

interface VideoManageDialogProps {
  video: Video;
  trigger?: React.ReactNode;
}

export const VideoManageDialog = ({ video, trigger }: VideoManageDialogProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");
  
  // Edit form state
  const [newTitle, setNewTitle] = useState(video.title);
  const [newDescription, setNewDescription] = useState(video.description || "");
  const [editReason, setEditReason] = useState("");
  
  // Delete form state
  const [deleteReason, setDeleteReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

  const submitEditRequest = useSubmitVideoEditRequest();
  const submitDeleteRequest = useSubmitVideoDeleteRequest();
  const { requests } = useVideoManagementRequests(video.channel_id);

  const videoRequests = requests?.filter(r => r.video_id === video.id) || [];

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReason.trim()) return;

    await submitEditRequest.mutateAsync({
      videoId: video.id,
      channelId: video.channel_id,
      reason: editReason,
      proposedChanges: {
        title: newTitle !== video.title ? newTitle : undefined,
        description: newDescription !== video.description ? newDescription : undefined,
      },
    });

    setOpen(false);
    setEditReason("");
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim() || confirmDelete !== "DELETE") return;

    await submitDeleteRequest.mutateAsync({
      videoId: video.id,
      channelId: video.channel_id,
      reason: deleteReason,
    });

    setOpen(false);
    setDeleteReason("");
    setConfirmDelete("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Manage
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Manage Video
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <AlertDescription className="text-sm">
            All changes require admin approval and will be reviewed within 24-72 hours.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="edit" className="gap-1">
              <Edit3 className="w-3 h-3" /> Edit
            </TabsTrigger>
            <TabsTrigger value="delete" className="gap-1 text-red-500 data-[state=active]:text-red-500">
              <Trash2 className="w-3 h-3" /> Delete
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <Clock className="w-3 h-3" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">New Title</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">New Description</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="editReason">Reason for Edit *</Label>
                <Textarea
                  id="editReason"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Explain why you want to make these changes..."
                  className="mt-1 resize-none"
                  rows={2}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={submitEditRequest.isPending || !editReason.trim()}
              >
                {submitEditRequest.isPending ? "Submitting..." : "Submit Edit Request"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="delete" className="space-y-4 mt-4">
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Once approved, the video will be permanently deleted within 24 hours. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div>
                <Label htmlFor="deleteReason">Reason for Deletion *</Label>
                <Textarea
                  id="deleteReason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Explain why you want to delete this video..."
                  className="mt-1 resize-none"
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmDelete">Type DELETE to confirm *</Label>
                <Input
                  id="confirmDelete"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder="DELETE"
                  className="mt-1"
                />
              </div>

              <Button 
                type="submit" 
                variant="destructive"
                className="w-full"
                disabled={submitDeleteRequest.isPending || !deleteReason.trim() || confirmDelete !== "DELETE"}
              >
                {submitDeleteRequest.isPending ? "Submitting..." : "Submit Delete Request"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {videoRequests.length > 0 ? (
              <div className="space-y-3">
                {videoRequests.map((request) => (
                  <Card key={request.id} className="bg-muted/30">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {request.request_type === 'edit' ? (
                            <Edit3 className="w-4 h-4" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                          {request.request_type === 'edit' ? 'Edit Request' : 'Delete Request'}
                        </CardTitle>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 px-4">
                      <p className="text-sm text-muted-foreground">{request.reason}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {request.admin_notes && (
                        <p className="text-sm mt-2 p-2 rounded bg-muted">
                          <span className="font-medium">Admin Note:</span> {request.admin_notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No management requests yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
