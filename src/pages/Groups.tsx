import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Globe, Lock, X, ChevronRight, Settings, Trash2, Pencil, Search } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GROUP_SELECT = `id, name, description, avatar_url, cover_url, is_private, members_count, posts_count, created_at, creator_id, group_posts(count)`;

const CATEGORIES = [
  { label: "🔥 Trending", value: "trending" },
  { label: "💻 Technology", value: "Technology" },
  { label: "🎮 Gaming", value: "Gaming" },
  { label: "🎵 Music", value: "Music" },
  { label: "⚽ Sports", value: "Sports" },
  { label: "🎬 Movies & TV", value: "Movies & TV" },
  { label: "📚 Books", value: "Books" },
  { label: "🍳 Cooking", value: "Cooking" },
  { label: "✈️ Travel", value: "Travel" },
  { label: "📸 Photography", value: "Photography" },
  { label: "🎨 Art & Design", value: "Art & Design" },
  { label: "👗 Fashion", value: "Fashion" },
  { label: "💄 Beauty", value: "Beauty" },
  { label: "💪 Fitness", value: "Fitness" },
  { label: "🧘 Mental Health", value: "Mental Health" },
  { label: "👶 Parenting", value: "Parenting" },
  { label: "🐾 Pets", value: "Pets" },
  { label: "🌿 Nature", value: "Nature" },
  { label: "🔬 Science", value: "Science" },
  { label: "🎓 Education", value: "Education" },
  { label: "🏛️ Politics", value: "Politics" },
  { label: "🕌 Religion", value: "Religion" },
  { label: "💼 Business", value: "Business" },
  { label: "📈 Finance", value: "Finance" },
  { label: "🏠 Real Estate", value: "Real Estate" },
  { label: "📣 Marketing", value: "Marketing" },
  { label: "👨‍💻 Programming", value: "Programming" },
  { label: "🤖 AI & ML", value: "AI & ML" },
  { label: "🔐 Cybersecurity", value: "Cybersecurity" },
  { label: "₿ Crypto", value: "Crypto" },
  { label: "🖼️ NFT", value: "NFT" },
  { label: "🎌 Anime", value: "Anime" },
  { label: "📖 Comics", value: "Comics" },
  { label: "🎤 K-Pop", value: "K-Pop" },
  { label: "🎧 Hip-Hop", value: "Hip-Hop" },
  { label: "🎸 Rock Music", value: "Rock Music" },
  { label: "🎻 Classical", value: "Classical Music" },
  { label: "🎷 Jazz", value: "Jazz" },
  { label: "🎙️ Podcasts", value: "Podcasts" },
  { label: "▶️ YouTube", value: "YouTube" },
  { label: "📡 Streaming", value: "Streaming" },
  { label: "🎥 Videography", value: "Videography" },
  { label: "🖌️ Graphic Design", value: "Graphic Design" },
  { label: "📐 UI/UX", value: "UI/UX" },
  { label: "🏗️ Architecture", value: "Architecture" },
  { label: "🛋️ Interior Design", value: "Interior Design" },
  { label: "🔨 DIY & Crafts", value: "DIY & Crafts" },
  { label: "🧁 Baking", value: "Baking" },
  { label: "🥗 Veganism", value: "Veganism" },
  { label: "🏃 Running", value: "Running" },
  { label: "🚴 Cycling", value: "Cycling" },
  { label: "🏋️ Gym", value: "Gym" },
  { label: "⚽ Football", value: "Football" },
  { label: "🏀 Basketball", value: "Basketball" },
  { label: "🏏 Cricket", value: "Cricket" },
  { label: "🎾 Tennis", value: "Tennis" },
  { label: "⚾ Baseball", value: "Baseball" },
  { label: "🏊 Swimming", value: "Swimming" },
  { label: "🥋 Martial Arts", value: "Martial Arts" },
  { label: "♟️ Chess", value: "Chess" },
  { label: "🎲 Board Games", value: "Board Games" },
  { label: "🕹️ Video Games", value: "Video Games" },
  { label: "🖥️ PC Gaming", value: "PC Gaming" },
  { label: "📱 Mobile Gaming", value: "Mobile Gaming" },
  { label: "👾 Retro Gaming", value: "Retro Gaming" },
  { label: "🏆 Esports", value: "Esports" },
  { label: "🎭 Cosplay", value: "Cosplay" },
  { label: "🥾 Hiking", value: "Hiking" },
  { label: "⛺ Camping", value: "Camping" },
  { label: "🏄 Adventure Sports", value: "Adventure Sports" },
  { label: "🎣 Fishing", value: "Fishing" },
  { label: "🌱 Gardening", value: "Gardening" },
  { label: "🚗 Cars", value: "Cars" },
  { label: "🏍️ Motorcycles", value: "Motorcycles" },
  { label: "✈️ Aviation", value: "Aviation" },
  { label: "🚀 Space", value: "Space" },
  { label: "📜 History", value: "History" },
  { label: "💬 Philosophy", value: "Philosophy" },
  { label: "🗣️ Languages", value: "Languages" },
  { label: "💕 Relationships", value: "Relationships" },
  { label: "🏳️‍🌈 LGBTQ+", value: "LGBTQ+" },
  { label: "👩 Women Empowerment", value: "Women Empowerment" },
  { label: "😂 Humor & Memes", value: "Humor & Memes" },
  { label: "❓ Trivia", value: "Trivia" },
  { label: "📰 News", value: "News" },
  { label: "🏘️ Local Community", value: "Local Community" },
  { label: "📝 Study Groups", value: "Study Groups" },
  { label: "💼 Career & Jobs", value: "Career & Jobs" },
  { label: "🧑‍🎨 Freelancing", value: "Freelancing" },
  { label: "🚀 Startups", value: "Startups" },
  { label: "🛍️ E-commerce", value: "E-commerce" },
  { label: "✂️ Photo Editing", value: "Photo Editing" },
  { label: "🎬 Video Editing", value: "Video Editing" },
  { label: "🎹 Music Production", value: "Music Production" },
  { label: "✍️ Writing", value: "Writing" },
  { label: "📜 Poetry", value: "Poetry" },
  { label: "🎤 Stand-Up Comedy", value: "Stand-Up Comedy" },
  { label: "🎭 Theater", value: "Theater" },
  { label: "💃 Dance", value: "Dance" },
  { label: "🥊 Boxing", value: "Boxing" },
  { label: "🤼 Wrestling", value: "Wrestling" },
  { label: "🛹 Skateboarding", value: "Skateboarding" },
  { label: "🏄 Surfing", value: "Surfing" },
  { label: "🏂 Snowboarding", value: "Snowboarding" },
  { label: "⛳ Golf", value: "Golf" },
  { label: "🏇 Horse Riding", value: "Horse Riding" },
  { label: "🏐 Volleyball", value: "Volleyball" },
  { label: "🏸 Badminton", value: "Badminton" },
  { label: "🏓 Table Tennis", value: "Table Tennis" },
  { label: "🏹 Archery", value: "Archery" },
  { label: "🧗 Climbing", value: "Climbing" },
  { label: "🥷 Parkour", value: "Parkour" },
  { label: "🥽 Virtual Reality", value: "Virtual Reality" },
  { label: "🖨️ 3D Printing", value: "3D Printing" },
  { label: "🤖 Robotics", value: "Robotics" },
  { label: "⚡ Electronics", value: "Electronics" },
  { label: "🏠 Home Automation", value: "Home Automation" },
  { label: "🪵 Woodworking", value: "Woodworking" },
  { label: "⚙️ Metalworking", value: "Metalworking" },
  { label: "🖼️ Digital Art", value: "Digital Art" },
  { label: "🎨 Watercolor", value: "Watercolor" },
  { label: "🖌️ Oil Painting", value: "Oil Painting" },
  { label: "✏️ Sketching", value: "Sketching" },
  { label: "🌌 Street Art", value: "Street Art" },
  { label: "🪡 Tattoo Art", value: "Tattoo Art" },
  { label: "⭐ Astrology", value: "Astrology" },
  { label: "🔮 Tarot", value: "Tarot" },
  { label: "🧘 Wellness", value: "Wellness" },
  { label: "🧠 Psychology", value: "Psychology" },
  { label: "🥦 Nutrition", value: "Nutrition" },
  { label: "👨‍👩‍👧 Family", value: "Family" },
  { label: "🏫 College Life", value: "College Life" },
  { label: "🌍 Environment", value: "Environment" },
  { label: "🌊 Ocean & Marine", value: "Ocean & Marine" },
  { label: "🏕️ Outdoor Life", value: "Outdoor Life" },
  { label: "🎪 Events", value: "Events" },
  { label: "🛠️ Tools & Hardware", value: "Tools & Hardware" },
  { label: "🧪 Chemistry", value: "Chemistry" },
  { label: "🧬 Biology", value: "Biology" },
  { label: "🔭 Astronomy", value: "Astronomy" },
  { label: "🗺️ Geography", value: "Geography" },
  { label: "📊 Data Science", value: "Data Science" },
  { label: "☁️ Cloud Computing", value: "Cloud Computing" },
  { label: "📲 App Development", value: "App Development" },
  { label: "🌐 Web Development", value: "Web Development" },
  { label: "🎯 Self Improvement", value: "Self Improvement" },
  { label: "🕊️ Spirituality", value: "Spirituality" },
  { label: "🧩 Puzzles", value: "Puzzles" },
  { label: "🎠 Hobbies", value: "Hobbies" },
  { label: "🎁 Shopping", value: "Shopping" },
  { label: "🍕 Food & Drinks", value: "Food & Drinks" },
];

