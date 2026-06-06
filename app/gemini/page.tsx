import type { Metadata } from "next";

import { PointAskApp } from "@/components/PointAskApp";

export const metadata: Metadata = {
  title: "Point & Ask AI",
  description: "Ask questions about what your camera sees."
};

export default function GeminiPage() {
  return <PointAskApp />;
}
