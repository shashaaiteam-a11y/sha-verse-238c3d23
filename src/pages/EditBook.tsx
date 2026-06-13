import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { triggerImageCompression } from "@/lib/compressImage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Book, Loader2, Upload } from "lucide-react";
import { BOOK_PUBLIC_COLUMNS } from "@/lib/constants/bookshelf";

const CATEGORIES = [
  "Fiction", "Self-Help", "Education", "Comic", "Biography",
  "Science", "Motivational", "Business", "Health", "Travel",
  "Cooking", "Poetry", "Religion"
];

const EditBook = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [book, setBook] = useState<any>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    pages: "",
    category: "Fiction",
    language: "English",
  });

  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch book data
  useEffect(() => {
    if (!bookId) {
      setBookLoading(false);
      return;
    }

    const fetchBook = async () => {
      try {
        const { data } = await supabase
          .from("books")
          .select(BOOK_PUBLIC_COLUMNS)
          .eq("id", bookId)
          .single();
        
        if (data) {
          setBook(data);
          setFormData({
            title: data.title || "",
            author: data.author || "",
            description: data.description || "",
            pages: data.pages?.toString() || "",
            category: data.category || "Fiction",
            language: data.language || "English",
          });
          if (data.cover_url) {
            setCoverPreview(data.cover_url);
          }
        }
      } catch (err) {
        console.error("Error fetching book:", err);
      } finally {
        setBookLoading(false);
      }
    };

    fetchBook();
  }, [bookId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.author.trim()) {
      toast.error("Title and author are required");
      return;
    }

    setIsLoading(true);

    const updates = {
      title: formData.title,
      author: formData.author,
      description: formData.description,
      pages: formData.pages ? parseInt(formData.pages) : null,
      category: formData.category,
      language: formData.language,
    };

    const updateBook = async () => {
      let finalCoverUrl = book.cover_url;

      if (coverFile) {
        const cover = await compressImage(coverFile);
        const coverExt = cover.name.split(".").pop();
        const coverName = `${user?.id}/covers/${Date.now()}.${coverExt}`;

        const { error: coverError } = await supabase.storage
          .from("books")
          .upload(coverName, cover);

        if (coverError) throw coverError;

        const { data: coverData } = supabase.storage
          .from("books")
          .getPublicUrl(coverName);

        finalCoverUrl = coverData.publicUrl;
        // Background: generate optimized WebP variants for the cover (silent)
        triggerImageCompression("books", coverName);
      }

      const { error } = await supabase
        .from("books")
        .update({
          ...updates,
          cover_url: finalCoverUrl
        })
        .eq("id", bookId);
      
      if (error) throw error;
    };
    
    updateBook()
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["book", bookId] });
        queryClient.invalidateQueries({ queryKey: ["books"] });
        toast.success("Book updated successfully");
        navigate(`/bookshelf/book/${bookId}`);
      })
      .catch((err) => {
        console.error("Update error:", err);
        toast.error("Failed to update book");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (bookLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Book not found</h1>
          <Button onClick={() => navigate("/bookshelf")} className="mt-4">Back to Bookshelf</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold flex-1">Edit Book</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Cover Preview */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-48 h-72 rounded-xl overflow-hidden bg-gradient-primary shadow-lg">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Book className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
              <label className="mt-4 block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
                <Button variant="outline" className="w-full mt-2 cursor-pointer" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Cover
                  </span>
                </Button>
              </label>
            </div>

            <div className="flex-1 space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Book title"
                  className="mt-1"
                />
              </div>

              {/* Author */}
              <div>
                <label className="text-sm font-medium">Author</label>
                <Input
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  placeholder="Author name"
                  className="mt-1"
                />
              </div>

              {/* Category & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Pages</label>
                  <Input
                    name="pages"
                    type="number"
                    value={formData.pages}
                    onChange={handleInputChange}
                    placeholder="Number of pages"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Book description"
              className="mt-1 min-h-32"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBook;
