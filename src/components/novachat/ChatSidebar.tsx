import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus, MessageSquare, Trash2, Loader2, Search,
  MoreHorizontal, Pencil, Check, X, Crown, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Conversation } from '@/hooks/useNovaChat';
import { formatDistanceToNow } from 'date-fns';
import NovaChatSidebarAd from './NovaChatSidebarAd';

interface ChatSidebarProps {
  conversations: Conversation[] | undefined;
  isLoading: boolean;
  currentConversationId: string | null;
  user: any;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onPrefetchConversation?: (id: string) => void;
  usage?: { is_pro: boolean; used: number; limit: number };
  onUpgradeClick?: () => void;
}

const ChatSidebar = ({
  conversations,
  isLoading,
  currentConversationId,
  user,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  usage,
  onUpgradeClick,
}: ChatSidebarProps) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatConversationTitle = (title?: string | null) => {
    const fallback = 'New Chat';
    const normalized = title?.trim() || fallback;
    const words = normalized.split(/\s+/).filter(Boolean);
    if (!words.length) return fallback;
    const preview = words.slice(0, 3).join(' ');
    return `${preview} ...`;
  };

  const filteredConversations = conversations?.filter(c => 
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  // Group conversations by date
  const groupedConversations = filteredConversations?.reduce((acc, conv) => {
    const date = new Date(conv.updated_at || conv.created_at);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    let group = 'Older';
    if (days === 0) group = 'Today';
    else if (days === 1) group = 'Yesterday';
    else if (days < 7) group = 'Previous 7 Days';
    else if (days < 30) group = 'Previous 30 Days';
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title || '');
  };

  const saveEdit = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 border-b border-border flex-shrink-0" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}>
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground h-9 sm:h-11 text-sm"
        >
          <Plus className="w-4 h-4" />
          New chat
        </Button>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 sm:pl-9 h-8 sm:h-9 bg-secondary/50 border-0 text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : groupedConversations && Object.keys(groupedConversations).length > 0 ? (
            groupOrder.map(group => {
              const convs = groupedConversations[group];
              if (!convs?.length) return null;
              
              return (
                <div key={group} className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    {group}
                  </h3>
                  <div className="space-y-0.5">
                    {convs.map((conv, convIdx) => (
                      <div key={conv.id}>
                      <div
                        className={cn(
                          "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                          currentConversationId === conv.id 
                            ? "bg-secondary text-secondary-foreground" 
                            : "hover:bg-secondary/50"
                        )}
                        onClick={() => editingId !== conv.id && onSelectConversation(conv.id)}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        
                        {editingId === conv.id ? (
                          <div className="flex-1 flex items-center gap-1">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(conv.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="h-7 text-sm flex-1"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6"
                                onClick={(e) => { e.stopPropagation(); saveEdit(conv.id); }}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6"
                                onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="truncate text-sm">{formatConversationTitle(conv.title)}</span>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-6 h-6 flex-shrink-0 opacity-60 hover:opacity-100 hover:bg-accent rounded-full transition-all"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEditing(conv); }}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id); }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="flex-1" />
                          </>
                        )}
                      </div>
                      {/* Native ad after every 4th conversation in this group */}
                      {(convIdx + 1) % 4 === 0 && convIdx !== convs.length - 1 && (
                        <NovaChatSidebarAd />
                      )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start a new chat to begin</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer: Usage + Upgrade + User */}
      <div className="p-2 sm:p-3 border-t border-border flex-shrink-0 space-y-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Usage indicator (free users only) */}
        {usage && !usage.is_pro && (
          <div className="px-2 py-1.5 rounded-lg bg-secondary/40 border border-border/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                Daily messages
              </span>
              <span className="text-[10px] sm:text-xs font-semibold tabular-nums">
                {usage.used} / {usage.limit}
              </span>
            </div>
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  usage.used >= usage.limit
                    ? "bg-destructive"
                    : "bg-gradient-to-r from-primary to-primary/60"
                )}
                style={{
                  width: `${Math.min(100, (usage.used / Math.max(usage.limit, 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Upgrade to Pro button */}
        {onUpgradeClick && (
          <Button
            onClick={onUpgradeClick}
            className={cn(
              "w-full justify-start gap-2 h-9 sm:h-10 text-xs sm:text-sm",
              usage?.is_pro
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90"
            )}
          >
            {usage?.is_pro ? (
              <>
                <Crown className="w-4 h-4" />
                Pro plan active
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Upgrade to Pro
              </>
            )}
          </Button>
        )}

        {/* User info */}
        <div className="flex items-center gap-2 sm:gap-3 px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
          <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[10px] sm:text-xs">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium truncate">{user?.email}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {usage?.is_pro ? 'Pro plan' : 'Free plan'}
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatSidebar;
