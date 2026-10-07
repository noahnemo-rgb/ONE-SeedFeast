import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart2,
  ChevronLeft,
  Clock,
  Flame,
  Heart,
  MessageCircle,
  Send,
  Share2,
  ThumbsUp,
  User,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AppFrame, Spinner } from '../../components/frame';
import { useSession } from '../../components/session';

export default function RecipeDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useSession();
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [notice, setNotice] = useState('');

  const recipeQuery = useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch recipe');
      return response.json();
    },
  });
  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/${id}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
  });

  const favorite = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: () => setNotice('Sign in to save this recipe.'),
  });

  const postComment = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/recipes/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText, parent_id: replyTo?.id || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');
      return data;
    },
    onSuccess: () => {
      setCommentText('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
    },
  });

  const likeComment = useMutation({
    mutationFn: async (commentId) => {
      const response = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
      if (!response.ok) throw new Error('Sign in to like comments.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] }),
    onError: () => setNotice('Sign in to like comments.'),
  });

  const recipe = recipeQuery.data;

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: recipe?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('Link copied.');
      }
    } catch {
      setNotice('Could not share that link.');
    }
  }

  if (recipeQuery.isLoading) {
    return (
      <AppFrame tone="white">
        <Spinner />
      </AppFrame>
    );
  }

  if (!recipe || recipe.error) {
    return (
      <AppFrame tone="white">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="mb-5 text-lg font-medium">Recipe not found</p>
          <button type="button" onClick={() => navigate('/')} className="rounded-full bg-[#FF6A3D] px-6 py-3 font-semibold text-white">
            Back home
          </button>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame tone="white">
      <div className="relative">
        <img src={recipe.image} alt="" className="h-72 w-full object-cover" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-5">
          <button type="button" aria-label="Back" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35">
            <ChevronLeft size={24} color="#FFFFFF" />
          </button>
          <div className="flex gap-2">
            <button type="button" aria-label="Share" onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35">
              <Share2 size={22} color="#FFFFFF" />
            </button>
            <button type="button" aria-label="Favorite" onClick={() => favorite.mutate()} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35">
              <Heart size={22} color={recipe.is_favorited ? '#FF3B30' : '#FFFFFF'} fill={recipe.is_favorited ? '#FF3B30' : 'transparent'} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pb-10 pt-5">
        {notice ? <p className="mb-3 text-sm text-[#FF6A3D]">{notice}</p> : null}
        <h1 className="font-display text-[28px] font-semibold leading-tight">{recipe.title}</h1>
        <Link to={`/chef/${recipe.chef.id}`} className="mt-4 flex items-center gap-3">
          {recipe.chef.avatar ? (
            <img src={recipe.chef.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3F4F6]">
              <User size={20} color="#8C8C8C" />
            </span>
          )}
          <span>
            <span className="block font-semibold">{recipe.chef.name}</span>
            <span className="text-sm text-[#8C8C8C]">{recipe.chef.role}</span>
          </span>
        </Link>

        <div className="mt-5 flex justify-between rounded-2xl bg-[#F8F8F8] px-4 py-3">
          <Meta icon={<Clock size={18} color="#FF6A3D" />} text={recipe.time} />
          <Meta icon={<BarChart2 size={18} color="#FF6A3D" />} text={recipe.difficulty} />
          <Meta icon={<Flame size={18} color="#FF6A3D" />} text={recipe.calories} />
        </div>

        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Description</h2>
          <p className="leading-6 text-[#374151]">{recipe.description}</p>
        </section>

        {recipe.ingredients?.length ? (
          <section className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">Ingredients</h2>
            <ul className="list-disc space-y-1 pl-5 text-[#374151]">
              {recipe.ingredients.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Instructions</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, index) => (
              <li key={step.id} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF6A3D] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-semibold">{step.title}</span>
                  <span className="text-sm leading-5 text-[#6B7280]">{step.description}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <MessageCircle size={20} />
            Comments
          </h2>
          {isAuthenticated ? (
            <div className="mb-4">
              {replyTo ? (
                <div className="mb-2 flex items-center justify-between text-sm text-[#6B7280]">
                  <span>
                    Replying to <strong>{replyTo.user_name}</strong>
                  </span>
                  <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>
                    <X size={16} color="#8C8C8C" />
                  </button>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
                  className="min-h-12 flex-1 rounded-2xl bg-[#F3F4F6] px-4 py-3"
                />
                <button
                  type="button"
                  aria-label="Send comment"
                  disabled={!commentText.trim() || postComment.isPending}
                  onClick={() => postComment.mutate()}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF6A3D] disabled:opacity-40"
                >
                  <Send size={20} color="#FFFFFF" />
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-4 text-sm text-[#6B7280]">
              <Link to="/account/signin" className="font-semibold text-[#FF6A3D]">
                Sign in
              </Link>{' '}
              to leave a comment.
            </p>
          )}

          {commentsQuery.isLoading ? (
            <Spinner />
          ) : commentsQuery.data?.length ? (
            <div className="space-y-4">
              {commentsQuery.data.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onLike={(commentId) => likeComment.mutate(commentId)}
                  onReply={setReplyTo}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8C8C8C]">No comments yet. Be the first to share your thoughts!</p>
          )}
        </section>
      </div>
    </AppFrame>
  );
}

function Meta({ icon, text }) {
  return (
    <span className="flex items-center gap-2 text-sm font-medium">
      {icon}
      {text}
    </span>
  );
}

function CommentItem({ comment, onLike, onReply, isReply = false }) {
  return (
    <div className={isReply ? 'mt-3 border-l border-[#EDEDED] pl-3' : ''}>
      <div className="flex items-center gap-2">
        {comment.user_image ? (
          <img src={comment.user_image} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-bold">
            {comment.user_name?.charAt(0)}
          </span>
        )}
        <span className="text-sm font-semibold">{comment.user_name}</span>
      </div>
      <p className="mt-2 text-sm leading-5">{comment.content}</p>
      <div className="mt-2 flex gap-4 text-xs text-[#8C8C8C]">
        <button type="button" className="flex items-center gap-1" onClick={() => onLike(comment.id)}>
          <ThumbsUp size={14} color={comment.is_liked ? '#FF6A3D' : '#8C8C8C'} fill={comment.is_liked ? '#FF6A3D' : 'transparent'} />
          <span className={comment.is_liked ? 'text-[#FF6A3D]' : ''}>{comment.likes_count || 0}</span>
        </button>
        {!isReply ? (
          <button type="button" className="flex items-center gap-1" onClick={() => onReply(comment)}>
            <MessageCircle size={14} color="#8C8C8C" />
            Reply
          </button>
        ) : null}
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} onLike={onLike} onReply={onReply} isReply />
      ))}
    </div>
  );
}
