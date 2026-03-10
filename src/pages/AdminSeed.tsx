import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Video, BookOpen, Users2, FileText, CheckCircle } from "lucide-react";

const AdminSeed = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const seedData = async (action: string, description: string) => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: { action }
      });

      if (error) throw error;

      setResults(prev => ({ ...prev, [action]: data }));
      toast({
        title: "Success!",
        description: `${description} completed successfully.`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const seedAll = async () => {
    const actions = [
      { action: 'seed_users', desc: 'Creating demo users' },
      { action: 'seed_channels_and_videos', desc: 'Creating channels and videos' },
      { action: 'seed_books', desc: 'Creating author channels and books' },
      { action: 'seed_groups', desc: 'Creating groups with posts' },
      { action: 'seed_posts', desc: 'Creating feed posts' }
    ];

    for (const { action, desc } of actions) {
      await seedData(action, desc);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Admin: Seed Demo Data</h1>
        <p className="text-muted-foreground mb-8">
          Populate the app with realistic demo content
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Demo Users
              </CardTitle>
              <CardDescription>
                Create 150 realistic Indian user profiles with avatars, bios, and locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => seedData('seed_users', 'Users seeding')}
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'seed_users' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : results.seed_users ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : null}
                Seed Users
              </Button>
              {results.seed_users && (
                <p className="text-sm text-muted-foreground mt-2">
                  Created: {results.seed_users.created} users
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Channels & Videos
              </CardTitle>
              <CardDescription>
                Create video channels with 7-15 videos each (1000+ total videos)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => seedData('seed_channels_and_videos', 'Videos seeding')}
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'seed_channels_and_videos' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : results.seed_channels_and_videos ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : null}
                Seed Videos
              </Button>
              {results.seed_channels_and_videos && (
                <p className="text-sm text-muted-foreground mt-2">
                  Created: {results.seed_channels_and_videos.channels} channels, {results.seed_channels_and_videos.videos} videos
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Author Channels & Books
              </CardTitle>
              <CardDescription>
                Create author channels with 8-12 books each (1500+ total books)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => seedData('seed_books', 'Books seeding')}
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'seed_books' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : results.seed_books ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : null}
                Seed Books
              </Button>
              {results.seed_books && (
                <p className="text-sm text-muted-foreground mt-2">
                  Created: {results.seed_books.authorChannels} authors, {results.seed_books.books} books
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5" />
                Groups
              </CardTitle>
              <CardDescription>
                Create 200 groups with members and 12-20 posts each
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => seedData('seed_groups', 'Groups seeding')}
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'seed_groups' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : results.seed_groups ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : null}
                Seed Groups
              </Button>
              {results.seed_groups && (
                <p className="text-sm text-muted-foreground mt-2">
                  Created: {results.seed_groups.groups} groups, {results.seed_groups.posts} posts
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Feed Posts
              </CardTitle>
              <CardDescription>
                Create 500 posts for the main feed with images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => seedData('seed_posts', 'Posts seeding')}
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'seed_posts' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : results.seed_posts ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : null}
                Seed Posts
              </Button>
              {results.seed_posts && (
                <p className="text-sm text-muted-foreground mt-2">
                  Created: {results.seed_posts.posts} posts
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-primary">
            <CardHeader>
              <CardTitle>Seed Everything</CardTitle>
              <CardDescription>
                Run all seeding operations in sequence (takes 2-3 minutes)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={seedAll}
                disabled={loading !== null}
                size="lg"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding: {loading}
                  </>
                ) : (
                  'Seed All Demo Data'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">What will be created:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 150 realistic user profiles with Indian names</li>
            <li>• 150 video channels with 1000+ videos</li>
            <li>• 150 author channels with 1500+ books</li>
            <li>• 200 groups with 3000+ group posts</li>
            <li>• 500 feed posts with images</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminSeed;
