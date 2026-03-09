import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, UserCheck, Clock } from 'lucide-react';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useFriends } from '@/hooks/useFriends';
import { useNavigate } from 'react-router-dom';

export const UserSearchDialog = () => {
  const [open, setOpen] = useState(false);
  const { searchTerm, setSearchTerm, results, isLoading, clearSearch } = useUserSearch();
  const { sendFriendRequest } = useFriends();
  const navigate = useNavigate();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      clearSearch();
    }
  };

  const handleProfileClick = (userId: string) => {
    setOpen(false);
    navigate(`/profile/${userId}`);
  };

  const getStatusButton = (user: any) => {
    if (user.friendshipStatus === 'accepted') {
      return (
        <Button size="sm" variant="outline" disabled className="flex-shrink-0">
          <UserCheck className="w-4 h-4 mr-1" />
          Friends
        </Button>
      );
    }
    if (user.friendshipStatus === 'pending') {
      return (
        <Button size="sm" variant="outline" disabled className="flex-shrink-0">
          <Clock className="w-4 h-4 mr-1" />
          Pending
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        className="bg-gradient-primary flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          sendFriendRequest.mutate(user.id);
        }}
        disabled={sendFriendRequest.isPending}
      >
        <UserPlus className="w-4 h-4 mr-1" />
        Add
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Search className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or username..."
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {isLoading && searchTerm.length >= 2 && (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}

            {!isLoading && searchTerm.length >= 2 && results.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No users found
              </p>
            )}

            {searchTerm.length < 2 && (
              <p className="text-center text-muted-foreground py-4">
                Type at least 2 characters to search
              </p>
            )}

            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                onClick={() => handleProfileClick(user.id)}
              >
                <Avatar className="h-12 w-12">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {user.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user.display_name}</p>
                  <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                </div>
                {getStatusButton(user)}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
