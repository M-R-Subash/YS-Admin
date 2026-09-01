import { ScreenLoader } from "@/components/ui/screen-loader";

export default function GlobalLoading() {
  return (
    <ScreenLoader
      text="Loading Page..."
      subtitle="Fetching latest content and administrative assets"
    />
  );
}
