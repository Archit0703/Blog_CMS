import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { postsAPI, commentsAPI, analyticsAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart,
  MessageSquare,
  Share2,
  Calendar,
  User,
  Eye,
  ArrowLeft,
  Send,
  Reply,
  MoreHorizontal,
  Flag,
  Edit,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const BlogPost = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const queryClient = useQueryClient();

  // Fetch post data
  const { data: postData, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => postsAPI.getPostBySlug(slug),
    enabled: !!slug,
  });

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', postData?.data?.post?._id],
    queryFn: () => commentsAPI.getComments(postData.data.post._id),
    enabled: !!postData?.data?.post?._id,
  });

  const post = postData?.data?.post;
  const comments = commentsData?.data?.comments || [];

  // Track view
  useEffect(() => {
    if (post?._id) {
      analyticsAPI.trackView(post._id).catch(() => {
        // Silently fail view tracking
      });
    }
  }, [post?._id]);

  // Check if user has liked the post
  useEffect(() => {
    if (post && user) {
      setLiked(post.likes?.includes(user._id) || false);
    }
  }, [post, user]);

  // Like post mutation
  const likeMutation = useMutation({
    mutationFn: () => postsAPI.likePost(post._id),
    onSuccess: () => {
      setLiked(!liked);
      queryClient.invalidateQueries(['post', slug]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to like post');
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (commentData) => commentsAPI.createComment(commentData),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries(['comments', post._id]);
      toast.success('Comment added successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    },
  });

  // Reply to comment mutation
  const replyMutation = useMutation({
    mutationFn: (replyData) => commentsAPI.replyToComment(replyingTo, replyData),
    onSuccess: () => {
      setReplyText('');
      setReplyingTo(null);
      queryClient.invalidateQueries(['comments', post._id]);
      toast.success('Reply added successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add reply');
    },
  });

  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: (commentId) => commentsAPI.likeComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', post._id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to like comment');
    },
  });

  const handleLike = () => {
    if (!user) {
      toast.error('Please login to like posts');
      return;
    }
    likeMutation.mutate();
  };

  const handleAddComment = () => {
    if (!user) {
      toast.error('Please login to comment');
      return;
    }
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    addCommentMutation.mutate({
      postId: post._id,
      content: newComment.trim(),
    });
  };

  const handleReply = () => {
    if (!user) {
      toast.error('Please login to reply');
      return;
    }
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    replyMutation.mutate({
      content: replyText.trim(),
    });
  };

  const handleLikeComment = (commentId) => {
    if (!user) {
      toast.error('Please login to like comments');
      return;
    }
    likeCommentMutation.mutate(commentId);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error?.response?.data?.message || 'Post not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" className="mb-6" asChild>
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Blog
        </Link>
      </Button>

      {/* Post Header */}
      <article className="space-y-6">
        <header className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {post.categories?.map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>

          <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>

          {post.excerpt && (
            <p className="text-xl text-muted-foreground">{post.excerpt}</p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={post.author?.avatar} />
                <AvatarFallback>
                  {getInitials(post.author?.firstName + ' ' + post.author?.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {post.author?.firstName} {post.author?.lastName}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                  <span>•</span>
                  <Eye className="h-3 w-3" />
                  <span>{post.views || 0} views</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={liked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                disabled={likeMutation.isLoading}
              >
                <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                {post.likesCount || 0}
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                {comments.length}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="aspect-video overflow-hidden rounded-lg">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Post Content */}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-6">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-8" />

        {/* Comments Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">
            Comments ({comments.length})
          </h2>

          {/* Add Comment */}
          {user ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {getInitials(user.firstName + ' ' + user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Share your thoughts..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddComment}
                        disabled={addCommentMutation.isLoading || !newComment.trim()}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Post Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Please login to join the conversation
                </p>
                <Button asChild>
                  <Link to="/login">Login</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No comments yet</h3>
                <p className="text-muted-foreground">
                  Be the first to share your thoughts!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment._id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <Avatar>
                        <AvatarImage src={comment.author?.avatar} />
                        <AvatarFallback>
                          {getInitials(comment.author?.firstName + ' ' + comment.author?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {comment.author?.firstName} {comment.author?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(comment.createdAt)}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-sm leading-relaxed">{comment.content}</p>

                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLikeComment(comment._id)}
                            disabled={!user}
                          >
                            <Heart className={`mr-1 h-3 w-3 ${
                              comment.likes?.includes(user?._id) ? 'fill-current' : ''
                            }`} />
                            {comment.likesCount || 0}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(comment._id)}
                            disabled={!user}
                          >
                            <Reply className="mr-1 h-3 w-3" />
                            Reply
                          </Button>
                        </div>

                        {/* Reply Form */}
                        {replyingTo === comment._id && (
                          <div className="mt-4 pl-4 border-l-2 border-muted">
                            <div className="flex gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(user.firstName + ' ' + user.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-2">
                                <Textarea
                                  placeholder="Write a reply..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[80px]"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm"
                                    onClick={handleReply}
                                    disabled={replyMutation.isLoading || !replyText.trim()}
                                  >
                                    Reply
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 pl-4 border-l-2 border-muted space-y-4">
                            {comment.replies.map((reply) => (
                              <div key={reply._id} className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={reply.author?.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(reply.author?.firstName + ' ' + reply.author?.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">
                                      {reply.author?.firstName} {reply.author?.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(reply.createdAt)}
                                    </p>
                                  </div>
                                  <p className="text-sm">{reply.content}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleLikeComment(reply._id)}
                                    disabled={!user}
                                    className="h-6 px-2"
                                  >
                                    <Heart className={`mr-1 h-2 w-2 ${
                                      reply.likes?.includes(user?._id) ? 'fill-current' : ''
                                    }`} />
                                    {reply.likesCount || 0}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </article>
    </div>
  );
};

export default BlogPost;

