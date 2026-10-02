export function GET() {
  return Response.json({ error: "SeedFeast does not publish integration handles." }, { status: 404 });
}
