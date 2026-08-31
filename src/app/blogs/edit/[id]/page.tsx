"use client";

import { useParams } from "next/navigation";
import BlogForm from "@/components/blog/BlogForm";

export default function EditBlogPage() {
  const params = useParams();
  const id = params.id as string;

  return <BlogForm blogId={id} />;
}
