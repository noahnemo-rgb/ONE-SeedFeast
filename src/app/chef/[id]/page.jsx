import { ChevronLeft, Heart, Share2, Star, Trophy, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AppFrame, Spinner } from '../../components/frame';

export default function ChefProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const chefQuery = useQuery({
    queryKey: ['chef', id],
    queryFn: async () => {
      const response = await fetch(`/api/chefs/${id}`);
      if (!response.ok) throw new Error('Failed to fetch chef');
      return response.json();
    },
  });

  if (chefQuery.isLoading) {
    return (
      <AppFrame tone="white">
        <Spinner />
      </AppFrame>
    );
  }

  const chef = chefQuery.data;
  if (!chef || chef.error) {
    return (
      <AppFrame>
        <p className="px-6 py-24 text-center">Chef not found</p>
      </AppFrame>
    );
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice('Link copied.');
    } catch {
      setNotice('Could not copy the link.');
    }
  }

  return (
    <AppFrame tone="white">
      <div className="flex items-center justify-between px-4 pb-2 pt-5">
        <button type="button" aria-label="Back" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]">
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2">
          <button type="button" aria-label="Share" onClick={share} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]">
            <Share2 size={22} />
          </button>
          <button type="button" aria-label="Like chef" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]">
            <Heart size={22} />
          </button>
        </div>
      </div>
      {notice ? <p className="px-5 text-sm text-[#FF6A3D]">{notice}</p> : null}
      <div className="px-5 pb-6 text-center">
        <div className="relative mx-auto mb-4 h-28 w-28">
          <img src={chef.avatar} alt="" className="h-28 w-28 rounded-full object-cover" />
          {chef.is_featured ? (
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6A3D]">
              <Trophy size={16} color="#FFFFFF" />
            </span>
          ) : null}
        </div>
        <h1 className="font-display text-2xl font-semibold">{chef.name}</h1>
        {chef.is_featured ? (
          <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#FF6A3D]">
            <Star size={12} color="#FF6A3D" fill="#FF6A3D" />
            Chef of the Week
          </p>
        ) : null}
        <p className="mt-1 text-sm text-[#8C8C8C]">{chef.role}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-5 text-[#6B7280]">{chef.bio}</p>
        <div className="mt-5 flex justify-center gap-6">
          <Stat value={chef.followers} label="Followers" />
          <Stat value={chef.following} label="Following" />
          <Stat value={chef.likes} label="Likes" />
        </div>
      </div>
      <section className="px-5 pb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Utensils size={20} />
          Recipes
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {(chef.recipes || []).map((recipe) => (
            <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="overflow-hidden rounded-2xl bg-[#F8F8F8]">
              <img src={recipe.image} alt="" className="h-28 w-full object-cover" />
              <p className="line-clamp-2 p-3 text-sm font-semibold">{recipe.title}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppFrame>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-[#8C8C8C]">{label}</p>
    </div>
  );
}
