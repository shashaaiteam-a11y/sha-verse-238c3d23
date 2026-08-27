import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Realistic Indian names for demo accounts
const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Shaurya", "Atharv", "Advik", "Pranav", "Advaith", "Aarush", "Kabir", "Ritvik", "Anirudh", "Dhruv",
  "Ananya", "Aadhya", "Saanvi", "Aanya", "Diya", "Pari", "Myra", "Sara", "Kiara", "Anika",
  "Navya", "Avni", "Riya", "Prisha", "Ira", "Ishita", "Kavya", "Nisha", "Pooja", "Shreya",
  "Rahul", "Amit", "Priya", "Neha", "Raj", "Vikram", "Anjali", "Deepika", "Aryan", "Sanya",
  "Karan", "Rohan", "Tanvi", "Meera", "Yash", "Dev", "Tara", "Zara", "Om", "Neel",
  "Ravi", "Suresh", "Kavitha", "Lakshmi", "Ganesh", "Venkat", "Padma", "Radha", "Mohan", "Geeta",
  "Siddharth", "Akash", "Sneha", "Divya", "Harsh", "Varun", "Simran", "Jasmine", "Nikhil", "Kriti",
  "Manish", "Gaurav", "Sonali", "Rashmi", "Sanjay", "Vijay", "Sunita", "Rekha", "Ashok", "Manju",
  "Arpit", "Kunal", "Pallavi", "Swati", "Pankaj", "Vishal", "Asha", "Seema", "Dinesh", "Usha"
];

const lastNames = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Shah", "Joshi", "Mehta", "Agarwal",
  "Reddy", "Rao", "Nair", "Menon", "Pillai", "Iyer", "Iyengar", "Mukherjee", "Banerjee", "Chatterjee",
  "Das", "Roy", "Ghosh", "Sen", "Bose", "Dutta", "Chakraborty", "Sinha", "Pandey", "Mishra",
  "Dubey", "Tiwari", "Shukla", "Bajpai", "Dwivedi", "Tripathi", "Trivedi", "Saxena", "Mathur", "Kapoor",
  "Malhotra", "Khanna", "Arora", "Bhatia", "Ahuja", "Chopra", "Sethi", "Dhawan", "Kohli", "Tandon"
];

// Free stock video URLs from Pexels
const sampleVideoThumbnails = [
  "https://images.pexels.com/videos/3571264/free-video-3571264.jpg",
  "https://images.pexels.com/videos/856356/free-video-856356.jpg",
  "https://images.pexels.com/videos/3195394/free-video-3195394.jpg",
  "https://images.pexels.com/videos/4763824/free-video-4763824.jpg",
  "https://images.pexels.com/videos/5377684/free-video-5377684.jpg",
  "https://images.pexels.com/videos/7565438/free-video-7565438.jpg",
  "https://images.pexels.com/videos/5752729/free-video-5752729.jpg",
  "https://images.pexels.com/videos/6394054/free-video-6394054.jpg",
  "https://images.pexels.com/videos/4434166/free-video-4434166.jpg",
  "https://images.pexels.com/videos/3129671/free-video-3129671.jpg"
];

// Sample avatar URLs
const avatarUrls = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150"
];

// Cover photos
const coverUrls = [
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
  "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800",
  "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=800",
  "https://images.unsplash.com/photo-1557682260-96773eb01377?w=800",
  "https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=800"
];

// Book covers from free sources
const bookCovers = [
  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300",
  "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300",
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300",
  "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300",
  "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300",
  "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300",
  "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=300",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=300",
  "https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=300"
];

// Video titles
const videoTitles = [
  "How to Build a Successful Business in 2024",
  "Morning Routine for Productivity",
  "Best Travel Destinations in India",
  "Learn JavaScript in 30 Minutes",
  "Healthy Cooking Tips for Beginners",
  "Meditation Guide for Stress Relief",
  "Photography Tips for Stunning Shots",
  "Fitness Workout at Home",
  "Financial Planning for Young Adults",
  "Digital Marketing Strategies That Work",
  "Python Programming Tutorial",
  "Yoga for Flexibility",
  "Startup Success Stories",
  "How to Invest in Stock Market",
  "Creative Writing Tips",
  "Music Production Basics",
  "Mobile App Development Guide",
  "Public Speaking Skills",
  "Time Management Secrets",
  "Graphic Design Tutorial"
];

