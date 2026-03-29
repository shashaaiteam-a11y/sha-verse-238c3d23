import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle } from 'lucide-react';
import { useUserSearch } from '@/hooks/useUserSearch';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatUserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (user: any) => void;
}

export const ChatUserSearchDialog = ({ open, onOpenChange, onSelectUser }: ChatUserSearchDialogProps) => {
  const { searchTerm, setSearchTerm, results, isLoading, clearSearch } = useUserSearch();

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      clearSearch();
    }
  };

  const handleSelectUser = (user: any) => {
    onSelectUser(user);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
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

          <ScrollArea className="max-h-80 pr-4">
            <div className="space-y-2">
              {isLoading && searchTerm.length >= 2 && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              )}

              {!isLoading && searchTerm.length >= 2 && results.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No users found
                </p>
              )}

              {searchTerm.length < 2 && (
                <p className="text-center text-muted-foreground py-8">
                  Type at least 2 characters to search
                </p>
              )}

              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                      {user.display_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
