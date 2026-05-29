import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  PromoteCurrency,
  PAYMENT_GATEWAY,
  getPriceBreakdown,
  detectCountry,
} from "@/lib/promote/pricing";

export interface Promotion {
  id: string;
  user_id: string;
  business_name: string;
  whatsapp: string;
  email: string | null;
  type: string;
  duration: number;
  amount: number;
  currency: string;
  payment_gateway: string;
  payment_id: string | null;
  payment_status: string;
  status: string;
  country: string | null;
  media_url: string;
  media_type: string;
  caption: string | null;
  target_link: string | null;
  created_at: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

export interface CreatePromotionInput {
  file: File;
  businessName: string;
  whatsapp: string;
  email?: string;
  type: "story" | "feed_banner";
  duration: number;
  currency: PromoteCurrency;
  targetLink?: string;
  caption?: string;
}

/**
 * Create a promotion.
 * UI-FIRST MODE: payment is mocked (no live Razorpay/Stripe charge yet).
 * The media is uploaded, the price is computed from the locked matrix, and a
 * promotion row is inserted with payment_status = PAID (mock) and the gateway
 * that WILL be used once real keys are wired (RAZORPAY for INR, STRIPE for USD).
 */
export const useCreatePromotion = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePromotionInput): Promise<Promotion> => {
      if (!user?.id) throw new Error("Please sign in to promote.");

      const isVideo = input.file.type.startsWith("video/");
      if (!isVideo && !input.file.type.startsWith("image/")) {
        throw new Error("Only image or video files are allowed.");
      }
      if (isVideo && input.file.size > MAX_VIDEO_BYTES) {
        throw new Error("Video must be under 50MB.");
      }
      if (!isVideo && input.file.size > MAX_IMAGE_BYTES) {
        throw new Error("Image must be under 10MB.");
      }

      // Upload media (reuse existing public buckets)
      const bucket = isVideo ? "videos" : "post-images";
      const ext = input.file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const path = `${user.id}/promo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, input.file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

      const price = getPriceBreakdown(input.duration, input.currency);

      // --- MOCK PAYMENT (replace with gateway webhook confirmation later) ---
      const mockPaymentId = `mock_${input.currency.toLowerCase()}_${Date.now()}`;

      const payload = {
        user_id: user.id,
        business_name: input.businessName.trim(),
        whatsapp: input.whatsapp.trim(),
        email: input.email?.trim() || null,
        type: input.type,
        duration: input.duration,
        amount: price.totalSmallestUnit,
        currency: input.currency,
        payment_gateway: PAYMENT_GATEWAY[input.currency],
        payment_id: mockPaymentId,
        payment_status: "PAID",
        country: detectCountry(),
        media_url: pub.publicUrl,
        media_type: isVideo ? "video" : "image",
        caption: input.caption?.trim() || null,
        target_link: input.targetLink?.trim() || null,
      };

      const { data, error } = await supabase
        .from("promotions")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Promotion;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-promotions"] }),
  });
};

/** Current user's promotions (newest first) — powers "Track Status". */
export const useMyPromotions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-promotions", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Promotion[]> => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Promotion[];
    },
  });
};