// Book titles (public domain inspired)
const bookTitles = [
  "The Art of Self-Improvement",
  "Journey to Success",
  "Mindfulness and Inner Peace",
  "The Entrepreneur's Handbook",
  "Tales from Ancient India",
  "Modern Leadership Principles",
  "The Science of Happiness",
  "Financial Freedom Guide",
  "Creative Thinking Techniques",
  "The Power of Habits",
  "Digital Age Wisdom",
  "The Path to Wellness",
  "Stories of Inspiration",
  "Business Strategy Essentials",
  "The Meditation Handbook",
  "Learning Made Simple",
  "The Innovation Mindset",
  "Life Lessons from Nature",
  "The Art of Communication",
  "Personal Growth Journey"
];

// Group names
const groupNames = [
  "Tech Enthusiasts India", "Photography Lovers", "Fitness Freaks Mumbai",
  "Startup Founders Network", "Book Club Delhi", "Travel Buddies",
  "Cooking Recipes Hub", "Music Producers India", "Digital Marketing Pro",
  "Stock Market Traders", "Yoga & Meditation", "Gaming Community",
  "Art & Design Collective", "Writers Circle", "Film Buffs India",
  "Science & Technology", "Fashion Trends", "Sports Fans Unite",
  "Career Growth Tips", "Mental Health Support", "Pet Lovers India",
  "DIY Crafts Community", "Parenting Tips", "College Students Hub",
  "Freelancers Network", "Bollywood Fans", "Cricket Lovers",
  "Food Photography", "Nature Explorers", "Motivational Quotes"
];

