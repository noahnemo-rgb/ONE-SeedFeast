import { useQuery } from '@tanstack/react-query';
import { Heart, Search as SearchIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { AppFrame } from '../components/frame';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const searching = searchQuery.length > 0 || selectedCategory !== null;

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const resultsQuery = useQuery({
    queryKey: ['search', searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      const response = await fetch(`/api/recipes/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to search recipes');
      return response.json();
    },
    enabled: searching,
  });

  const categories = categoriesQuery.data?.categories || [];
  const recipes = resultsQuery.data?.recipes || [];

  return (
    <AppFrame showTabs>
      <div className="px-5 pb-4 pt-6">
        <h1 className="font-display mb-4 text-[28px] font-semibold">Search Recipes</h1>
        <div className="mb-4 flex h-[50px] items-center rounded-2xl border border-[#EDEDED] bg-white px-4">
          <SearchIcon size={20} color="#8C8C8C" />
          <input
            className="ml-3 flex-1 bg-transparent text-[15px] text-[#111111] placeholder:text-[#8C8C8C]"
            placeholder="Search for recipes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery.length > 0 ? (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')}>
              <X size={20} color="#8C8C8C" />
            </button>
          ) : null}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
            All
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              active={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="px-5">
        {!searching ? (
          <Empty icon={<SearchIcon size={48} color="#8C8C8C" strokeWidth={1.5} />} title="Start Searching">
            Find your next favorite recipe{'\n'}by searching or selecting a category
          </Empty>
        ) : resultsQuery.isLoading ? (
          <p className="py-20 text-center text-[15px] text-[#6B7280]">Searching...</p>
        ) : recipes.length === 0 ? (
          <Empty icon={<SearchIcon size={48} color="#8C8C8C" strokeWidth={1.5} />} title="No Results Found">
            Try different keywords or{'\n'}select another category
          </Empty>
        ) : (
          <>
            <p className="mb-4 text-sm text-[#8C8C8C]">
              {recipes.length} recipe{recipes.length === 1 ? '' : 's'} found
            </p>
            <div className="flex flex-col gap-3 pb-6">
              {recipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  to={`/recipe/${recipe.id}`}
                  className="relative flex overflow-hidden rounded-2xl border border-[#EDEDED] bg-white"
                >
                  <img src={recipe.image} alt="" className="h-[100px] w-[100px] object-cover" />
                  <div className="flex flex-1 flex-col justify-center p-3">
                    <p className="text-base font-semibold">{recipe.title}</p>
                    <p className="mt-1 text-[13px] text-[#8C8C8C]">By {recipe.chef_name}</p>
                    <p className="mt-2 flex gap-3 text-xs text-[#6E6E73]">
                      <span>{recipe.time}</span>
                      <span>{recipe.difficulty}</span>
                    </p>
                  </div>
                  {recipe.is_favorite ? (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6A3D]">
                      <Heart size={12} color="#FFFFFF" fill="#FFFFFF" />
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppFrame>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium ${
        active ? 'border-[#FF6A3D] bg-[#FF6A3D] text-white' : 'border-[#EDEDED] bg-white text-[#111111]'
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ icon, title, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <div className="mb-6 flex h-[100px] w-[100px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        {icon}
      </div>
      <p className="mb-2 text-xl font-semibold">{title}</p>
      <p className="whitespace-pre-line text-[15px] leading-[22px] text-[#6B7280]">{children}</p>
    </div>
  );
}
