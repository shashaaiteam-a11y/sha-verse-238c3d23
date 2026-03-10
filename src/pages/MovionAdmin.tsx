import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft,
  Shield,
  Video,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Ban,
  Eye,
  Clock,
  Copyright,
  TrendingUp,
  Users,
  Play
} from "lucide-react";
import { MovionHeader } from "@/components/movion/MovionHeader";
import { usePendingChannels, useApproveChannel, useRejectChannel } from "@/hooks/useChannelApproval";
import { usePendingVideoRequests, useApproveVideoRequest, useRejectVideoRequest } from "@/hooks/useVideoManagement";
import { useCopyrightClaims, useResolveCopyrightClaim } from "@/hooks/useCopyrightSystem";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MovionAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("channels");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [copyrightAction, setCopyrightAction] = useState<string>("");

  // Data hooks
  const { pendingChannels, isLoading: channelsLoading } = usePendingChannels();
  const { pendingRequests, isLoading: requestsLoading } = usePendingVideoRequests();
  const { data: copyrightClaims, isLoading: claimsLoading } = useCopyrightClaims();

  // Action hooks
  const approveChannel = useApproveChannel();
  const rejectChannel = useRejectChannel();
  const approveVideoRequest = useApproveVideoRequest();
  const rejectVideoRequest = useRejectVideoRequest();
  const resolveClaim = useResolveCopyrightClaim();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Admin access required</p>
            <Button onClick={() => navigate('/auth')} className="mt-4">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleApproveChannel = async (channelId: string) => {
    try {
      await approveChannel.mutateAsync({ channelId });
    } catch {
      toast.error("Failed to approve channel");
    }
  };

  const handleRejectChannel = async (channelId: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      await rejectChannel.mutateAsync({ channelId, reason: rejectReason });
      setRejectReason("");
      setSelectedItem(null);
    } catch {
      toast.error("Failed to reject channel");
    }
  };

  const handleApproveVideoRequest = async (requestId: string) => {
    try {
      await approveVideoRequest.mutateAsync({ requestId });
    } catch {
      toast.error("Failed to approve request");
    }
  };

  const handleRejectVideoRequest = async (requestId: string) => {
    try {
      await rejectVideoRequest.mutateAsync({ requestId, notes: "Rejected by admin" });
    } catch {
      toast.error("Failed to reject request");
    }
  };

  const handleResolveClaim = async (claimId: string, status: 'approved' | 'rejected') => {
    try {
      await resolveClaim.mutateAsync({
        claimId,
        status,
        action: copyrightAction as any,
        notes: rejectReason,
      });
      setRejectReason("");
      setCopyrightAction("");
      setSelectedItem(null);
    } catch {
      toast.error("Failed to resolve claim");
    }
  };

  // Stats
  const stats = {
    pendingChannels: pendingChannels?.length || 0,
    pendingRequests: pendingRequests?.length || 0,
    pendingClaims: copyrightClaims?.filter((c: any) => c.status === 'pending').length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <MovionHeader onSearch={() => {}} onMenuClick={() => {}} />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/movion')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              MOVION Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage channels, videos, and content moderation</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Users className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingChannels}</p>
                <p className="text-sm text-muted-foreground">Pending Channels</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Video className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                <p className="text-sm text-muted-foreground">Video Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-red-500/10">
                <Copyright className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingClaims}</p>
                <p className="text-sm text-muted-foreground">Copyright Claims</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="channels" className="gap-2">
              <Users className="w-4 h-4" /> Channels
              {stats.pendingChannels > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.pendingChannels}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="w-4 h-4" /> Video Requests
              {stats.pendingRequests > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.pendingRequests}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="copyright" className="gap-2">
              <Copyright className="w-4 h-4" /> Copyright
              {stats.pendingClaims > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.pendingClaims}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="monetization" className="gap-2">
              <DollarSign className="w-4 h-4" /> Monetization
            </TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels">
            <Card>
              <CardHeader>
                <CardTitle>Pending Channel Approvals</CardTitle>
                <CardDescription>Review and approve new channel creation requests</CardDescription>
              </CardHeader>
              <CardContent>
                {channelsLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : pendingChannels && pendingChannels.length > 0 ? (
                  <div className="space-y-4">
                    {pendingChannels.map((channel: any) => (
                      <div key={channel.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={channel.avatar_url} />
                          <AvatarFallback>{channel.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{channel.name}</h3>
                            <Badge variant="outline">{channel.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            @{channel.username} • Created {new Date(channel.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveChannel(channel.id)}
                            disabled={approveChannel.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setSelectedItem({ type: 'channel', data: channel })}
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No pending channel approvals</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Requests Tab */}
          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <CardTitle>Video Management Requests</CardTitle>
                <CardDescription>Review edit and delete requests from creators</CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : pendingRequests && pendingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRequests.map((request: any) => (
                      <div key={request.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="w-24 h-16 rounded bg-muted flex items-center justify-center">
                          <Play className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={request.request_type === 'delete' ? 'destructive' : 'default'}>
                              {request.request_type}
                            </Badge>
                            <span className="font-medium">{request.video_id}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                          {request.proposed_changes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Changes: {JSON.stringify(request.proposed_changes)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveVideoRequest(request.id)}
                            disabled={approveVideoRequest.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectVideoRequest(request.id)}
                            disabled={rejectVideoRequest.isPending}
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No pending video requests</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Copyright Tab */}
          <TabsContent value="copyright">
            <Card>
              <CardHeader>
                <CardTitle>Copyright Claims</CardTitle>
                <CardDescription>Review and resolve copyright disputes</CardDescription>
              </CardHeader>
              <CardContent>
                {claimsLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : copyrightClaims && copyrightClaims.length > 0 ? (
                  <div className="space-y-4">
                    {copyrightClaims.map((claim: any) => (
                      <div key={claim.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="p-3 rounded-full bg-red-500/10">
                          <Copyright className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              claim.status === 'pending' ? 'default' :
                              claim.status === 'approved' ? 'destructive' : 'secondary'
                            }>
                              {claim.status}
                            </Badge>
                            {claim.match_percentage && (
                              <span className="text-sm text-muted-foreground">
                                {claim.match_percentage}% match
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium mt-1">
                            Video: {claim.videos?.title || claim.video_id}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Claimed: {new Date(claim.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {claim.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => setSelectedItem({ type: 'copyright', data: claim })}
                            >
                              <Eye className="w-4 h-4 mr-1" /> Review
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No copyright claims</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monetization Tab */}
          <TabsContent value="monetization">
            <Card>
              <CardHeader>
                <CardTitle>Monetization Overview</CardTitle>
                <CardDescription>Revenue split and payout management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 border rounded-lg">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Revenue Split
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Creator Share</span>
                        <span className="font-bold text-green-500">55%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Platform Share</span>
                        <span className="font-bold text-primary">45%</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border rounded-lg">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-yellow-500" />
                      Payout Schedule
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Payout Cycle</span>
                        <span className="font-medium">Monthly</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Minimum Payout</span>
                        <span className="font-medium">$100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Rejection Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.type === 'channel' ? 'Reject Channel' : 'Resolve Copyright Claim'}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.type === 'channel' 
                ? 'Provide a reason for rejecting this channel'
                : 'Choose an action and provide notes'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedItem?.type === 'copyright' && (
              <Select value={copyrightAction} onValueChange={setCopyrightAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block Video</SelectItem>
                  <SelectItem value="monetize">Monetize for Claimant</SelectItem>
                  <SelectItem value="share_revenue">Share Revenue</SelectItem>
                  <SelectItem value="mute_audio">Mute Audio</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={selectedItem?.type === 'channel' ? "Rejection reason..." : "Admin notes..."}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              {selectedItem?.type === 'channel' ? (
                <Button 
                  variant="destructive"
                  onClick={() => handleRejectChannel(selectedItem.data.id)}
                  disabled={rejectChannel.isPending}
                >
                  Reject Channel
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="destructive"
                    onClick={() => handleResolveClaim(selectedItem?.data?.id, 'approved')}
                    disabled={resolveClaim.isPending}
                  >
                    Uphold Claim
                  </Button>
                  <Button 
                    onClick={() => handleResolveClaim(selectedItem?.data?.id, 'rejected')}
                    disabled={resolveClaim.isPending}
                  >
                    Reject Claim
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MovionAdmin;
