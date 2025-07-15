import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { postsAPI, imagesAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 


  Loader2, 
  Save, 
  Eye, 
  Upload, 
  X, 
  Plus,
  Image as ImageIcon,
  FileText,
  Settings,
  Tag,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const EditPost = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [featuredImage, setFeaturedImage] = useState(null);
  const [isDraft, setIsDraft] = useState(true);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm();

  // Fetch post data
  const { data: postData, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsAPI.getPost(id),
    enabled: !!id,
  });

  const post = postData?.data?.post;

  // Initialize form with post data
  useEffect(() => {
    if (post) {
      reset({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        metaTitle: post.seo?.metaTitle || '',
        metaDescription: post.seo?.metaDescription || '',
        allowComments: post.allowComments,
      });
      setTags(post.tags || []);
      setCategories(post.categories || []);
      setFeaturedImage(post.featuredImage ? { url: post.featuredImage } : null);
      setIsDraft(post.status === 'draft');
    }
  }, [post, reset]);

  const title = watch('title');
  const content = watch('content');

  // React Quill modules and formats
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'indent',
    'align', 'blockquote', 'code-block', 'link', 'image', 'video'
  ];

  // Generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await imagesAPI.uploadImage(formData);
      setFeaturedImage(response.data.image);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Add category
  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  // Remove category
  const removeCategory = (categoryToRemove) => {
    setCategories(categories.filter(category => category !== categoryToRemove));
  };

  // Handle form submission
  const onSubmit = async (data) => {
    if (!data.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!data.content.trim()) {
      toast.error('Content is required');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        ...data,
        slug: generateSlug(data.title),
        tags,
        categories,
        featuredImage: featuredImage?.url,
        status: isDraft ? 'draft' : 'published',
        publishedAt: isDraft ? null : (post.publishedAt || new Date()),
      };

      const response = await postsAPI.updatePost(post._id, postData);
      toast.success(`Post ${isDraft ? 'saved as draft' : 'updated'} successfully`);
      navigate(`/post/${response.data.post.slug}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate meta title and description
  const autoGenerateMeta = () => {
    if (title) {
      setValue('metaTitle', title);
    }
    if (content) {
      const textContent = content.replace(/<[^>]*>/g, '').substring(0, 160);
      setValue('metaDescription', textContent);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load post. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Post not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Post</h1>
            <p className="text-muted-foreground">
              Update your post content and settings
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Post Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter your post title..."
                    {...register('title', { required: 'Title is required' })}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Controller
                    name="content"
                    control={control}
                    rules={{ required: 'Content is required' }}
                    render={({ field }) => (
                      <ReactQuill
                        theme="snow"
                        value={field.value}
                        onChange={field.onChange}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Start writing your post..."
                        style={{ minHeight: '300px' }}
                      />
                    )}
                  />
                  {errors.content && (
                    <p className="text-sm text-destructive">{errors.content.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    placeholder="Brief description of your post..."
                    className="min-h-[100px]"
                    {...register('excerpt')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional excerpt that will be shown in post previews
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SEO Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  SEO Settings
                </CardTitle>
                <CardDescription>
                  Optimize your post for search engines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={autoGenerateMeta}
                  >
                    Auto-generate
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    placeholder="SEO title for search engines..."
                    {...register('metaTitle')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    placeholder="SEO description for search engines..."
                    {...register('metaDescription')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended length: 150-160 characters
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isDraft">Save as Draft</Label>
                  <Switch
                    id="isDraft"
                    checked={isDraft}
                    onCheckedChange={setIsDraft}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allowComments">Allow Comments</Label>
                  <Switch
                    id="allowComments"
                    {...register('allowComments')}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Post
                      </>
                    )}
                  </Button>
                  
                  <Button type="button" variant="outline" disabled>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Featured Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {featuredImage ? (
                  <div className="relative">
                    <img
                      src={featuredImage.url}
                      alt="Featured"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setFeaturedImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No image selected
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                >
                  {imageUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {featuredImage ? 'Change Image' : 'Upload Image'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" size="icon" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add category..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  />
                  <Button type="button" size="icon" onClick={addCategory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge key={category} variant="outline" className="flex items-center gap-1">
                      {category}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeCategory(category)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditPost;

