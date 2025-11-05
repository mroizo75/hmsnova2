"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, Eye, X } from "lucide-react";
import { getAllPostsAdmin, upsertBlogPost, deleteBlogPost } from "@/server/actions/blog.actions";
import { useToast } from "@/hooks/use-toast";
import { TipTapEditor } from "@/components/admin/tiptap-editor";
import { ImageUploader } from "@/components/admin/image-uploader";

export default function AdminBlogPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageKey, setCoverImageKey] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    const result = await getAllPostsAdmin();
    if (result.success) {
      setPosts(result.data);
    } else {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
    setLoading(false);
  }

  function handleNew() {
    setEditingPost(null);
    setContent("");
    setCoverImageUrl("");
    setCoverImageKey("");
    setTags([]);
    setTagInput("");
    setDialogOpen(true);
  }

  function handleEdit(post: any) {
    setEditingPost(post);
    setContent(post.content || "");
    setCoverImageUrl(post.coverImage || "");
    setCoverImageKey("");
    setTags(post.keywords ? post.keywords.split(",").map((k: string) => k.trim()) : []);
    setTagInput("");
    setDialogOpen(true);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Slett "${title}"?`)) return;
    const result = await deleteBlogPost(id);
    if (result.success) {
      toast({ title: "Slettet", description: "Artikkelen er fjernet" });
      loadPosts();
    } else {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const slug = (formData.get("title") as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const data = {
      id: editingPost?.id,
      title: formData.get("title") as string,
      slug,
      excerpt: formData.get("excerpt") as string,
      content,
      coverImage: coverImageUrl || null,
      status: formData.get("status") as string,
      categoryId: formData.get("categoryId") as string || null,
      keywords: tags.join(", "),
    };

    const result = await upsertBlogPost(data);
    if (result.success) {
      toast({ title: "Lagret", description: "Artikkelen er lagret" });
      setDialogOpen(false);
      setContent("");
      setCoverImageUrl("");
      setCoverImageKey("");
      setTags([]);
      setTagInput("");
      loadPosts();
    } else {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="p-8">Laster...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blogg-artikler</h1>
          <p className="text-muted-foreground">Administrer blogginnhold</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Ny artikkel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? "Rediger artikkel" : "Ny artikkel"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Tittel *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  defaultValue={editingPost?.title}
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Ingress *</Label>
                <Input
                  id="excerpt"
                  name="excerpt"
                  required
                  defaultValue={editingPost?.excerpt}
                  disabled={submitting}
                  placeholder="Kort beskrivelse av artikkelen..."
                />
              </div>

              <div>
                <Label>Forsidebilde</Label>
                <ImageUploader
                  onUploadComplete={(url, key) => {
                    setCoverImageUrl(url);
                    setCoverImageKey(key);
                  }}
                  currentImage={coverImageUrl}
                />
              </div>

              <div>
                <Label>Innhold *</Label>
                <TipTapEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Skriv artikkelinnholdet ditt her..."
                />
              </div>

              <div>
                <Label htmlFor="tags">Nøkkelord / Tags (for SEO)</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const newTag = tagInput.trim();
                          if (newTag && !tags.includes(newTag)) {
                            setTags([...tags, newTag]);
                            setTagInput("");
                          }
                        }
                      }}
                      placeholder="Skriv inn nøkkelord og trykk Enter"
                      disabled={submitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newTag = tagInput.trim();
                        if (newTag && !tags.includes(newTag)) {
                          setTags([...tags, newTag]);
                          setTagInput("");
                        }
                      }}
                      disabled={submitting || !tagInput.trim()}
                    >
                      Legg til
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => setTags(tags.filter((_, i) => i !== index))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select name="status" required defaultValue={editingPost?.status || "DRAFT"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Utkast</SelectItem>
                    <SelectItem value="PUBLISHED">Publisert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <input type="hidden" name="categoryId" value="" />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Lagrer..." : "Lagre"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle artikler ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tittel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Publisert</TableHead>
                <TableHead>Visninger</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Ingen artikler ennå
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>
                      <Badge variant={post.status === "PUBLISHED" ? "default" : "secondary"}>
                        {post.status === "PUBLISHED" ? "Publisert" : "Utkast"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("nb-NO")
                        : "-"}
                    </TableCell>
                    <TableCell>{post.viewCount}</TableCell>
                    <TableCell className="text-right">
                      {post.status === "PUBLISHED" && (
                        <Link href={`/blogg/${post.slug}`} target="_blank">
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(post)} className="mr-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(post.id, post.title)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

