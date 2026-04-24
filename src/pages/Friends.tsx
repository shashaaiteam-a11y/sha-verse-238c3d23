import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Check, X, MessageCircle, Phone, Video } from "lucide-react";
import { useFriends } from '@/hooks/useFriends';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import { useCall } from '@/modules/chats/components/CallProvider';

const Friends = () => {
  const navigate = useNavigate();
  const { startCall } = useCall();
  const {
    friends,
    friendsLoading,
    pendingRequests,
    requestsLoading,
    sentRequests,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
  } = useFriends();

  const handleStartChat = (friend: any) => {
    // Navigate to Messages page with friend's user ID
    navigate(`/messages?userId=${friend.profiles?.id}`);
  };

  // Check if friend is blocked (this would need to be implemented)
  const isFriendBlocked = (friendId: string) => {
    // This would check if the friend is in the blocked users list
    return false; // Placeholder - would need to integrate with useProfileSettings
  };

  if (friendsLoading || requestsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Friends
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-9 sm:h-10">
            <TabsTrigger value="friends" className="text-xs sm:text-sm px-1 sm:px-3">
              Friends {friends && `(${friends.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs sm:text-sm px-1 sm:px-3">
              Requests {pendingRequests && pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="sent" className="text-xs sm:text-sm px-1 sm:px-3">
              Sent {sentRequests && sentRequests.length > 0 && `(${sentRequests.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-2 sm:space-y-3">
            {friends && friends.length > 0 ? (
              friends.map((friendship: any) => (
                <Card key={friendship.id} className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        {friendship.profiles?.avatar_url && (
                          <AvatarImage src={friendship.profiles.avatar_url} />
                        )}
                        <AvatarFallback className="bg-gradient-primary text-white text-sm">
                          {friendship.profiles?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{friendship.profiles?.display_name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">@{friendship.profiles?.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs sm:text-sm h-8 sm:h-9 bg-primary"
                        onClick={() => handleStartChat(friendship)}
                      >
                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Message</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        title="Voice call"
                        onClick={() => friendship.profiles && startCall({
                          id: friendship.profiles.id,
                          display_name: friendship.profiles.display_name || 'User',
                          avatar_url: friendship.profiles.avatar_url,
                        }, 'voice')}
                      >
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        title="Video call"
                        onClick={() => friendship.profiles && startCall({
                          id: friendship.profiles.id,
                          display_name: friendship.profiles.display_name || 'User',
                          avatar_url: friendship.profiles.avatar_url,
                        }, 'video')}
                      >
                        <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => removeFriend.mutate(friendship.id)}
                      >
                        <UserMinus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 sm:p-8 text-center">
                <UserPlus className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                <p className="text-sm sm:text-base text-muted-foreground">No friends yet. Start adding friends!</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-2 sm:space-y-3">
            {pendingRequests && pendingRequests.length > 0 ? (
              pendingRequests.map((request: any) => (
                <Card key={request.id} className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        {request.profiles?.avatar_url && (
                          <AvatarImage src={request.profiles.avatar_url} />
                        )}
                        <AvatarFallback className="bg-gradient-primary text-white text-sm">
                          {request.profiles?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{request.profiles?.display_name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">@{request.profiles?.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-gradient-primary text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => acceptFriendRequest.mutate(request.id)}
                      >
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Accept</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 sm:h-9 px-2 sm:px-3"
                        onClick={() => declineFriendRequest.mutate(request.id)}
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 sm:p-8 text-center">
                <p className="text-sm sm:text-base text-muted-foreground">No pending friend requests</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-2 sm:space-y-3">
            {sentRequests && sentRequests.length > 0 ? (
              sentRequests.map((request: any) => (
                <Card key={request.id} className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        {request.profiles?.avatar_url && (
                          <AvatarImage src={request.profiles.avatar_url} />
                        )}
                        <AvatarFallback className="bg-gradient-primary text-white text-sm">
                          {request.profiles?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{request.profiles?.display_name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">@{request.profiles?.username}</p>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">Pending...</span>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 sm:p-8 text-center">
                <p className="text-sm sm:text-base text-muted-foreground">No sent requests</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Friends;
