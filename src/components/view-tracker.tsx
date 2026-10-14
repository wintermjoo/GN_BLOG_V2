"use client";

import { useEffect } from "react";

export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    void fetch(`/api/posts/${postId}/view`, { method: "POST", keepalive: true });
  }, [postId]);
  return null;
}
