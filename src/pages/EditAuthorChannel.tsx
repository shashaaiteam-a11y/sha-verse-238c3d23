import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateChannel } from "@/hooks/useChannels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Camera, Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";

const EditAuthorChannel = () => {
    const { channelId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const updateChannel = useUpdateChannel();
    const queryClient = useQueryClient();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Fetch Channel Data
    const { data: channel, isLoading } = useQuery({
        queryKey: ["channel-edit", channelId],
        queryFn: async () => {
            if (!channelId) throw new Error("No channel ID");
            const { data, error } = await supabase
                .from("channels")
                .select("*")
                .eq("id", channelId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!channelId,
    });

    // Load initial data
    useEffect(() => {
        if (channel) {
            if (channel.user_id !== user?.id) {
                toast.error("You are not authorized to edit this channel");
                navigate("/bookshelf");
                return;
            }
            setName(channel.name);
            setDescription(channel.description || "");
            setAvatarPreview(channel.avatar_url);
            setBannerPreview(channel.banner_url);
        }
    }, [channel, user, navigate]);

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const uploadFile = async (rawFile: File, bucket: string) => {
        const file = await compressImage(rawFile);
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!channelId || !user) return;

        try {
            setIsUploading(true);
            let newAvatarUrl = undefined;
            let newBannerUrl = undefined;

            // Upload Avatar if changed
            if (avatarFile) {
                newAvatarUrl = await uploadFile(avatarFile, "avatars");
            }

            // Upload Banner if changed
            if (bannerFile) {
                newBannerUrl = await uploadFile(bannerFile, "avatars"); // Using avatars bucket for both for now, or use a general 'images' bucket
            }

            await updateChannel.mutateAsync({
                channelId,
                name,
                description,
                avatarUrl: newAvatarUrl,
                bannerUrl: newBannerUrl,
            });

            toast.success("Channel updated successfully!");
            // Navigate back after short delay
            setTimeout(() => navigate(`/bookshelf/channel/${channelId}`), 500);

        } catch (error: any) {
            toast.error("Failed to update channel: " + error.message);
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!channel) return null;

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-semibold text-lg">Edit Channel</h1>
            </header>

            <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Banner Edit */}
                    <div className="relative h-40 sm:h-52 bg-muted rounded-xl overflow-hidden group border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer"
                        onClick={() => bannerInputRef.current?.click()}>
                        {bannerPreview ? (
                            <img
                                src={bannerPreview}
                                alt="Banner"
                                className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                <Upload className="w-8 h-8 mb-2" />
                                <span className="text-sm">Click to upload banner</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        <input
                            ref={bannerInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBannerSelect}
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Channel Details</CardTitle>
                            <CardDescription>Update your public author profile</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Avatar Edit */}
                            <div className="flex flex-col items-center sm:flex-row gap-6">
                                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                    <Avatar className="w-24 h-24 border-4 border-background shadow-sm">
                                        <AvatarImage src={avatarPreview || ""} />
                                        <AvatarFallback className="text-2xl">{name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-6 h-6 text-white" />
                                    </div>
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarSelect}
                                    />
                                </div>

                                <div className="flex-1 w-full space-y-1">
                                    <h3 className="font-medium">Profile Picture</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Recommended size: 400x400px. Supports JPG, PNG.
                                    </p>
                                    <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                                        Change Photo
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Channel Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="E.g. J.K. Rowling"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">About</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Tell your readers about yourself..."
                                        rows={4}
                                    />
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                    <Button type="submit" className="w-full" disabled={isUploading || updateChannel.isPending}>
                        {(isUploading || updateChannel.isPending) ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving Changes...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>

                </form>
            </div>
        </div>
    );
};

export default EditAuthorChannel;
