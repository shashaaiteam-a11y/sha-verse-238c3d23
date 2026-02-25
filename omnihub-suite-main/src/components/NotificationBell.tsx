import { useState } from "react";
import { Bell, Heart, MessageCircle, UserPlus, FileText, Check, Video, BookOpen, Users, PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
      case "reaction":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "friend_request":
      case "friend_accepted":
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case "new_post":
      case "group_post":
        return <FileText className="w-4 h-4 text-purple-500" />;
      case "new_video":
        return <Video className="w-4 h-4 text-red-500" />;
      case "new_book":
        return <BookOpen className="w-4 h-4 text-amber-500" />;
      case "group_joined":
      case "group_invite":
        return <Users className="w-4 h-4 text-blue-500" />;
      case "channel_subscribe":
        return <PlayCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead.mutate(notification.id);
    
    // Navigate based on notification type and data
    const data = notification.data || {};
    
    if (notification.type === 'new_video' && data.video_id) {
      navigate(`/movion/watch/${data.video_id}`);
    } else if (notification.type === 'new_book' && data.book_id) {
      navigate(`/bookshelf/${data.book_id}`);
    } else if ((notification.type === 'group_post' || notification.type === 'group_joined') && data.group_id) {
      navigate(`/groups/${data.group_id}`);
    } else if (notification.type === 'channel_subscribe' && data.channel_id) {
      navigate(`/movion/channel/${data.channel_id}`);
    } else if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      navigate(`/profile/${data.user_id}`);
    } else if (data.post_id) {
      navigate(`/`);
    } else if (data.user_id) {
      navigate(`/profile/${data.user_id}`);
    }
    
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              className="text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 flex gap-3 group hover:bg-accent transition-colors ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div 
                    onClick={() => handleNotificationClick(notification)}
                    className="flex-1 flex gap-3 cursor-pointer min-w-0"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {notification.data?.avatar_url ? (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={notification.data.avatar_url} />
                          <AvatarFallback>{getIcon(notification.type)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        getIcon(notification.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0">
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate(notification.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