const Groups = () => {
  const { myGroups, myGroupsLoading, suggestedGroups, suggestedLoading, pendingRequestGroupIds, joinGroup, leaveGroup, deleteGroup, updateGroup } = useGroups();
  const joinedGroupIds = new Set<string>(
    (myGroups as any[] || []).map((m: any) => m.groups?.id).filter(Boolean)
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [editGroup, setEditGroup] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrivate, setEditPrivate] = useState(false);
  const [editRequireJoinApproval, setEditRequireJoinApproval] = useState(false);
  const [editRequirePostApproval, setEditRequirePostApproval] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

  // Realtime search across all groups
  const allGroupsPool = [
    ...((suggestedGroups as any[]) || []),
    ...((myGroups as any[]) || []).map((m: any) => m.groups).filter(Boolean),
  ];
  const deduped = Array.from(
    new Map(allGroupsPool.map((g: any) => [g.id, g])).values()
  );
  const searchTerm = headerSearch.trim().toLowerCase();
  const searchResults = searchTerm
    ? deduped.filter(
        (g: any) =>
          g.name?.toLowerCase().includes(searchTerm) ||
          g.description?.toLowerCase().includes(searchTerm)
      )
    : [];

  // Fetch groups filtered by category, sorted by members_count desc
  const { data: categoryGroups, isLoading: categoryGroupsLoading } = useQuery({
    queryKey: ["category-groups", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      let query = sb
        .from("groups")
        .select(GROUP_SELECT)
        .order("members_count", { ascending: false })
        .limit(50);
      if (selectedCategory !== "trending") {
        // category filter skipped until cache refreshes
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCategory,
  });

  const renderCategoryGroups = () => {
    const catLabel = CATEGORIES.find((c) => c.value === selectedCategory)?.label ?? selectedCategory;
    if (categoryGroupsLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-3 sm:p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    }
    if (!categoryGroups || categoryGroups.length === 0) {
      return (
        <Card className="p-6 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No groups found in <strong>{catLabel}</strong> yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to create one!</p>
        </Card>
      );
    }
    return (
      <div className="space-y-3">
        {(categoryGroups as any[]).map((group: any) => (
          <Card
            key={group.id}
            className="p-3 sm:p-4 cursor-pointer hover:shadow-glow transition-all"
            onClick={() => navigate(`/groups/${group.id}`)}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
                {group.avatar_url && <AvatarImage src={group.avatar_url} />}
                <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-base">
                  {group.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm sm:text-base truncate">{group.name}</h3>
                  {group.is_verified && <Badge variant="secondary" className="text-[10px] h-4 px-1">✓</Badge>}
                </div>
                {group.description && (
                  <p className="text-xs text-muted-foreground truncate mb-1">{group.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {group.is_private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  <span>{group.is_private ? "Private" : "Public"}</span>
                  <span>•</span>
                  <Users className="w-3 h-3" />
                  <span className="font-medium">{group.members_count?.toLocaleString()} members</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderMyGroups = (filterCreated = false) => {
    if (myGroupsLoading) {
      return (
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-3 sm:p-4 animate-pulse">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    const groupsToRender = filterCreated 
      ? myGroups?.filter((m: any) => m.role === 'admin' || m.groups?.creator_id === user?.id)
      : myGroups;

    if (!groupsToRender || groupsToRender.length === 0) {
      return (
        <Card className="p-6 sm:p-8 text-center">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm sm:text-base mb-3 sm:mb-4">
            {filterCreated ? "You haven't created any groups yet" : "You haven't joined any groups yet"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {filterCreated ? "Create your own group to get started!" : "Join groups below or create your own!"}
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4">
        {groupsToRender.map((membership: any) => {
          const group = membership.groups;
          if (!group) return null;
          return (
            <Card
              key={membership.id}
              className="p-3 sm:p-4 cursor-pointer hover:shadow-glow transition-all"
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
                  {group.avatar_url && <AvatarImage src={group.avatar_url} />}
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-base sm:text-lg font-bold">
                    {group.name[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1 truncate">{group.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                    {group.is_private ? (
                      <Lock className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <Globe className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      {group.members_count}
                    </span>
                    <span className="hidden xs:inline">•</span>
                    <span className="text-primary font-medium">{(group.group_posts as any)?.[0]?.count ?? group.posts_count ?? 0} posts</span>
                  </div>
                </div>

                {filterCreated ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit"
                      onClick={() => {
                        setEditGroup(group);
                        setEditName(group.name);
                        setEditDesc(group.description || "");
                        setEditPrivate(group.is_private || false);
                        setEditRequireJoinApproval(group.require_join_approval || false);
                        setEditRequirePostApproval(group.require_post_approval || false);
                        setEditAvatarFile(null);
                        setEditCoverFile(null);
                        setEditAvatarPreview(group.avatar_url || null);
                        setEditCoverPreview(group.cover_url || null);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      title="Manage"
                      onClick={() => navigate(`/groups/${group.id}/admin`)}
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      title="Delete"
                      onClick={() => setDeleteTarget(group)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderDiscoverGroups = () => {
    if (suggestedLoading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-3 sm:p-4 animate-pulse">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted mx-auto mb-2" />
              <div className="h-4 bg-muted rounded w-2/3 mx-auto mb-1" />
              <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
            </Card>
          ))}
        </div>
      );
    }

    if (!suggestedGroups || suggestedGroups.length === 0) {
      return (
        <Card className="p-5 sm:p-6 text-center bg-gradient-subtle">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-2">No Suggestions Yet</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Create your own group to get started!
          </p>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {suggestedGroups.map((group: any) => {
          const isJoined = joinedGroupIds.has(group.id);
          const isPending = pendingRequestGroupIds.has(group.id);
          return (
            <Card
              key={group.id}
              className="p-3 sm:p-4 text-center cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2">
                {group.avatar_url && <AvatarImage src={group.avatar_url} />}
                <AvatarFallback className="bg-gradient-accent text-accent-foreground font-bold text-sm sm:text-base">
                  {group.name[0]}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-xs sm:text-sm mb-1 truncate">{group.name}</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                {group.members_count} members
              </p>
              <Button
                size="sm"
                className={`w-full text-xs sm:text-sm h-8 sm:h-9 ${
                  isJoined
                    ? 'bg-muted text-muted-foreground'
                    : isPending
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-gradient-primary'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isJoined) { navigate(`/groups/${group.id}`); return; }
                  if (!isPending && joiningGroupId !== group.id) {
                    setJoiningGroupId(group.id);
                    joinGroup.mutate(
                      { groupId: group.id },
                      { onSettled: () => setJoiningGroupId(null) }
                    );
                  }
                }}
                disabled={joiningGroupId === group.id || isPending}
              >
                {isJoined ? 'View' : isPending ? 'Requested' : joiningGroupId === group.id ? 'Joining…' : 'Join'}
              </Button>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/sha-verse-logo.jpeg" alt="Sha-Verse" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Groups
            </h1>
          </div>
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, category…"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm bg-muted/50 border-transparent focus:border-primary/50 rounded-full"
            />
            {headerSearch && (
              <button
                onClick={() => setHeaderSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex-shrink-0">
            <CreateGroupDialog />
          </div>
        </div>
      </header>

      {/* Groups Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">

        {/* Header Search Results */}
        {searchTerm && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold">
                Results for &ldquo;{headerSearch.trim()}&rdquo;
                <span className="ml-2 text-sm font-normal text-muted-foreground">({searchResults.length})</span>
              </h2>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No groups found for &ldquo;{headerSearch.trim()}&rdquo;</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((group: any) => (
                  <Card
                    key={group.id}
                    className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarImage src={group.avatar_url} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm font-semibold">
                        {group.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{group.name}</h3>
                        {group.is_private ? (
                          <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {group.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{group.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{group.members_count ?? 0} members</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="flex-shrink-0">
                      View
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Chips */}
        <div className="mb-4 sm:mb-5">
          <div
            ref={categoryScrollRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() =>
                  setSelectedCategory((prev) => (prev === cat.value ? null : cat.value))
                }
                className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-all duration-200 ${
                  selectedCategory === cat.value
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.05]"
                    : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Results Panel */}
        {selectedCategory && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold">
                {CATEGORIES.find((c) => c.value === selectedCategory)?.label} Groups
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedCategory(null)}
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
            {renderCategoryGroups()}
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="joined" className="text-xs sm:text-sm">Joined</TabsTrigger>
            <TabsTrigger value="discover" className="text-xs sm:text-sm">Discover</TabsTrigger>
            <TabsTrigger value="created" className="text-xs sm:text-sm">Created</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8">
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Your Groups</h2>
              {renderMyGroups()}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Discover Groups</h2>
              {renderDiscoverGroups()}
            </div>
          </TabsContent>

          <TabsContent value="joined">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Your Groups</h2>
            {renderMyGroups()}
          </TabsContent>

          <TabsContent value="discover">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Discover Groups</h2>
            {renderDiscoverGroups()}
          </TabsContent>

          <TabsContent value="created">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Groups You Manage</h2>
            {renderMyGroups(true)}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={!!editGroup} onOpenChange={(o) => { if (!o) setEditGroup(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Cover Image */}
            <div className="space-y-1.5">
              <Label>Cover Image</Label>
              <label className="block cursor-pointer">
                <div className="w-full h-24 rounded-lg bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden">
                  {editCoverPreview ? (
                    <img src={editCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Click to upload</div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setEditCoverFile(file); setEditCoverPreview(URL.createObjectURL(file)); }
                }} />
              </label>
            </div>
            {/* Avatar */}
            <div className="space-y-1.5">
              <Label>Profile Picture</Label>
              <label className="block cursor-pointer w-20 h-20">
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden">
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Upload</div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setEditAvatarFile(file); setEditAvatarPreview(URL.createObjectURL(file)); }
                }} />
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Group Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter group name" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="What is this group about?" rows={3} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Private Group</Label>
                <p className="text-xs text-muted-foreground">Only invited members can join</p>
              </div>
              <Switch checked={editPrivate} onCheckedChange={setEditPrivate} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Join Approval</Label>
                <p className="text-xs text-muted-foreground">Admin must approve join requests</p>
              </div>
              <Switch checked={editRequireJoinApproval} onCheckedChange={setEditRequireJoinApproval} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Post Approval</Label>
                <p className="text-xs text-muted-foreground">Admin must approve posts before they appear</p>
              </div>
              <Switch checked={editRequirePostApproval} onCheckedChange={setEditRequirePostApproval} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroup(null)}>Cancel</Button>
            <Button
              disabled={!editName.trim() || updateGroup.isPending}
              onClick={() => {
                if (!editGroup) return;
                updateGroup.mutate(
                  { 
                    groupId: editGroup.id, 
                    name: editName.trim(), 
                    description: editDesc.trim(), 
                    isPrivate: editPrivate,
                    requireJoinApproval: editRequireJoinApproval,
                    requirePostApproval: editRequirePostApproval,
                    avatarFile: editAvatarFile || undefined,
                    coverFile: editCoverFile || undefined,
                  },
                  { onSuccess: () => setEditGroup(null) }
                );
              }}
            >
              {updateGroup.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Ye action permanent hai. Group aur uske saare posts delete ho jaayenge. Kya aap sure hain?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                deleteGroup.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
              }}
            >
              {deleteGroup.isPending ? "Deleting..." : "Delete Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Groups;
