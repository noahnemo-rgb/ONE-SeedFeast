import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AppFrame, Spinner } from '../components/frame';
import { useSession } from '../components/session';

const field = 'w-full rounded-2xl bg-[#F3F4F6] px-4 py-3 text-[15px] placeholder:text-[#8C8C8C]';

export default function CreateRecipeScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isReady } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [time, setTime] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [calories, setCalories] = useState('');
  const [ingredients, setIngredients] = useState(['']);
  const [steps, setSteps] = useState([{ title: '', description: '' }]);
  const [error, setError] = useState('');

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const createRecipe = useMutation({
    mutationFn: async (recipeData) => {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create recipe');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      navigate(`/recipe/${data.recipe.id}`);
    },
    onError: (err) => setError(err.message),
  });

  if (!isReady) {
    return (
      <AppFrame tone="white">
        <Spinner />
      </AppFrame>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppFrame>
        <div className="px-8 py-24 text-center">
          <p className="mb-2 text-xl font-semibold">Sign in required</p>
          <p className="mb-6 text-[#6B7280]">Please sign in to create recipes</p>
          <Link to="/account/signin" className="rounded-full bg-[#FF6A3D] px-6 py-3 font-semibold text-white">
            Sign in
          </Link>
        </div>
      </AppFrame>
    );
  }

  const categories = categoriesQuery.data?.categories || [];

  function handleSubmit() {
    if (!title.trim()) {
      setError('Please enter a recipe title');
      return;
    }
    if (!categoryId) {
      setError('Please select a category');
      return;
    }
    setError('');
    createRecipe.mutate({
      title: title.trim(),
      description: description.trim(),
      image: imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      category_id: categoryId,
      time: time.trim() || '30 min',
      difficulty,
      calories: calories.trim() || '300 cal',
      ingredients: ingredients.filter((item) => item.trim()),
      steps: steps.filter((step) => step.title.trim()),
    });
  }

  return (
    <AppFrame tone="white">
      <header className="flex items-center justify-between px-4 py-4">
        <button type="button" aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-display text-lg font-semibold">Create Recipe</h1>
        <span className="w-6" />
      </header>
      <div className="space-y-5 px-5 pb-28">
        <Section title="Basic Info">
          <Label>Recipe Title *</Label>
          <input className={field} placeholder="e.g., Chocolate Chip Cookies" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Label>Description</Label>
          <textarea className={`${field} min-h-24`} placeholder="What makes this recipe special?" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Label>Image URL</Label>
          <input className={field} placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          <Label>Category *</Label>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                  categoryId === cat.id ? 'bg-[#FF6A3D] text-white' : 'bg-[#F3F4F6] text-[#111111]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Time</Label>
              <input className={field} placeholder="30 min" value={time} onChange={(event) => setTime(event.target.value)} />
            </div>
            <div>
              <Label>Calories</Label>
              <input className={field} placeholder="300 cal" value={calories} onChange={(event) => setCalories(event.target.value)} />
            </div>
          </div>
          <Label>Difficulty</Label>
          <div className="flex gap-2">
            {['Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficulty(diff)}
                className={`flex-1 rounded-full py-2 text-sm font-medium ${
                  difficulty === diff ? 'bg-[#FF6A3D] text-white' : 'bg-[#F3F4F6]'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Ingredients">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={field}
                placeholder={`Ingredient ${index + 1}`}
                value={ingredient}
                onChange={(event) => {
                  const next = [...ingredients];
                  next[index] = event.target.value;
                  setIngredients(next);
                }}
              />
              {ingredients.length > 1 ? (
                <button type="button" aria-label="Remove ingredient" onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}>
                  <X size={18} />
                </button>
              ) : null}
            </div>
          ))}
          <button type="button" onClick={() => setIngredients([...ingredients, ''])} className="inline-flex items-center gap-1 text-sm font-semibold text-[#FF6A3D]">
            <Plus size={16} /> Add ingredient
          </button>
        </Section>

        <Section title="Steps">
          {steps.map((step, index) => (
            <div key={index} className="rounded-2xl bg-[#F8F8F8] p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                Step {index + 1}
                {steps.length > 1 ? (
                  <button type="button" aria-label="Remove step" onClick={() => setSteps(steps.filter((_, i) => i !== index))}>
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              <input
                className={`${field} mb-2`}
                placeholder="Step title"
                value={step.title}
                onChange={(event) => {
                  const next = [...steps];
                  next[index] = { ...step, title: event.target.value };
                  setSteps(next);
                }}
              />
              <textarea
                className={field}
                placeholder="What happens in this step?"
                value={step.description}
                onChange={(event) => {
                  const next = [...steps];
                  next[index] = { ...step, description: event.target.value };
                  setSteps(next);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSteps([...steps, { title: '', description: '' }])}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#FF6A3D]"
          >
            <Plus size={16} /> Add step
          </button>
        </Section>
        {error ? <p className="text-sm text-[#FF3B30]">{error}</p> : null}
      </div>
      <div className="sticky bottom-0 border-t border-[#EDEDED] bg-white px-5 py-4">
        <button
          type="button"
          disabled={createRecipe.isPending}
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-[#FF6A3D] py-4 font-bold text-white disabled:opacity-60"
        >
          {createRecipe.isPending ? 'Saving...' : 'Create Recipe'}
        </button>
      </div>
    </AppFrame>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Label({ children }) {
  return <p className="text-sm font-medium text-[#111111]">{children}</p>;
}