// Post content templates
const postTemplates = [
  "Just finished an amazing project! Feeling accomplished 🎉",
  "What a beautiful morning! Starting the day with positivity ☀️",
  "Learning something new every day. Knowledge is power! 📚",
  "Grateful for all the support from this community 🙏",
  "Sharing my latest work - what do you think?",
  "Weekend vibes! Hope everyone is having a great time 🌟",
  "Just discovered an amazing technique. Can't wait to share more!",
  "The journey of a thousand miles begins with a single step 🚶",
  "Coffee and creativity - the perfect combination ☕",
  "Celebrating small wins today! Every step counts 🎯",
  "Amazing sunset view from my place today 🌅",
  "Just completed a 30-day challenge! Consistency is key 💪",
  "Sharing some tips that helped me grow professionally",
  "New week, new goals! Let's make it count 🚀",
  "Throwback to an unforgettable experience ❤️"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUsername(firstName: string, lastName: string, index: number): string {
  const variations = [
    `${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`,
    `${firstName.toLowerCase()}_${index}`,
    `${firstName.toLowerCase()}${getRandomNumber(100, 999)}`,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
  ];
  return getRandomElement(variations);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, count } = await req.json();

    // NOTE: Cannot create fake profiles as they need auth.users entries
    // seed_users action is disabled - use existing real users
    if (action === 'seed_users') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Cannot create fake profiles - they require auth.users entries. Use existing registered users.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'seed_channels_and_videos') {
      // Get existing demo users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name')
        .limit(150);

      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ error: 'No users found.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get existing video channels
      const { data: existingChannels } = await supabase
        .from('channels')
        .select('id, user_id')
        .eq('channel_type', 'video');

      const existingChannelMap = new Map(
        (existingChannels || []).map(c => [c.user_id, c.id])
      );

      const newChannels = [];
      const videos = [];
      const userChannelMap = new Map();

      for (const user of users) {
        let channelId = existingChannelMap.get(user.id);
        
        if (!channelId) {
          // Create new channel only if user doesn't have one
          channelId = crypto.randomUUID();
          newChannels.push({
            id: channelId,
            user_id: user.id,
            name: `${user.display_name}'s Channel`,
            description: `Welcome to my channel! Subscribe for amazing content.`,
            channel_type: 'video',
            avatar_url: getRandomElement(avatarUrls),
            banner_url: getRandomElement(coverUrls),
            subscribers_count: getRandomNumber(100, 50000)
          });
        }
        
        userChannelMap.set(user.id, channelId);

        // Create 7-15 videos per user
        const videoCount = getRandomNumber(7, 15);
        for (let v = 0; v < videoCount; v++) {
          videos.push({
            id: crypto.randomUUID(),
            channel_id: channelId,
            title: getRandomElement(videoTitles) + ` - Part ${v + 1}`,
            description: `Amazing content you don't want to miss! Like, share, and subscribe for more.`,
            thumbnail_url: getRandomElement(sampleVideoThumbnails),
            video_url: `https://sample-videos.com/video${v}.mp4`,
            hls_url: null,
            duration: getRandomNumber(120, 1800),
            views_count: getRandomNumber(100, 500000),
            likes_count: getRandomNumber(10, 10000),
            comments_count: getRandomNumber(5, 500),
            is_short: Math.random() > 0.8,
            transcoding_status: 'completed',
            category: getRandomElement(['Entertainment', 'Education', 'Music', 'Gaming', 'Sports', 'News']),
            created_at: new Date(Date.now() - getRandomNumber(1, 180) * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }

      // Insert new channels
      if (newChannels.length > 0) {
        const channelBatchSize = 50;
        for (let i = 0; i < newChannels.length; i += channelBatchSize) {
          const batch = newChannels.slice(i, i + channelBatchSize);
          const { error } = await supabase.from('channels').insert(batch);
          if (error) console.error('Error inserting channels batch:', error);
        }
      }

      // Insert videos in batches
      const videoBatchSize = 100;
      for (let i = 0; i < videos.length; i += videoBatchSize) {
        const batch = videos.slice(i, i + videoBatchSize);
        const { error } = await supabase.from('videos').insert(batch);
        if (error) console.error('Error inserting videos batch:', error);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        newChannels: newChannels.length, 
        videos: videos.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'seed_books') {
      // Get users 
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name')
        .limit(150);

      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ error: 'No users found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get existing book channels
      const { data: existingChannels } = await supabase
        .from('channels')
        .select('id, user_id')
        .eq('channel_type', 'books');

      const existingChannelMap = new Map(
        (existingChannels || []).map(c => [c.user_id, c.id])
      );

      const newChannels = [];
      const books = [];

      for (const user of users) {
        let channelId = existingChannelMap.get(user.id);
        
        if (!channelId) {
          // Create author channel only if user doesn't have one
          channelId = crypto.randomUUID();
          newChannels.push({
            id: channelId,
            user_id: user.id,
            name: `${user.display_name} - Author`,
            description: `Published author sharing knowledge and stories with the world.`,
            channel_type: 'books',
            avatar_url: getRandomElement(avatarUrls),
            banner_url: getRandomElement(coverUrls),
            subscribers_count: getRandomNumber(50, 20000)
          });
        }

        // Create 8-12 books per author
        const bookCount = getRandomNumber(8, 12);
        for (let b = 0; b < bookCount; b++) {
          books.push({
            id: crypto.randomUUID(),
            channel_id: channelId,
            title: getRandomElement(bookTitles) + ` Vol. ${b + 1}`,
            author: user.display_name,
            description: `An insightful book that will transform your perspective. A must-read for everyone seeking knowledge and inspiration.`,
            cover_url: getRandomElement(bookCovers),
            book_url: `https://www.gutenberg.org/files/1342/1342-h/1342-h.htm`,
            pages: getRandomNumber(50, 500),
            views_count: getRandomNumber(100, 100000),
            likes_count: getRandomNumber(10, 5000),
            downloads_count: getRandomNumber(50, 20000),
            comments_count: getRandomNumber(5, 200),
            rating_avg: (getRandomNumber(35, 50) / 10),
            rating_count: getRandomNumber(10, 1000),
            category: getRandomElement(['Fiction', 'Self-Help', 'Education', 'Business', 'Science', 'Biography', 'Motivational', 'Philosophy']),
            language: getRandomElement(['English', 'Hindi']),
            visibility: 'public',
            created_at: new Date(Date.now() - getRandomNumber(1, 365) * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }

      // Insert new author channels
      if (newChannels.length > 0) {
        const channelBatchSize = 50;
        for (let i = 0; i < newChannels.length; i += channelBatchSize) {
          const batch = newChannels.slice(i, i + channelBatchSize);
          const { error } = await supabase.from('channels').insert(batch);
          if (error) console.error('Error inserting author channels:', error);
        }
      }

      // Insert books
      const bookBatchSize = 100;
      for (let i = 0; i < books.length; i += bookBatchSize) {
        const batch = books.slice(i, i + bookBatchSize);
        const { error } = await supabase.from('books').insert(batch);
        if (error) console.error('Error inserting books:', error);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        newChannels: newChannels.length, 
        books: books.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'seed_groups') {
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .limit(150);

      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ error: 'No users found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const groupCount = count || 200;
      const groups = [];
      const groupMembers = [];
      const groupPosts = [];

      for (let g = 0; g < groupCount; g++) {
        const groupId = crypto.randomUUID();
        const creatorId = getRandomElement(users).id;
        
        groups.push({
          id: groupId,
          name: getRandomElement(groupNames) + ` ${g + 1}`,
          description: `A vibrant community for like-minded people. Join us and be part of something amazing!`,
          creator_id: creatorId,
          avatar_url: getRandomElement(avatarUrls),
          cover_url: getRandomElement(coverUrls),
          is_private: Math.random() > 0.8,
          members_count: getRandomNumber(50, 5000),
          posts_count: getRandomNumber(12, 50)
        });

        // Add creator as admin
        groupMembers.push({
          group_id: groupId,
          user_id: creatorId,
          role: 'admin'
        });

        // Add random members
        const memberCount = getRandomNumber(10, 30);
        const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
        for (let m = 0; m < Math.min(memberCount, shuffledUsers.length); m++) {
          if (shuffledUsers[m].id !== creatorId) {
            groupMembers.push({
              group_id: groupId,
              user_id: shuffledUsers[m].id,
              role: 'member'
            });
          }
        }

        // Create 12-20 posts per group
        const postCount = getRandomNumber(12, 20);
        for (let p = 0; p < postCount; p++) {
          groupPosts.push({
            id: crypto.randomUUID(),
            group_id: groupId,
            user_id: getRandomElement(users).id,
            content: getRandomElement(postTemplates),
            image_url: Math.random() > 0.5 ? getRandomElement(sampleVideoThumbnails) : null,
            likes_count: getRandomNumber(0, 200),
            comments_count: getRandomNumber(0, 50),
            created_at: new Date(Date.now() - getRandomNumber(1, 90) * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }

      // Insert groups
      const groupBatchSize = 50;
      for (let i = 0; i < groups.length; i += groupBatchSize) {
        const batch = groups.slice(i, i + groupBatchSize);
        const { error } = await supabase.from('groups').insert(batch);
        if (error) console.error('Error inserting groups:', error);
      }

      // Insert group members
      const memberBatchSize = 100;
      for (let i = 0; i < groupMembers.length; i += memberBatchSize) {
        const batch = groupMembers.slice(i, i + memberBatchSize);
        const { error } = await supabase.from('group_members').insert(batch);
        if (error) console.error('Error inserting group members:', error);
      }

      // Insert group posts
      const postBatchSize = 100;
      for (let i = 0; i < groupPosts.length; i += postBatchSize) {
        const batch = groupPosts.slice(i, i + postBatchSize);
        const { error } = await supabase.from('group_posts').insert(batch);
        if (error) console.error('Error inserting group posts:', error);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        groups: groups.length,
        members: groupMembers.length,
        posts: groupPosts.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'seed_posts') {
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .limit(150);

      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ error: 'No users found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const posts = [];
      const postCount = count || 500;

      for (let p = 0; p < postCount; p++) {
        posts.push({
          id: crypto.randomUUID(),
          user_id: getRandomElement(users).id,
          content: getRandomElement(postTemplates),
          image_url: Math.random() > 0.4 ? getRandomElement(sampleVideoThumbnails) : null,
          likes_count: getRandomNumber(0, 500),
          comments_count: getRandomNumber(0, 100),
          shares_count: getRandomNumber(0, 50),
          visibility: 'public',
          created_at: new Date(Date.now() - getRandomNumber(1, 60) * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Insert posts
      const batchSize = 100;
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize);
        const { error } = await supabase.from('posts').insert(batch);
        if (error) console.error('Error inserting posts:', error);
      }

      return new Response(JSON.stringify({ success: true, posts: posts.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'seed_all') {
      // Seed everything in sequence
      const results = {
        users: 0,
        channels: 0,
        videos: 0,
        authorChannels: 0,
        books: 0,
        groups: 0,
        groupMembers: 0,
        groupPosts: 0,
        posts: 0
      };

      // This will be handled by the background task
      return new Response(JSON.stringify({ 
        message: 'Seeding started. This may take a few minutes.',
        instructions: 'Call individual seed actions: seed_users, seed_channels_and_videos, seed_books, seed_groups, seed_posts'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action',
      validActions: ['seed_users', 'seed_channels_and_videos', 'seed_books', 'seed_groups', 'seed_posts', 'seed_all']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Seeding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
